package model

import "time"

// ProviderKind groups the external services a merchant connects with their own
// credentials. The platform stays non-custodial: it wires the connection, the
// merchant owns the account, the money settles to them.
type ProviderKind string

const (
	ProviderKindPayment   ProviderKind = "payment"
	ProviderKindFiscal    ProviderKind = "fiscal"
	ProviderKindDelivery  ProviderKind = "delivery"
	ProviderKindInventory ProviderKind = "inventory"
	ProviderKindMarketing ProviderKind = "marketing"
)

// ConnectionStatus reflects what the merchant sees on the connections screen.
type ConnectionStatus string

const (
	// ConnectionStatusPending — credentials saved, connection not yet verified.
	ConnectionStatusPending ConnectionStatus = "pending"
	// ConnectionStatusActive — verified and usable.
	ConnectionStatusActive ConnectionStatus = "active"
	// ConnectionStatusFailing — the provider rejected us. New orders that
	// depend on this connection must stop rather than fail at checkout.
	ConnectionStatusFailing ConnectionStatus = "failing"
)

// ProjectDEK is a project's data encryption key, wrapped by the master keyset.
// One row per project; the ciphertext of every credential in that project is
// encrypted under this key.
type ProjectDEK struct {
	ID         int        `gorm:"primaryKey"`
	ProjectID  int        `gorm:"uniqueIndex;not null"`
	WrappedDEK []byte     `gorm:"column:wrapped_dek;not null"`
	KeyVersion int        `gorm:"column:key_version;not null"`
	CreatedAt  time.Time  `gorm:"not null"`
	RotatedAt  *time.Time `gorm:"column:rotated_at"`
}

func (ProjectDEK) TableName() string {
	return "project_deks"
}

// ProviderConnection is the merchant's link to one external provider.
// Metadata only — it carries no secret material, so it can be listed, logged
// and returned to the client freely.
type ProviderConnection struct {
	ID           int              `gorm:"primaryKey"`
	ProjectID    int              `gorm:"index;not null"`
	Kind         ProviderKind     `gorm:"size:32;not null"`
	Provider     string           `gorm:"size:64;not null"`
	Status       ConnectionStatus `gorm:"size:32;not null;default:'pending'"`
	Capabilities Capabilities     `gorm:"type:jsonb;not null;default:'{}'"`
	IsSandbox    bool             `gorm:"column:is_sandbox;not null;default:true"`
	LastError    *string          `gorm:"column:last_error"`
	VerifiedAt   *time.Time       `gorm:"column:verified_at"`
	CreatedAt    time.Time        `gorm:"not null"`
	UpdatedAt    time.Time        `gorm:"not null"`
	DeletedAt    *time.Time       `gorm:"index"`
}

func (ProviderConnection) TableName() string {
	return "provider_connections"
}

// ProviderCredential holds the encrypted credential blob for a connection.
//
// It is a separate table from ProviderConnection on purpose: listing
// connections for the settings screen never loads ciphertext, and disconnecting
// hard-deletes this row while the connection keeps its audit history.
type ProviderCredential struct {
	ID           int       `gorm:"primaryKey"`
	ConnectionID int       `gorm:"column:connection_id;uniqueIndex;not null"`
	ProjectID    int       `gorm:"index;not null"`
	Ciphertext   []byte    `gorm:"not null"`
	KeyVersion   int       `gorm:"column:key_version;not null"`
	CreatedAt    time.Time `gorm:"not null"`
	UpdatedAt    time.Time `gorm:"not null"`
}

func (ProviderCredential) TableName() string {
	return "provider_credentials"
}

// AccessReason states why a credential was decrypted. It is a required
// argument on every read: an unexplained decryption should be impossible to
// write, not merely discouraged.
type AccessReason string

const (
	AccessReasonVerifyConnection AccessReason = "verify_connection"
	AccessReasonCreatePayment    AccessReason = "create_payment"
	AccessReasonCheckPayment     AccessReason = "check_payment"
	AccessReasonRefund           AccessReason = "refund"
	AccessReasonIssueReceipt     AccessReason = "issue_receipt"
	AccessReasonCreateShipment   AccessReason = "create_shipment"
	AccessReasonTrackShipment    AccessReason = "track_shipment"
	AccessReasonSyncInventory    AccessReason = "sync_inventory"
	AccessReasonRotateKey        AccessReason = "rotate_key"
)

// ActorType distinguishes a human action from background work, so the audit
// trail can answer "was a person involved".
type ActorType string

const (
	ActorTypeUser   ActorType = "user"
	ActorTypeSystem ActorType = "system"
)

// CredentialAccessLog records one decryption attempt, successful or not.
type CredentialAccessLog struct {
	ID           int64        `gorm:"primaryKey"`
	ProjectID    int          `gorm:"index;not null"`
	ConnectionID *int         `gorm:"column:connection_id;index"`
	Reason       AccessReason `gorm:"size:64;not null"`
	ActorType    ActorType    `gorm:"column:actor_type;size:32;not null"`
	ActorID      *int         `gorm:"column:actor_id"`
	Succeeded    bool         `gorm:"not null"`
	AccessedAt   time.Time    `gorm:"column:accessed_at;not null"`
}

func (CredentialAccessLog) TableName() string {
	return "credential_access_logs"
}
