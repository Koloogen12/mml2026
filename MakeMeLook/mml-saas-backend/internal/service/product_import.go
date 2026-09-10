package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/pkg/logger"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// ImportJob tracks the progress of an async CSV import.
type ImportJob struct {
	mu          sync.Mutex
	ID          string
	ProjectID   int
	Status      string // "running" | "completed" | "failed"
	Total       int    // products to create
	Processed   int    // products created
	PhotosTotal int    // photo downloads queued
	PhotosDone  int    // photo downloads finished
	Errors      []string
	CreatedAt   time.Time
	CompletedAt *time.Time
}

var importHTTPClient = &http.Client{Timeout: 30 * time.Second}

const importUserAgent = "Mozilla/5.0 (compatible; MakeMeLook-Importer/1.0)"
// CSV column names used in the template and parsed during import.
var csvTemplateHeaders = []string{
	"name", "sku", "category", "gender",
	"price", "discount_price", "currency", "product_url",
	"season", "color", "material", "brand", "sizes", "description",
	"image_url_1", "image_url_2", "image_url_3", "image_url_4", "image_url_5",
}

var validImportCategories = map[string]bool{
	"outerwear": true, "tops": true, "bottoms": true, "dresses": true, "shoes": true, "accessories": true, "underwear": true, "sportswear": true,
}
var validImportGenders = map[string]bool{
	"female": true, "male": true, "unisex": true,
}
var validImportCurrencies = map[string]bool{
	"RUB": true, "USD": true, "EUR": true,
}

// parsedRow holds one CSV data row after parsing and validation.
type parsedRow struct {
	rowNum        int
	name          string
	sku           *string
	category      *string
	gender        *string
	price         *float64
	discountPrice *float64
	currency      *string
	productURL    *string
	season        pq.StringArray
	color         *string
	material      *string
	brand         *string
	sizes         pq.StringArray
	description   *string
	imageURLs     []string
	externalID    *string
	errs          []string
	warns         []string
}

// GetImportTemplate returns a CSV file with headers and one example row.
func (s *ProductService) GetImportTemplate(ctx context.Context, userID, projectID int) ([]byte, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	if err := w.Write(csvTemplateHeaders); err != nil {
		logger.Error("service", "Failed to write CSV template headers", "error", err)
	}
	if err := w.Write([]string{
		"Summer Dress", "SKU-001", "tops", "female",
		"2999", "2499", "RUB", "https://example.com/product",
		"spring,summer", "Black", "Cotton", "BrandName", "S,M,L",
		"Beautiful summer dress",
		"https://example.com/photo1.jpg", "", "", "", "",
	}); err != nil {
		logger.Error("service", "Failed to write CSV template example row", "error", err)
	}
	w.Flush()

	return buf.Bytes(), w.Error()
}

// resolveDelimiter reads file bytes, resolves delimiter from string (auto-detecting if needed),
// and returns the data bytes and the resolved delimiter rune.
func resolveDelimiter(file io.Reader, delimiterStr string) ([]byte, rune, error) {
	data, err := io.ReadAll(file)
	if err != nil {
		return nil, 0, fmt.Errorf("read file: %w", err)
	}

	delimiter := parseDelimiterStr(delimiterStr)
	if delimiter == 0 {
		delimiter = detectDelimiter(data)
	}

	return data, delimiter, nil
}

// ValidateImportCSV parses a CSV file and returns validation results + preview.
func (s *ProductService) ValidateImportCSV(ctx context.Context, userID, projectID int, file io.Reader, delimiterStr string, mapping map[string]string) (*dto.ImportValidateResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	data, delimiter, err := resolveDelimiter(file, delimiterStr)
	if err != nil {
		return nil, err
	}

	rows, err := parseCSVRows(bytes.NewReader(data), delimiter, mapping)
	if err != nil {
		return nil, fmt.Errorf("parse csv: %w", err)
	}

	var (
		validCount int
		errorCount int
		warnCount  int
		preview    = make([]dto.ImportRowPreview, 0, 5)
		rowErrors  = make([]dto.ImportRowError, 0)
	)

	for _, row := range rows {
		if len(row.errs) == 0 {
			validCount++
		} else {
			errorCount++
		}
		warnCount += len(row.warns)

		if len(preview) < 5 {
			preview = append(preview, dto.ImportRowPreview{
				Row:       row.rowNum,
				Name:      row.name,
				SKU:       row.sku,
				Category:  row.category,
				Gender:    row.gender,
				Price:     row.price,
				ImageURLs: row.imageURLs,
				IsValid:   len(row.errs) == 0,
				Warnings:  row.warns,
			})
		}

		for _, e := range row.errs {
			rowErrors = append(rowErrors, dto.ImportRowError{
				Row:     row.rowNum,
				Field:   "unknown",
				Message: e,
			})
		}
	}

	return &dto.ImportValidateResponse{
		ValidCount: validCount,
		ErrorCount: errorCount,
		WarnCount:  warnCount,
		Preview:    preview,
		Errors:     rowErrors,
	}, nil
}

