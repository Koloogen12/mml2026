package handler

import (
	"encoding/json"
	"net/http"

	"mml-saas-backend/pkg/logger"
	"mml-saas-backend/pkg/validator"
)

type errorBody struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func WriteError(w http.ResponseWriter, status int, code, message string) {
	WriteJSON(w, status, errorBody{
		Error: errorDetail{
			Code:    code,
			Message: message,
		},
	})
}

const maxBodySize = 1 << 20 // 1MB

func decodeJSON(r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, maxBodySize)
	defer func() {
		if err := r.Body.Close(); err != nil {
			logger.Error("handler", "Failed to close request body", "error", err)
		}
	}()
	return json.NewDecoder(r.Body).Decode(v)
}

// decodeAndValidate decodes JSON body and validates the struct.
// Returns true if successful, writes error response and returns false otherwise.
func decodeAndValidate(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := decodeJSON(r, v); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid request body")
		return false
	}
	if err := validator.Struct(v); err != nil {
		WriteError(w, http.StatusBadRequest, "validation_error", err.Error())
		return false
	}
	return true
}
