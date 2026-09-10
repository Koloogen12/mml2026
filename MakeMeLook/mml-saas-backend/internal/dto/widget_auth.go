package dto

// --- Widget Auth (Lead authentication) ---

type WidgetSendCodeRequest struct {
	Contact string `json:"contact" validate:"required"` // phone or email
}

type WidgetSendCodeResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

type WidgetVerifyCodeRequest struct {
	Contact string `json:"contact" validate:"required"`
	Code    string `json:"code" validate:"required,len=6"`
}

type WidgetVerifyCodeResponse struct {
	Success         bool   `json:"success"`
	IsAuthenticated bool   `json:"is_authenticated"`
	Email           string `json:"email,omitempty"`
	Phone           string `json:"phone,omitempty"`
}
