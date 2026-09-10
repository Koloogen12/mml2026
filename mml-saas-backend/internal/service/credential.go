package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"mml-saas-backend/internal/crypto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/pkg/logger"
	"mml-saas-backend/pkg/secret"
)

var (
	// ErrConnectionNotFound is returned when a connection does not exist or
	// belongs to another project.
	ErrConnectionNotFound = errors.New("provider connection not found")
	// ErrCredentialNotFound is returned when a connection carries no stored
	// credential — usually because it was disconnected.
	ErrCredentialNotFound = errors.New("credential not found")
	// ErrNoReason is returned when a caller tries to decrypt without stating
	// why. Every decryption is audited, and an unexplained one is a bug.
	ErrNoReason = errors.New("credential access requires a reason")
)

// CredentialService is the only way merchant credentials enter or leave
// storage.
//
// Design rules this type enforces, from the vault design decision:
//   - credentials are written and read only as ciphertext at rest;
//   - decryption requires a stated reason and an actor, and is audited on both
//     the success and the failure path;
//   - plaintext key material is zeroized as soon as the operation is done;
//   - disconnecting destroys the ciphertext rather than flagging a row.
//
// Nothing outside this package should touch crypto or the credential tables.
type CredentialService struct {
	repos  *repository.Repositories
	keyset *crypto.Keyset
}

func NewCredentialService(repos *repository.Repositories, keyset *crypto.Keyset) *CredentialService {
	return &CredentialService{repos: repos, keyset: keyset}
}

// Actor identifies who triggered an operation, for the audit trail.
type Actor struct {
	Type model.ActorType
	ID   *int
}

// UserActor builds an actor for a human-initiated request.
func UserActor(userID int) Actor {
	return Actor{Type: model.ActorTypeUser, ID: &userID}
}

// SystemActor builds an actor for background work — webhook processing,
// scheduled syncs, the rotation job.
func SystemActor() Actor {
	return Actor{Type: model.ActorTypeSystem}
}

