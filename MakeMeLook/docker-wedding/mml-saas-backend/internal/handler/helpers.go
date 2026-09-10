package handler

import (
	"fmt"
	"mime/multipart"
	"net/http"
	"strconv"

	"mml-saas-backend/pkg/logger"

	"github.com/go-chi/chi/v5"
)

// parseFile parses a file upload from multipart form.
// Returns (file, filename, size, cleanup, error).
// If required=true and file is missing, returns an error.
// If required=false and file is missing, returns (nil, "", 0, noop, nil).
// Cleanup must always be called with defer.
func parseFile(r *http.Request, fieldName string, required bool) (multipart.File, string, int64, func(), error) {
	file, header, err := r.FormFile(fieldName)
	if err != nil {
		if err == http.ErrMissingFile {
			if required {
				return nil, "", 0, func() {}, fmt.Errorf("file %q is required", fieldName)
			}
			return nil, "", 0, func() {}, nil
		}
		return nil, "", 0, func() {}, err
	}

	cleanup := func() {
		if err := file.Close(); err != nil {
			logger.Error("handler", "Failed to close uploaded file", "error", err, "field", fieldName)
		}
	}

	return file, header.Filename, header.Size, cleanup, nil
}

// strPtrFromForm returns a pointer to the form value, or nil if the value is empty.
func strPtrFromForm(r *http.Request, key string) *string {
	val := r.FormValue(key)
	if val == "" {
		return nil
	}
	return &val
}

// parseProjectRequest extracts and validates userID and projectID from request.
// Returns (userID, projectID, ok). If ok is false, error response is already written.
func parseProjectRequest(w http.ResponseWriter, r *http.Request) (int, int, bool) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		WriteError(w, http.StatusUnauthorized, "unauthorized", "Missing user context")
		return 0, 0, false
	}

	projectID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid project ID")
		return 0, 0, false
	}

	return userID, projectID, true
}
