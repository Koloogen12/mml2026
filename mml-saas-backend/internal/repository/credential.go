package repository

import (
	"context"
	"time"

	"mml-saas-backend/internal/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CredentialRepository struct {
	db *gorm.DB
}

func newCredentialRepository(db *gorm.DB) *CredentialRepository {
	return &CredentialRepository{db: db}
}

// --- project data keys ---

// GetDEK returns the project's wrapped data key, or nil if it has none yet.
func (r *CredentialRepository) GetDEK(ctx context.Context, projectID int) (*model.ProjectDEK, error) {
	var dek model.ProjectDEK
	err := r.db.WithContext(ctx).
		Where("project_id = ?", projectID).
		First(&dek).Error
	return queryResult(&dek, err)
}

// CreateDEK stores a freshly generated wrapped data key.
//
// ON CONFLICT DO NOTHING makes this safe under a race: two concurrent requests
// for a project with no key yet must not end up with two different keys, which
// would silently orphan whichever credentials were written under the loser.
// The caller re-reads after a no-op insert.
func (r *CredentialRepository) CreateDEK(ctx context.Context, dek *model.ProjectDEK) error {
	return dbErr(r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "project_id"}},
			DoNothing: true,
		}).
		Create(dek).Error)
}

// UpdateDEK replaces the wrapped key after a master key rotation.
func (r *CredentialRepository) UpdateDEK(ctx context.Context, projectID int, wrapped []byte, version int) error {
	now := time.Now()
	return dbErr(r.db.WithContext(ctx).
		Model(&model.ProjectDEK{}).
		Where("project_id = ?", projectID).
		Updates(map[string]any{
			"wrapped_dek": wrapped,
			"key_version": version,
			"rotated_at":  now,
		}).Error)
}

// ListDEKsByKeyVersion returns projects still wrapped under an old master key.
// Used by the rotation job to find remaining work.
func (r *CredentialRepository) ListDEKsByKeyVersion(ctx context.Context, version, limit int) ([]*model.ProjectDEK, error) {
	var deks []*model.ProjectDEK
	err := r.db.WithContext(ctx).
		Where("key_version = ?", version).
		Order("project_id ASC").
		Limit(limit).
		Find(&deks).Error
	return deks, dbErr(err)
}

// --- connections ---

func (r *CredentialRepository) CreateConnection(ctx context.Context, conn *model.ProviderConnection) error {
	return dbErr(r.db.WithContext(ctx).Create(conn).Error)
}

func (r *CredentialRepository) GetConnection(ctx context.Context, id, projectID int) (*model.ProviderConnection, error) {
	var conn model.ProviderConnection
	err := r.db.WithContext(ctx).
		Where("id = ? AND project_id = ? AND deleted_at IS NULL", id, projectID).
		First(&conn).Error
	return queryResult(&conn, err)
}

// FindConnection looks up an active connection by its provider identity, which
// is how the checkout path resolves "which payment provider does this project
// use" without knowing an id.
func (r *CredentialRepository) FindConnection(ctx context.Context, projectID int, kind model.ProviderKind, provider string) (*model.ProviderConnection, error) {
	var conn model.ProviderConnection
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND kind = ? AND provider = ? AND deleted_at IS NULL",
			projectID, kind, provider).
		First(&conn).Error
	return queryResult(&conn, err)
}

func (r *CredentialRepository) ListConnections(ctx context.Context, projectID int) ([]*model.ProviderConnection, error) {
	var conns []*model.ProviderConnection
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND deleted_at IS NULL", projectID).
		Order("kind ASC, provider ASC").
		Find(&conns).Error
	return conns, dbErr(err)
}

// ListActiveConnectionsByKind returns usable connections of one kind. The
// checkout and fulfilment paths use this; a failing connection must not be
// picked up silently.
func (r *CredentialRepository) ListActiveConnectionsByKind(ctx context.Context, projectID int, kind model.ProviderKind) ([]*model.ProviderConnection, error) {
	var conns []*model.ProviderConnection
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND kind = ? AND status = ? AND deleted_at IS NULL",
			projectID, kind, model.ConnectionStatusActive).
		Order("provider ASC").
		Find(&conns).Error
	return conns, dbErr(err)
}

func (r *CredentialRepository) UpdateConnectionStatus(ctx context.Context, id int, status model.ConnectionStatus, lastErr *string, caps *model.Capabilities) error {
	updates := map[string]any{
		"status":     status,
		"last_error": lastErr,
		"updated_at": time.Now(),
	}
	if status == model.ConnectionStatusActive {
		updates["verified_at"] = time.Now()
	}
	if caps != nil {
		updates["capabilities"] = *caps
	}
	return dbErr(r.db.WithContext(ctx).
		Model(&model.ProviderConnection{}).
		Where("id = ?", id).
		Updates(updates).Error)
}

// DeleteConnection soft-deletes the connection and hard-deletes its credential
// in one transaction. The audit trail survives; the key material does not.
func (r *CredentialRepository) DeleteConnection(ctx context.Context, id, projectID int) (int64, error) {
	var affected int64
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&model.ProviderConnection{}).
			Where("id = ? AND project_id = ? AND deleted_at IS NULL", id, projectID).
			Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP"))
		if result.Error != nil {
			return result.Error
		}
		affected = result.RowsAffected
		if affected == 0 {
			return nil
		}
		return tx.Where("connection_id = ?", id).
			Delete(&model.ProviderCredential{}).Error
	})
	return affected, dbErr(err)
}

// --- credentials ---

func (r *CredentialRepository) GetCredential(ctx context.Context, connectionID int) (*model.ProviderCredential, error) {
	var cred model.ProviderCredential
	err := r.db.WithContext(ctx).
		Where("connection_id = ?", connectionID).
		First(&cred).Error
	return queryResult(&cred, err)
}

// UpsertCredential writes the encrypted blob, replacing any previous one.
func (r *CredentialRepository) UpsertCredential(ctx context.Context, cred *model.ProviderCredential) error {
	return dbErr(r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "connection_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"ciphertext", "key_version", "updated_at"}),
		}).
		Create(cred).Error)
}

// ListCredentialsByKeyVersion finds credential blobs still encrypted under an
// old key version, for the rotation job.
func (r *CredentialRepository) ListCredentialsByKeyVersion(ctx context.Context, projectID, version int) ([]*model.ProviderCredential, error) {
	var creds []*model.ProviderCredential
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND key_version = ?", projectID, version).
		Order("id ASC").
		Find(&creds).Error
	return creds, dbErr(err)
}

// --- audit ---

// LogAccess records a decryption attempt. It is written on both the success
// and the failure path.
func (r *CredentialRepository) LogAccess(ctx context.Context, entry *model.CredentialAccessLog) error {
	return dbErr(r.db.WithContext(ctx).Create(entry).Error)
}

// ListAccessLog returns the audit trail for a project, newest first.
func (r *CredentialRepository) ListAccessLog(ctx context.Context, projectID, limit int) ([]*model.CredentialAccessLog, error) {
	var entries []*model.CredentialAccessLog
	err := r.db.WithContext(ctx).
		Where("project_id = ?", projectID).
		Order("accessed_at DESC").
		Limit(limit).
		Find(&entries).Error
	return entries, dbErr(err)
}
