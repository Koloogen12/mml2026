package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png" // register PNG decoder
	"io"
	"path/filepath"
	"strings"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/pkg/logger"

	"github.com/google/uuid"
)

var ErrPhotoNotFound = errors.New("photo not found")

const (
	photoMaxSize = 5 * 1024 * 1024 // 5MB per photo
	thumbMaxW    = 600
	thumbMaxH    = 900
)

var allowedPhotoExts = map[string]string{
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".png":  "image/png",
	".webp": "image/webp",
}

// UploadProjectPhoto uploads a photo in the context of a project (before a product is created).
// Returns the photo record with NULL product_id; the photo is attached to a product on save.
func (s *ProductService) UploadProjectPhoto(ctx context.Context, userID, projectID int, file io.Reader, filename string, size int64) (*dto.ProductPhotoResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}
	return s.uploadPhoto(ctx, userID, projectID, nil, file, filename, size)
}

// UploadPhoto uploads a product photo directly attached to an existing product.
func (s *ProductService) UploadPhoto(ctx context.Context, userID, projectID, productID int, file io.Reader, filename string, size int64) (*dto.ProductPhotoResponse, error) {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	product, err := s.repos.Product.GetByIDAndProjectID(ctx, productID, projectID)
	if err != nil {
		return nil, fmt.Errorf("get product: %w", err)
	}
	if product == nil {
		return nil, ErrProductNotFound
	}

	return s.uploadPhoto(ctx, userID, projectID, &productID, file, filename, size)
}

// uploadPhoto is the shared implementation for both upload paths.
func (s *ProductService) uploadPhoto(ctx context.Context, userID, projectID int, productID *int, file io.Reader, filename string, size int64) (*dto.ProductPhotoResponse, error) {
	if size > photoMaxSize {
		return nil, ErrFileTooLarge
	}

	ext := strings.ToLower(filepath.Ext(filename))
	contentType, ok := allowedPhotoExts[ext]
	if !ok {
		return nil, ErrUnsupportedFileType
	}

	// Buffer the entire file so we can both upload original and generate thumbnail.
	data, err := io.ReadAll(io.LimitReader(file, photoMaxSize+1))
	if err != nil {
		logger.Error("product", "failed to read uploaded file", "filename", filename, "error", err)
		return nil, fmt.Errorf("read file: %w", err)
	}

	objectID := uuid.New().String()
	originalKey := objectID + ext

	if err := s.storage.UploadBytes(ctx, photoBucket, originalKey, data, contentType); err != nil {
		return nil, fmt.Errorf("upload photo: %w", err)
	}

	// Generate thumbnail; fall back to original on any error.
	thumbKey := originalKey
	if thumbData, thumbErr := generateThumbnail(data, ext); thumbErr == nil && len(thumbData) > 0 {
		tk := objectID + "_thumb.jpg"
		if uploadErr := s.storage.UploadBytes(ctx, photoBucket, tk, thumbData, "image/jpeg"); uploadErr == nil {
			thumbKey = tk
		} else {
			logger.Warn("product", "thumbnail upload failed, using original", "error", uploadErr)
		}
	}

	var sortOrder int
	if productID != nil {
		count, _ := s.repos.ProductPhoto.CountByProductID(ctx, *productID)
		sortOrder = int(count)
	}

	photo := &model.ProductPhoto{
		ProductID:   productID,
		ProjectID:   &projectID,
		ObjectKey:   thumbKey,
		OriginalKey: &originalKey,
		SortOrder:   sortOrder,
		UploadedBy:  &userID,
	}
	if err := s.repos.ProductPhoto.Create(ctx, photo); err != nil {
		return nil, fmt.Errorf("save photo record: %w", err)
	}

	return &dto.ProductPhotoResponse{
		ID:        photo.ID,
		URL:       s.storage.GetObjectURL(photoBucket, photo.ObjectKey),
		SortOrder: photo.SortOrder,
	}, nil
}

