package util

func StrPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func SafeIndex(s []string, i int) string {
	if i < len(s) {
		return s[i]
	}
	return ""
}
