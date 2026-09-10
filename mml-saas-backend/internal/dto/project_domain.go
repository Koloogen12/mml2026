package dto

type AddDomainRequest struct {
	Domain string `json:"domain" validate:"required,max=255"`
}

type DomainResponse struct {
	ID         int     `json:"id"`
	Domain     string  `json:"domain"`
	IsVerified bool    `json:"is_verified"`
	VerifiedAt *string `json:"verified_at"`
}

type DomainsListResponse struct {
	Domains []DomainResponse `json:"domains"`
}