// ExecuteImport creates products from a CSV file and starts async photo downloads.
func (s *ProductService) ExecuteImport(ctx context.Context, userID, projectID int, file io.Reader, duplicateHandling string, delimiterStr string, mapping map[string]string) (*dto.ImportExecuteResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	data, delimiter, err := resolveDelimiter(file, delimiterStr)
	if err != nil {
		return nil, err
	}

	allRows, err := parseCSVRows(bytes.NewReader(data), delimiter, mapping)
	if err != nil {
		return nil, fmt.Errorf("parse csv: %w", err)
	}

	// Only import valid rows.
	valid := make([]*parsedRow, 0, len(allRows))
	for _, r := range allRows {
		if len(r.errs) == 0 {
			valid = append(valid, r)
		}
	}

	photoTotal := 0
	for _, r := range valid {
		photoTotal += len(r.imageURLs)
	}

	jobID := uuid.New().String()
	job := &ImportJob{
		ID:          jobID,
		ProjectID:   projectID,
		Status:      "running",
		Total:       len(valid),
		PhotosTotal: photoTotal,
		CreatedAt:   time.Now(),
		Errors:      []string{},
	}

	s.importMu.Lock()
	s.importJobs[jobID] = job
	s.importMu.Unlock()

	// Run import in background using a detached context so it survives the HTTP request.
	go s.runImport(context.Background(), projectID, valid, duplicateHandling, job)

	return &dto.ImportExecuteResponse{
		ImportID: jobID,
		Total:    len(valid),
		Message:  fmt.Sprintf("Import started: %d products", len(valid)),
	}, nil
}

// GetImportStatus returns the current progress of an import job.
func (s *ProductService) GetImportStatus(ctx context.Context, userID, projectID int, importID string) (*dto.ImportStatusResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	s.importMu.RLock()
	job, ok := s.importJobs[importID]
	s.importMu.RUnlock()

	if !ok {
		return nil, ErrImportNotFound
	}

	// Snapshot under lock.
	job.mu.Lock()
	resp := &dto.ImportStatusResponse{
		ImportID:    job.ID,
		Status:      job.Status,
		Total:       job.Total,
		Processed:   job.Processed,
		PhotosTotal: job.PhotosTotal,
		PhotosDone:  job.PhotosDone,
		Errors:      job.Errors,
	}
	if job.CompletedAt != nil {
		s := job.CompletedAt.Format(time.RFC3339)
		resp.CompletedAt = &s
	}
	job.mu.Unlock()

	return resp, nil
}

// runImport creates products synchronously, downloads photos concurrently. Runs in a goroutine.
func (s *ProductService) runImport(ctx context.Context, projectID int, rows []*parsedRow, duplicateHandling string, job *ImportJob) {
	defer func() {
		now := time.Now()
		job.mu.Lock()
		if job.Status == "running" {
			job.Status = "completed"
		}
		job.CompletedAt = &now
		job.mu.Unlock()
	}()

	for _, row := range rows {
		productID, skip := s.upsertProduct(ctx, projectID, row, duplicateHandling, job)
		if skip {
			job.mu.Lock()
			job.Processed++
			job.mu.Unlock()
			continue
		}
		if productID == 0 {
			continue
		}

		job.mu.Lock()
		job.Processed++
		job.mu.Unlock()

		if len(row.imageURLs) > 0 {
			s.downloadPhotosForProduct(ctx, projectID, productID, row.imageURLs, job)
		}
	}
}

