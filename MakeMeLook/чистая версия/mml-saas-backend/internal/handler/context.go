package handler

import "context"

type contextKey string

const UserIDKey contextKey = "user_id"

// GetUserID extracts the authenticated user ID from the request context.
func GetUserID(ctx context.Context) (int, bool) {
	id, ok := ctx.Value(UserIDKey).(int)
	return id, ok
}
