package service

import (
	"context"
	"fmt"
	"time"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
)

type ProductGroupService struct {
	repos *repository.Repositories
}

func NewProductGroup(repos *repository.Repositories) *ProductGroupService {
	return &ProductGroupService{repos: repos}
}

// ListGroups returns all product groups for a project.
func (s *ProductGroupService) ListGroups(ctx context.Context, userID int, projectID int) (*dto.ProductGroupListResponse, error) {
	if err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	groups, err := s.repos.ProductGroup.ListByProjectID(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("list groups: %w", err)
	}

	groupIDs := make([]int, len(groups))
	for i, g := range groups {
		groupIDs[i] = g.ID
	}

	counts, err := s.repos.ProductGroup.CountProductsByGroupIDs(ctx, groupIDs)
	if err != nil {
		return nil, fmt.Errorf("count products: %w", err)
	}

	dtos := make([]dto.ProductGroupResponse, len(groups))
	for i, g := range groups {
		dtos[i] = s.groupToDTO(g, counts[g.ID])
	}

	return &dto.ProductGroupListResponse{Groups: dtos}, nil
}

// CreateGroup creates a new product group and syncs its products in one transaction.
func (s *ProductGroupService) CreateGroup(ctx context.Context, userID int, projectID int, req dto.CreateProductGroupRequest) (*dto.ProductGroupResponse, error) {
	if err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	group := &model.ProductGroup{
		ProjectID:   projectID,
		Name:        req.Name,
		Description: req.Description,
		IsActive:    req.IsActive,
	}

	if err := s.repos.ProductGroup.CreateWithProducts(ctx, group, req.ProductIDs); err != nil {
		return nil, fmt.Errorf("create group: %w", err)
	}

	resp := s.groupToDTO(group, int64(len(req.ProductIDs)))
	return &resp, nil
}

// UpdateGroup replaces updatable fields and syncs products in one transaction.
func (s *ProductGroupService) UpdateGroup(ctx context.Context, userID int, projectID int, groupID int, req dto.CreateProductGroupRequest) (*dto.ProductGroupResponse, error) {
	if err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return nil, err
	}

	group, err := s.repos.ProductGroup.GetByIDAndProjectID(ctx, groupID, projectID)
	if err != nil {
		return nil, fmt.Errorf("get group: %w", err)
	}
	if group == nil {
		return nil, ErrGroupNotFound
	}

	updates := map[string]any{
		"name":        req.Name,
		"description": req.Description,
		"is_active":   req.IsActive,
	}

	if err := s.repos.ProductGroup.UpdateWithProducts(ctx, groupID, updates, req.ProductIDs); err != nil {
		return nil, fmt.Errorf("update group: %w", err)
	}

	group, err = s.repos.ProductGroup.GetByIDAndProjectID(ctx, groupID, projectID)
	if err != nil {
		return nil, fmt.Errorf("re-fetch group: %w", err)
	}
	resp := s.groupToDTO(group, int64(len(req.ProductIDs)))
	return &resp, nil
}

// DeleteGroup soft-deletes a product group.
func (s *ProductGroupService) DeleteGroup(ctx context.Context, userID int, projectID int, groupID int) error {
	if err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return err
	}

	group, err := s.repos.ProductGroup.GetByIDAndProjectID(ctx, groupID, projectID)
	if err != nil {
		return fmt.Errorf("get group: %w", err)
	}
	if group == nil {
		return ErrGroupNotFound
	}

	return s.repos.ProductGroup.Delete(ctx, groupID)
}

// AddProducts adds products to a group.
func (s *ProductGroupService) AddProducts(ctx context.Context, userID int, projectID int, groupID int, req dto.AddProductsToGroupRequest) error {
	if err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return err
	}

	group, err := s.repos.ProductGroup.GetByIDAndProjectID(ctx, groupID, projectID)
	if err != nil {
		return fmt.Errorf("get group: %w", err)
	}
	if group == nil {
		return ErrGroupNotFound
	}

	if err := s.repos.ProductGroup.AddProductsToGroup(ctx, groupID, req.ProductIDs); err != nil {
		return fmt.Errorf("add products: %w", err)
	}

	return nil
}

// RemoveProduct removes a product from a group.
func (s *ProductGroupService) RemoveProduct(ctx context.Context, userID int, projectID int, groupID int, productID int) error {
	if err := s.requireProjectAccess(ctx, userID, projectID); err != nil {
		return err
	}

	group, err := s.repos.ProductGroup.GetByIDAndProjectID(ctx, groupID, projectID)
	if err != nil {
		return fmt.Errorf("get group: %w", err)
	}
	if group == nil {
		return ErrGroupNotFound
	}

	if err := s.repos.ProductGroup.RemoveProductFromGroup(ctx, groupID, productID); err != nil {
		return fmt.Errorf("remove product: %w", err)
	}

	return nil
}

func (s *ProductGroupService) requireProjectAccess(ctx context.Context, userID int, projectID int) error {
	project, err := s.repos.Project.GetByIDAndOwnerID(ctx, projectID, userID)
	if err != nil {
		return fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		return ErrProjectNotFound
	}
	return nil
}

func (s *ProductGroupService) groupToDTO(g *model.ProductGroup, count int64) dto.ProductGroupResponse {
	return dto.ProductGroupResponse{
		ID:            g.ID,
		ProjectID:     g.ProjectID,
		Name:          g.Name,
		Description:   g.Description,
		IsActive:      g.IsActive,
		IsPermanent:   g.IsPermanent,
		ProductsCount: count,
		CreatedAt:     g.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     g.UpdatedAt.Format(time.RFC3339),
	}
}
