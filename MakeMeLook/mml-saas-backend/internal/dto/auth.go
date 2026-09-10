package dto

import "time"

// --- Requests ---

type RegisterRequest struct {
	Name            string `json:"name" validate:"required,min=2,max=255"`
	Email           string `json:"email" validate:"required,email,max=255"`
	Password        string `json:"password" validate:"required,min=8,max=72"`
	ConfirmPassword string `json:"confirm_password" validate:"required,eqfield=Password"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type VerifyEmailRequest struct {
	Email string `json:"email" validate:"required,email"`
	Code  string `json:"code" validate:"required,len=6"`
}

type ResendVerificationRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type PasswordResetRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type PasswordResetVerifyRequest struct {
	Email string `json:"email" validate:"required,email"`
	Code  string `json:"code" validate:"required,len=6"`
}

type PasswordResetCompleteRequest struct {
	Email           string `json:"email" validate:"required,email"`
	Code            string `json:"code" validate:"required,len=6"`
	Password        string `json:"password" validate:"required,min=8,max=72"`
	ConfirmPassword string `json:"confirm_password" validate:"required,eqfield=Password"`
}

// --- Responses ---

type AuthResponse struct {
	AccessToken string       `json:"access_token"`
	ExpiresAt   time.Time    `json:"expires_at"`
	User        UserResponse `json:"user"`
}

type UserResponse struct {
	ID     int    `json:"id"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	Status string `json:"status"`
}

type MeResponse struct {
	ID                   int    `json:"id"`
	Email                string `json:"email"`
	Name                 string `json:"name"`
	Status               string `json:"status"`
	VerificationCooldown int    `json:"verification_cooldown"`
}

type MessageResponse struct {
	Message string `json:"message"`
}