// upsertProduct creates or updates a product based on duplicateHandling.
// Returns (productID, skip). skip=true when a duplicate is deliberately skipped.
func (s *ProductService) upsertProduct(ctx context.Context, projectID int, row *parsedRow, duplicateHandling string, job *ImportJob) (int, bool) {
	// Check for existing product by SKU (only when SKU is provided).
	var existing *model.Product
	if row.sku != nil && *row.sku != "" {
		p, err := s.repos.Product.GetByProjectIDAndSKU(ctx, projectID, *row.sku)
		if err != nil {
			logger.Error("import", "sku lookup failed", "sku", *row.sku, "error", err)
		}
		existing = p
	}

	if existing != nil {
		switch duplicateHandling {
		case "skip":
			return 0, true // deliberately skip
		case "update":
			updates := map[string]any{
				"name":           row.name,
				"category":       row.category,
				"gender":         row.gender,
				"price":          row.price,
				"discount_price": row.discountPrice,
				"currency":       row.currency,
				"product_url":    row.productURL,
				"season":         row.season,
				"color":          row.color,
				"material":       row.material,
				"brand":          row.brand,
				"sizes":          row.sizes,
				"description":    row.description,
				"external_id":    row.externalID,
			}
			if err := s.repos.Product.UpdateAll(ctx, existing.ID, updates); err != nil {
				job.mu.Lock()
				job.Errors = append(job.Errors, fmt.Sprintf("row %d: update failed: %v", row.rowNum, err))
				job.mu.Unlock()
				return 0, false
			}
			return existing.ID, false
		}
	}

	product := &model.Product{
		ProjectID:     projectID,
		Name:          row.name,
		SKU:           row.sku,
		Category:      row.category,
		Gender:        row.gender,
		Price:         row.price,
		DiscountPrice: row.discountPrice,
		Currency:      row.currency,
		ProductURL:    row.productURL,
		Season:        row.season,
		Color:         row.color,
		Material:      row.material,
		Brand:         row.brand,
		Sizes:         row.sizes,
		Description:   row.description,
		ExternalID:    row.externalID,
		IsActive:      true,
		Source:        model.ProductSourceCSV,
	}

	if err := s.repos.Product.Create(ctx, product); err != nil {
		job.mu.Lock()
		job.Errors = append(job.Errors, fmt.Sprintf("row %d: create failed: %v", row.rowNum, err))
		job.mu.Unlock()
		return 0, false
	}

	return product.ID, false
}

// downloadPhotosForProduct downloads image URLs concurrently (max 3 at a time) and stores them in Minio.
func (s *ProductService) downloadPhotosForProduct(ctx context.Context, projectID, productID int, urls []string, job *ImportJob) {
	const concurrency = 3
	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup

	for i, rawURL := range urls {
		if rawURL == "" {
			continue
		}
		wg.Add(1)
		sem <- struct{}{}
		go func(u string, sortOrder int) {
			defer wg.Done()
			defer func() { <-sem }()

			if err := s.downloadAndCreatePhoto(ctx, projectID, productID, u, sortOrder); err != nil {
				job.mu.Lock()
				job.Errors = append(job.Errors, fmt.Sprintf("photo %q: %v", u, err))
				job.mu.Unlock()
			}
			job.mu.Lock()
			job.PhotosDone++
			job.mu.Unlock()
		}(rawURL, i)
	}

	wg.Wait()
}

// downloadAndCreatePhoto fetches an image from a URL, uploads it to Minio, and creates a photo record.
func (s *ProductService) downloadAndCreatePhoto(ctx context.Context, projectID, productID int, rawURL string, sortOrder int) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("User-Agent", importUserAgent)

	resp, err := importHTTPClient.Do(req)
	if err != nil {
		logger.Error("service", "Failed to fetch product image", "error", err)
		return fmt.Errorf("fetch: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("http %d", resp.StatusCode)
	}

	// Determine extension from URL or Content-Type header.
	ext := strings.ToLower(filepath.Ext(strings.Split(rawURL, "?")[0]))
	if _, ok := allowedPhotoExts[ext]; !ok {
		ct := resp.Header.Get("Content-Type")
		switch {
		case strings.Contains(ct, "jpeg"):
			ext = ".jpg"
		case strings.Contains(ct, "png"):
			ext = ".png"
		case strings.Contains(ct, "webp"):
			ext = ".webp"
		default:
			return fmt.Errorf("unsupported content-type: %s", ct)
		}
	}
	contentType := allowedPhotoExts[ext]

	data, err := io.ReadAll(io.LimitReader(resp.Body, photoMaxSize+1))
	if err != nil {
		logger.Error("service", "Failed to read image response body", "error", err)
		return fmt.Errorf("read body: %w", err)
	}
	if int64(len(data)) > photoMaxSize {
		return fmt.Errorf("image exceeds 5MB limit")
	}

	objectID := uuid.New().String()
	originalKey := objectID + ext

	if err := s.storage.UploadBytes(ctx, photoBucket, originalKey, data, contentType); err != nil {
		return fmt.Errorf("upload original: %w", err)
	}

	thumbKey := originalKey
	if thumbData, thumbErr := generateThumbnail(data, ext); thumbErr == nil && len(thumbData) > 0 {
		tk := objectID + "_thumb.jpg"
		if uploadErr := s.storage.UploadBytes(ctx, photoBucket, tk, thumbData, "image/jpeg"); uploadErr == nil {
			thumbKey = tk
		}
	}

	photo := &model.ProductPhoto{
		ProductID:   &productID,
		ProjectID:   &projectID,
		ObjectKey:   thumbKey,
		OriginalKey: &originalKey,
		SortOrder:   sortOrder,
	}
	return s.repos.ProductPhoto.Create(ctx, photo)
}

