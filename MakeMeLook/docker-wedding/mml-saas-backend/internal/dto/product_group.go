package dto

type CreateProductGroupRequest struct {
	Name        string  `json:"name" validate:"required,min=1,max=255"`
	Description *string `json:"description" validate:"omitempty,max=1000"`
	IsActive    bool    `json:"is_active"`
	ProductIDs  []int   `json:"product_ids"`
}

type ProductGroupResponse struct {
	ID            int     `json:"id"`
	ProjectID     int     `json:"project_id"`
	Name          string  `json:"name"`
	Description   *string `json:"description"`
	IsActive      bool    `json:"is_active"`
	IsPermanent   bool    `json:"is_permanent"`
	ProductsCount int64   `json:"products_count"`
	CreatedAt     string  `json:"created_at"`
	UpdatedAt     string  `json:"updated_at"`
}

type ProductGroupListResponse struct {
	Groups []ProductGroupResponse `json:"groups"`
}

type AddProductsToGroupRequest struct {
	ProductIDs []int `json:"product_ids" validate:"required,min=1,dive,min=1"`
}