// Connect stores a merchant's credentials for a provider and returns the
// connection.
//
// The credential map is keyed by the field names the provider adapter expects
// (for example "shop_id" and "secret_key"). Values are secret.String so they
// cannot reach a log on the way in.
//
// The connection starts in the pending state: storing credentials is not the
// same as knowing they work. Verification is a separate step that flips the
// status and records the provider's capabilities.
func (s *CredentialService) Connect(
	ctx context.Context,
	projectID int,
	kind model.ProviderKind,
	provider string,
	fields map[string]secret.String,
	isSandbox bool,
) (*model.ProviderConnection, error) {
	if len(fields) == 0 {
		return nil, fmt.Errorf("no credential fields provided")
	}

	// Reuse an existing connection for this provider rather than creating a
	// duplicate — the merchant re-entering their keys is an update.
	conn, err := s.repos.Credential.FindConnection(ctx, projectID, kind, provider)
	if err != nil {
		return nil, err
	}
	if conn == nil {
		conn = &model.ProviderConnection{
			ProjectID: projectID,
			Kind:      kind,
			Provider:  provider,
			Status:    model.ConnectionStatusPending,
			IsSandbox: isSandbox,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		if err := s.repos.Credential.CreateConnection(ctx, conn); err != nil {
			return nil, err
		}
	}

	dek, version, err := s.projectDEK(ctx, projectID)
	if err != nil {
		return nil, err
	}
	defer crypto.Zeroize(dek)

	plaintext, err := marshalFields(fields)
	if err != nil {
		return nil, err
	}
	defer crypto.Zeroize(plaintext)

	ciphertext, err := crypto.Seal(dek, plaintext, projectID, conn.ID)
	if err != nil {
		return nil, fmt.Errorf("sealing credentials: %w", err)
	}

	if err := s.repos.Credential.UpsertCredential(ctx, &model.ProviderCredential{
		ConnectionID: conn.ID,
		ProjectID:    projectID,
		Ciphertext:   ciphertext,
		KeyVersion:   version,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}); err != nil {
		return nil, err
	}

	logger.Info("credential", "credentials stored",
		"project_id", projectID, "kind", kind, "provider", provider, "sandbox", isSandbox)

	return conn, nil
}

// Reveal decrypts a connection's credentials for one operation.
//
// The reason and actor are mandatory and recorded. Callers should use the
// returned values immediately and not retain them: they are plaintext key
// material belonging to the merchant.
func (s *CredentialService) Reveal(
	ctx context.Context,
	projectID, connectionID int,
	reason model.AccessReason,
	actor Actor,
) (map[string]secret.String, error) {
	if reason == "" {
		return nil, ErrNoReason
	}

	fields, err := s.reveal(ctx, projectID, connectionID)
	s.audit(ctx, projectID, connectionID, reason, actor, err == nil)
	if err != nil {
		return nil, err
	}
	return fields, nil
}

// reveal does the work; Reveal wraps it so the audit entry is written on both
// paths, including the failures we most want to see.
func (s *CredentialService) reveal(ctx context.Context, projectID, connectionID int) (map[string]secret.String, error) {
	conn, err := s.repos.Credential.GetConnection(ctx, connectionID, projectID)
	if err != nil {
		return nil, err
	}
	if conn == nil {
		return nil, ErrConnectionNotFound
	}

	cred, err := s.repos.Credential.GetCredential(ctx, connectionID)
	if err != nil {
		return nil, err
	}
	if cred == nil {
		return nil, ErrCredentialNotFound
	}

	dekRow, err := s.repos.Credential.GetDEK(ctx, projectID)
	if err != nil {
		return nil, err
	}
	if dekRow == nil {
		// Ciphertext exists but the project's key does not. This is
		// unrecoverable and means something deleted the key row out from
		// under live data.
		return nil, fmt.Errorf("project %d has credentials but no data key", projectID)
	}

	dek, err := s.keyset.UnwrapDEK(dekRow.WrappedDEK, dekRow.KeyVersion, projectID)
	if err != nil {
		return nil, fmt.Errorf("unwrapping project key: %w", err)
	}
	defer crypto.Zeroize(dek)

	plaintext, err := crypto.Open(dek, cred.Ciphertext, projectID, connectionID)
	if err != nil {
		return nil, fmt.Errorf("opening credentials: %w", err)
	}
	defer crypto.Zeroize(plaintext)

	return unmarshalFields(plaintext)
}

// Disconnect removes a connection and destroys its stored credentials.
//
// The ciphertext is deleted rather than flagged: a disconnected provider must
// leave no key material behind. The connection row is soft-deleted so the
// audit trail keeps pointing somewhere.
func (s *CredentialService) Disconnect(ctx context.Context, projectID, connectionID int) error {
	affected, err := s.repos.Credential.DeleteConnection(ctx, connectionID, projectID)
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrConnectionNotFound
	}
	logger.Info("credential", "connection removed and credentials destroyed",
		"project_id", projectID, "connection_id", connectionID)
	return nil
}

// MarkVerified flips a connection to active and records what the provider can
// do, after the adapter has successfully talked to it.
func (s *CredentialService) MarkVerified(ctx context.Context, connectionID int, caps model.Capabilities) error {
	return s.repos.Credential.UpdateConnectionStatus(ctx, connectionID, model.ConnectionStatusActive, nil, &caps)
}

// MarkFailing records that the provider rejected us, with a message written
// for the merchant rather than copied from the provider's error code.
func (s *CredentialService) MarkFailing(ctx context.Context, connectionID int, humanReason string) error {
	return s.repos.Credential.UpdateConnectionStatus(ctx, connectionID, model.ConnectionStatusFailing, &humanReason, nil)
}

// ListConnections returns the project's connections. Safe to hand to a
// handler: connections carry no secret material.
func (s *CredentialService) ListConnections(ctx context.Context, projectID int) ([]*model.ProviderConnection, error) {
	return s.repos.Credential.ListConnections(ctx, projectID)
}