// parseCSVRows reads all data rows from a CSV reader and validates each one.
// delimiter controls the CSV separator; mapping (optional) maps CSV column headers
// to our internal field names (keys = CSV headers, values = our field names).
func parseCSVRows(file io.Reader, delimiter rune, mapping map[string]string) ([]*parsedRow, error) {
	r := csv.NewReader(file)
	r.Comma = delimiter
	r.TrimLeadingSpace = true
	r.LazyQuotes = true

	rawRecords, err := r.ReadAll()
	if err != nil {
		logger.Error("service", "Failed to read CSV", "error", err)
		return nil, fmt.Errorf("read csv: %w", err)
	}
	if len(rawRecords) < 2 {
		return nil, fmt.Errorf("csv must have a header row and at least one data row")
	}

	// Build reverse mapping: our field name → column index.
	// If mapping is provided, use it; otherwise fall back to direct header matching.
	headerMap := make(map[string]int) // our field name → column index
	if len(mapping) > 0 {
		// First, map CSV header names → column indices.
		csvHeaderIdx := make(map[string]int)
		for i, h := range rawRecords[0] {
			csvHeaderIdx[strings.TrimSpace(h)] = i
		}
		// Then, for each mapping entry (csvHeader → ourField), record ourField → index.
		for csvHeader, ourField := range mapping {
			if idx, ok := csvHeaderIdx[csvHeader]; ok {
				fieldName := strings.ToLower(strings.TrimSpace(ourField))
				// Normalize "image_url" to "image_url_1".
				if fieldName == "image_url" {
					fieldName = "image_url_1"
				}
				headerMap[fieldName] = idx
			}
		}
	} else {
		// Direct header matching (case-insensitive).
		for i, h := range rawRecords[0] {
			headerMap[strings.ToLower(strings.TrimSpace(h))] = i
		}
	}

	col := func(name string) int {
		if i, ok := headerMap[name]; ok {
			return i
		}
		return -1
	}
	colVal := func(record []string, name string) string {
		i := col(name)
		if i < 0 || i >= len(record) {
			return ""
		}
		return strings.TrimSpace(record[i])
	}

	rows := make([]*parsedRow, 0, len(rawRecords)-1)
	for rowNum, record := range rawRecords[1:] {
		row := &parsedRow{
			rowNum:    rowNum + 2, // 1-based, skipping header
			name:      colVal(record, "name"),
			imageURLs: []string{},
		}

		if s := colVal(record, "sku"); s != "" {
			row.sku = &s
		}
		if s := colVal(record, "category"); s != "" {
			row.category = &s
		}
		if s := colVal(record, "gender"); s != "" {
			row.gender = &s
		}
		if s := colVal(record, "currency"); s != "" {
			row.currency = &s
		}
		if s := colVal(record, "product_url"); s != "" {
			row.productURL = &s
		}
		if s := colVal(record, "color"); s != "" {
			row.color = &s
		}
		if s := colVal(record, "material"); s != "" {
			row.material = &s
		}
		if s := colVal(record, "brand"); s != "" {
			row.brand = &s
		}
		if s := colVal(record, "description"); s != "" {
			row.description = &s
		}
		if s := colVal(record, "external_id"); s != "" {
			row.externalID = &s
		}

		if priceStr := colVal(record, "price"); priceStr != "" {
			if v, err := strconv.ParseFloat(priceStr, 64); err == nil {
				row.price = &v
			} else {
				row.errs = append(row.errs, "price is not a valid number")
			}
		}
		if dpStr := colVal(record, "discount_price"); dpStr != "" {
			if v, err := strconv.ParseFloat(dpStr, 64); err == nil {
				row.discountPrice = &v
			} else {
				row.warns = append(row.warns, "discount_price is not a valid number, ignored")
			}
		}

		if seasonStr := colVal(record, "season"); seasonStr != "" {
			parts := splitTrimmed(seasonStr, ",")
			if len(parts) > 0 {
				row.season = pq.StringArray(parts)
			}
		}
		if sizesStr := colVal(record, "sizes"); sizesStr != "" {
			parts := splitTrimmed(sizesStr, ",")
			if len(parts) > 0 {
				row.sizes = pq.StringArray(parts)
			}
		}

		// Collect image URLs from image_url_1..image_url_5.
		for _, imgCol := range []string{"image_url_1", "image_url_2", "image_url_3", "image_url_4", "image_url_5"} {
			if u := colVal(record, imgCol); u != "" {
				// Support Tilda-style multi-URL: if value contains spaces, split into separate URLs.
				if strings.Contains(u, " ") {
					for _, part := range strings.Fields(u) {
						part = strings.TrimSpace(part)
						if part != "" {
							row.imageURLs = append(row.imageURLs, part)
						}
					}
				} else {
					row.imageURLs = append(row.imageURLs, u)
				}
			}
		}

		validateImportRow(row)
		rows = append(rows, row)
	}

	return rows, nil
}

