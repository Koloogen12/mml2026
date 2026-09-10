package handler

import (
	"net/http"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/service"

	"github.com/google/uuid"
)

type SizeRecommendationHandler struct {
	sizeRecSvc *service.SizeRecommendationService
	leadSvc    *service.LeadService
}

func NewSizeRecommendation(sizeRecSvc *service.SizeRecommendationService, leadSvc *service.LeadService) *SizeRecommendationHandler {
	return &SizeRecommendationHandler{
		sizeRecSvc: sizeRecSvc,
		leadSvc:    leadSvc,
	}
}

// RecommendSize handles POST /api/widget/v1/recommend-size
func (h *SizeRecommendationHandler) RecommendSize(w http.ResponseWriter, r *http.Request) {
	var req dto.RecommendSizeRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	sessionToken, err := uuid.Parse(req.SessionToken)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid session token")
		return
	}

	productPublicID, err := uuid.Parse(req.ProductID)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid_request", "Invalid product ID")
		return
	}

	lead, err := h.leadSvc.GetLeadByToken(r.Context(), sessionToken)
	if err != nil {
		WriteError(w, http.StatusNotFound, "not_found", "Session not found")
		return
	}

	user := service.UserMeasurements{
		Gender: derefStr(lead.Gender),
		Chest:  derefInt(lead.Chest),
		Waist:  derefInt(lead.Waist),
		Hip:    derefInt(lead.Hip),
		Height: derefInt(lead.Height),
		Weight: derefInt(lead.Weight),
		EuSize: derefStr(lead.Size),
	}

	rec, err := h.sizeRecSvc.Recommend(r.Context(), productPublicID, user)
	if err != nil {
		WriteError(w, http.StatusNotFound, "not_found", "Product not found")
		return
	}

	resp := dto.RecommendSizeResponse{
		RecommendedSize: rec.RecommendedSize,
		Confidence:      rec.Confidence,
		Sizes:           mapFitScores(rec.AllScores),
		OutOfChart:      rec.OutOfChart,
	}

	WriteJSON(w, http.StatusOK, resp)
}

func mapFitScores(scores []service.SizeFitScore) []dto.SizeFitScoreDTO {
	if scores == nil {
		return nil
	}
	result := make([]dto.SizeFitScoreDTO, len(scores))
	for i, s := range scores {
		result[i] = dto.SizeFitScoreDTO{
			Size:  s.Size,
			Score: s.Score,
			Fit:   fitLabel(s),
		}
	}
	return result
}

func fitLabel(s service.SizeFitScore) string {
	if s.Score >= 0.85 {
		return "perfect"
	}
	if s.Score >= 0.60 {
		return "good"
	}
	// Determine direction: if most fits are below midpoint → tight, otherwise loose.
	belowCount := 0
	if s.ChestFit < 0.5 {
		belowCount++
	}
	if s.WaistFit < 0.5 {
		belowCount++
	}
	if s.HipFit < 0.5 {
		belowCount++
	}
	if belowCount >= 2 {
		return "tight"
	}
	return "loose"
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func derefInt(p *int) int {
	if p == nil {
		return 0
	}
	return *p
}