// RotateProjectKey rewraps a project's data key under the current master key.
//
// Credential ciphertexts are untouched — that is the point of the two-level
// design. Rotating the master key is a rewrap of one small row per project
// rather than a re-encryption of every credential.
func (s *CredentialService) RotateProjectKey(ctx context.Context, projectID int) error {
	dekRow, err := s.repos.Credential.GetDEK(ctx, projectID)
	if err != nil {
		return err
	}
	if dekRow == nil {
		return nil // nothing stored for this project yet
	}
	if dekRow.KeyVersion == s.keyset.CurrentVersion() {
		return nil // already current
	}

	dek, err := s.keyset.UnwrapDEK(dekRow.WrappedDEK, dekRow.KeyVersion, projectID)
	if err != nil {
		return fmt.Errorf("unwrapping project key: %w", err)
	}
	defer crypto.Zeroize(dek)

	wrapped, version, err := s.keyset.WrapDEK(dek, projectID)
	if err != nil {
		return fmt.Errorf("rewrapping project key: %w", err)
	}
	if err := s.repos.Credential.UpdateDEK(ctx, projectID, wrapped, version); err != nil {
		return err
	}

	s.audit(ctx, projectID, 0, model.AccessReasonRotateKey, SystemActor(), true)
	logger.Info("credential", "project key rotated",
		"project_id", projectID, "from_version", dekRow.KeyVersion, "to_version", version)
	return nil
}

// projectDEK returns the project's data key, creating one on first use.
func (s *CredentialService) projectDEK(ctx context.Context, projectID int) ([]byte, int, error) {
	row, err := s.repos.Credential.GetDEK(ctx, projectID)
	if err != nil {
		return nil, 0, err
	}

	if row == nil {
		dek, err := crypto.GenerateDEK()
		if err != nil {
			return nil, 0, err
		}
		defer crypto.Zeroize(dek)

		wrapped, version, err := s.keyset.WrapDEK(dek, projectID)
		if err != nil {
			return nil, 0, fmt.Errorf("wrapping project key: %w", err)
		}
		if err := s.repos.Credential.CreateDEK(ctx, &model.ProjectDEK{
			ProjectID:  projectID,
			WrappedDEK: wrapped,
			KeyVersion: version,
			CreatedAt:  time.Now(),
		}); err != nil {
			return nil, 0, err
		}

		// Re-read rather than trusting the local copy: the insert may have
		// been a no-op because a concurrent request won the race, and using
		// our own key would orphan whatever it wrote.
		row, err = s.repos.Credential.GetDEK(ctx, projectID)
		if err != nil {
			return nil, 0, err
		}
		if row == nil {
			return nil, 0, fmt.Errorf("project key vanished after creation")
		}
	}

	dek, err := s.keyset.UnwrapDEK(row.WrappedDEK, row.KeyVersion, projectID)
	if err != nil {
		return nil, 0, fmt.Errorf("unwrapping project key: %w", err)
	}
	return dek, row.KeyVersion, nil
}

// audit writes the access record. A failure to write it is logged loudly but
// does not fail the caller: losing an audit line is bad, breaking a merchant's
// checkout because of it is worse.
func (s *CredentialService) audit(
	ctx context.Context,
	projectID, connectionID int,
	reason model.AccessReason,
	actor Actor,
	succeeded bool,
) {
	entry := &model.CredentialAccessLog{
		ProjectID:  projectID,
		Reason:     reason,
		ActorType:  actor.Type,
		ActorID:    actor.ID,
		Succeeded:  succeeded,
		AccessedAt: time.Now(),
	}
	if connectionID != 0 {
		entry.ConnectionID = &connectionID
	}
	if err := s.repos.Credential.LogAccess(ctx, entry); err != nil {
		logger.Error("credential", "failed to write access audit entry",
			"project_id", projectID, "connection_id", connectionID,
			"reason", reason, "error", err)
	}
}

// marshalFields converts the credential map to the plaintext that gets sealed.
// secret.String masks itself when marshalled, so the values are unwrapped here
// explicitly — the one place where that is correct.
func marshalFields(fields map[string]secret.String) ([]byte, error) {
	plain := make(map[string]string, len(fields))
	for k, v := range fields {
		plain[k] = v.Reveal()
	}
	data, err := json.Marshal(plain)
	if err != nil {
		return nil, fmt.Errorf("encoding credentials: %w", err)
	}
	return data, nil
}

// unmarshalFields converts decrypted plaintext back into masked secrets.
func unmarshalFields(plaintext []byte) (map[string]secret.String, error) {
	var plain map[string]string
	if err := json.Unmarshal(plaintext, &plain); err != nil {
		return nil, fmt.Errorf("decoding credentials: %w", err)
	}
	fields := make(map[string]secret.String, len(plain))
	for k, v := range plain {
		fields[k] = secret.New(v)
	}
	return fields, nil
}