func validateImportRow(row *parsedRow) {
	if strings.TrimSpace(row.name) == "" {
		row.errs = append(row.errs, "name is required")
	} else if len(row.name) > 255 {
		row.errs = append(row.errs, "name exceeds 255 characters")
	}
	if row.category != nil && !validImportCategories[*row.category] {
		row.errs = append(row.errs, fmt.Sprintf("invalid category %q (expected: outerwear, tops, bottoms, shoes, accessories)", *row.category))
	}
	if row.gender != nil && !validImportGenders[*row.gender] {
		row.errs = append(row.errs, fmt.Sprintf("invalid gender %q (expected: female, male, unisex)", *row.gender))
	}
	if row.currency != nil && !validImportCurrencies[*row.currency] {
		row.errs = append(row.errs, fmt.Sprintf("invalid currency %q (expected: RUB, USD, EUR)", *row.currency))
	}
	if row.price != nil && *row.price < 0 {
		row.errs = append(row.errs, "price must be >= 0")
	}
	for _, u := range row.imageURLs {
		if !strings.HasPrefix(u, "http://") && !strings.HasPrefix(u, "https://") {
			row.warns = append(row.warns, fmt.Sprintf("image URL %q does not look like a valid URL", u))
		}
	}
}

// detectDelimiter tries common delimiters and picks the one that produces the most columns.
func detectDelimiter(data []byte) rune {
	candidates := []rune{';', ',', '\t'}
	bestDelim := ','
	bestCols := 0

	for _, d := range candidates {
		r := csv.NewReader(bytes.NewReader(data))
		r.Comma = d
		r.TrimLeadingSpace = true
		r.LazyQuotes = true

		cols := 0
		for i := 0; i < 2; i++ {
			record, err := r.Read()
			if err != nil {
				break
			}
			if len(record) > cols {
				cols = len(record)
			}
		}
		if cols > bestCols {
			bestCols = cols
			bestDelim = d
		}
	}

	return bestDelim
}

// parseDelimiterStr converts a delimiter string from the form to a rune.
// Returns 0 if auto-detection should be used.
func parseDelimiterStr(s string) rune {
	switch s {
	case ";":
		return ';'
	case ",":
		return ','
	case "\\t", "\t":
		return '\t'
	default:
		return 0 // auto
	}
}

// delimiterToString converts a rune delimiter back to a display string.
func delimiterToString(d rune) string {
	switch d {
	case '\t':
		return "\\t"
	default:
		return string(d)
	}
}

// ParseImportHeaders parses CSV headers and returns sample rows for column mapping UI.
func (s *ProductService) ParseImportHeaders(ctx context.Context, userID, projectID int, file io.Reader, delimiterStr string) (*dto.ParseHeadersResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	data, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("read file: %w", err)
	}

	delimiter := parseDelimiterStr(delimiterStr)
	if delimiter == 0 {
		delimiter = detectDelimiter(data)
	}

	r := csv.NewReader(bytes.NewReader(data))
	r.Comma = delimiter
	r.TrimLeadingSpace = true
	r.LazyQuotes = true

	records, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("parse csv: %w", err)
	}
	if len(records) == 0 {
		return nil, fmt.Errorf("csv file is empty")
	}

	headers := records[0]

	// Take up to 5 sample data rows.
	sampleCount := len(records) - 1
	if sampleCount > 5 {
		sampleCount = 5
	}
	sampleRows := make([][]string, 0, sampleCount)
	for i := 1; i <= sampleCount; i++ {
		sampleRows = append(sampleRows, records[i])
	}

	return &dto.ParseHeadersResponse{
		Headers:           headers,
		SampleRows:        sampleRows,
		DetectedDelimiter: delimiterToString(delimiter),
	}, nil
}

func splitTrimmed(s, sep string) []string {
	parts := strings.Split(s, sep)
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}
