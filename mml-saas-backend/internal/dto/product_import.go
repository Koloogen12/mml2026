package dto

type ImportRowPreview struct {
	Row       int      `json:"row"`
	Name      string   `json:"name"`
	SKU       *string  `json:"sku"`
	Category  *string  `json:"category"`
	Gender    *string  `json:"gender"`
	Price     *float64 `json:"price"`
	ImageURLs []string `json:"image_urls"`
	IsValid   bool     `json:"is_valid"`
	Warnings  []string `json:"warnings"`
}

type ImportRowError struct {
	Row     int    `json:"row"`
	Field   string `json:"field"`
	Message string `json:"message"`
}

type ImportValidateResponse struct {
	ValidCount int              `json:"valid_count"`
	ErrorCount int              `json:"error_count"`
	WarnCount  int              `json:"warn_count"`
	Preview    []ImportRowPreview `json:"preview"`
	Errors     []ImportRowError `json:"errors"`
}

type ImportExecuteRequest struct {
	DuplicateHandling string `json:"duplicate_handling" validate:"required,oneof=skip update"`
}

type ImportExecuteResponse struct {
	ImportID string `json:"import_id"`
	Total    int    `json:"total"`
	Message  string `json:"message"`
}

type ParseHeadersResponse struct {
	Headers           []string   `json:"headers"`
	SampleRows        [][]string `json:"sample_rows"`
	DetectedDelimiter string     `json:"detected_delimiter"`
}

type ImportStatusResponse struct {
	ImportID    string   `json:"import_id"`
	Status      string   `json:"status"`
	Total       int      `json:"total"`
	Processed   int      `json:"processed"`
	PhotosTotal int      `json:"photos_total"`
	PhotosDone  int      `json:"photos_done"`
	Errors      []string `json:"errors"`
	CompletedAt *string  `json:"completed_at"`
}