// syncProductPhotos replaces the photo list for a product:
// - photos not in photoIDs are soft-deleted
// - new photos (uploaded but not yet attached) are attached in order
// - existing photos are reordered
func (s *ProductService) syncProductPhotos(ctx context.Context, productID, userID, projectID int, photoIDs []int) error {
	existing, err := s.repos.ProductPhoto.ListByProductID(ctx, productID)
	if err != nil {
		return fmt.Errorf("list existing photos: %w", err)
	}

	existingSet := make(map[int]bool, len(existing))
	for _, p := range existing {
		existingSet[p.ID] = true
	}

	// Soft-delete photos for this product that are no longer in the list.
	if err := s.repos.ProductPhoto.DeleteNotInList(ctx, productID, photoIDs); err != nil {
		return fmt.Errorf("remove old photos: %w", err)
	}

	var toReorder []repository.PhotoSortOrder
	for i, photoID := range photoIDs {
		if existingSet[photoID] {
			toReorder = append(toReorder, repository.PhotoSortOrder{ID: photoID, SortOrder: i})
		} else {
			// New photo uploaded but not yet attached to a product.
			if err := s.repos.ProductPhoto.AttachToProduct(ctx, photoID, userID, projectID, productID, i); err != nil {
				return fmt.Errorf("attach photo %d: %w", photoID, err)
			}
		}
	}

	if len(toReorder) > 0 {
		if err := s.repos.ProductPhoto.UpdateSortOrders(ctx, toReorder); err != nil {
			return fmt.Errorf("reorder photos: %w", err)
		}
	}

	return nil
}

// DeletePhoto soft-deletes a product photo.
func (s *ProductService) DeletePhoto(ctx context.Context, userID, projectID, productID, photoID int) error {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return err
	}

	product, err := s.repos.Product.GetByIDAndProjectID(ctx, productID, projectID)
	if err != nil {
		return fmt.Errorf("get product: %w", err)
	}
	if product == nil {
		return ErrProductNotFound
	}

	photo, err := s.repos.ProductPhoto.GetByIDAndProductID(ctx, photoID, productID)
	if err != nil {
		return fmt.Errorf("get photo: %w", err)
	}
	if photo == nil {
		return ErrPhotoNotFound
	}

	return s.repos.ProductPhoto.Delete(ctx, photoID)
}

// ReorderPhotos updates sort_order for a set of photos.
func (s *ProductService) ReorderPhotos(ctx context.Context, userID, projectID, productID int, req dto.ReorderPhotosRequest) error {
	if _, err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return err
	}

	product, err := s.repos.Product.GetByIDAndProjectID(ctx, productID, projectID)
	if err != nil {
		return fmt.Errorf("get product: %w", err)
	}
	if product == nil {
		return ErrProductNotFound
	}

	orders := make([]repository.PhotoSortOrder, len(req.Orders))
	for i, o := range req.Orders {
		orders[i] = repository.PhotoSortOrder{ID: o.ID, SortOrder: o.SortOrder}
	}

	return s.repos.ProductPhoto.UpdateSortOrders(ctx, orders)
}

// generateThumbnail resizes JPEG/PNG images to fit within thumbMaxW × thumbMaxH.
// Returns nil, nil for unsupported formats (WebP, etc.) — caller uses original.
func generateThumbnail(data []byte, ext string) ([]byte, error) {
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
		return nil, nil
	}

	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("decode image: %w", err)
	}

	resized := resizeNN(img, thumbMaxW, thumbMaxH)

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, resized, &jpeg.Options{Quality: 85}); err != nil {
		return nil, fmt.Errorf("encode thumbnail: %w", err)
	}
	return buf.Bytes(), nil
}

// resizeNN downsizes src to fit within maxW × maxH using nearest-neighbour sampling.
// Returns src unchanged if it already fits.
func resizeNN(src image.Image, maxW, maxH int) image.Image {
	bounds := src.Bounds()
	origW := bounds.Dx()
	origH := bounds.Dy()

	if origW <= maxW && origH <= maxH {
		return src
	}

	scaleX := float64(origW) / float64(maxW)
	scaleY := float64(origH) / float64(maxH)
	scale := scaleX
	if scaleY > scaleX {
		scale = scaleY
	}

	newW := int(float64(origW) / scale)
	newH := int(float64(origH) / scale)
	if newW < 1 {
		newW = 1
	}
	if newH < 1 {
		newH = 1
	}

	dst := image.NewRGBA(image.Rect(0, 0, newW, newH))
	for y := 0; y < newH; y++ {
		srcY := int(float64(y)*scale) + bounds.Min.Y
		for x := 0; x < newW; x++ {
			srcX := int(float64(x)*scale) + bounds.Min.X
			dst.Set(x, y, src.At(srcX, srcY))
		}
	}
	return dst
}
