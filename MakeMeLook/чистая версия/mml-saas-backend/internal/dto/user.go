package dto

// --- Requests ---

// UpdateProfileRequest holds profile update data (from multipart form).
// Avatar is handled separately via file upload.
type UpdateProfileRequest struct {
	Name     string  `json:"name" validate:"required,min=2,max=255"`
	LastName *string `json:"last_name" validate:"omitempty,max=255"`
	Phone    *string `json:"phone" validate:"omitempty,max=20"`
	Company  *string `json:"company" validate:"omitempty,max=255"`
	Website  *string `json:"website" validate:"omitempty,url,max=255"`
	Country  *string `json:"country" validate:"omitempty,len=2"`
	Timezone *string `json:"timezone" validate:"omitempty,max=63"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8,max=72"`
	ConfirmPassword string `json:"confirm_password" validate:"required,eqfield=NewPassword"`
}

// --- Responses ---

type ProfileResponse struct {
	ID                   int     `json:"id"`
	Email                string  `json:"email"`
	Name                 string  `json:"name"`
	LastName             *string `json:"last_name"`
	Phone                *string `json:"phone"`
	Company              *string `json:"company"`
	Website              *string `json:"website"`
	Country              *string `json:"country"`
	Timezone             *string `json:"timezone"`
	AvatarURL            *string `json:"avatar_url"`
	Status               string  `json:"status"`
	VerificationCooldown int     `json:"verification_cooldown"`
}
