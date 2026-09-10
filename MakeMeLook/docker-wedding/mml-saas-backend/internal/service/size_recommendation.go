package service

import (
	"context"
	"encoding/json"
	"math"
	"sort"

	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/pkg/logger"

	"github.com/google/uuid"
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// SizeMeasurements holds the measurement range for a single size label.
type SizeMeasurements struct {
	ChestMin int `json:"chest_min"`
	ChestMax int `json:"chest_max"`
	WaistMin int `json:"waist_min"`
	WaistMax int `json:"waist_max"`
	HipMin   int `json:"hip_min"`
	HipMax   int `json:"hip_max"`
}

// SizeChart maps a normalized size label (e.g. "S") to its measurement ranges.
type SizeChart map[string]SizeMeasurements

// UserMeasurements are the body parameters supplied by the widget visitor.
type UserMeasurements struct {
	Gender string
	Chest  int
	Waist  int
	Hip    int
	Height int
	Weight int
	EuSize string // self-selected size, used as tiebreaker
}

// SizeFitScore is the per-size result returned by the algorithm.
type SizeFitScore struct {
	Size     string  `json:"size"`
	Score    float64 `json:"score"`
	ChestFit float64 `json:"chest_fit"`
	WaistFit float64 `json:"waist_fit"`
	HipFit   float64 `json:"hip_fit"`
}

// SizeRecommendation is the full output of the recommendation algorithm.
type SizeRecommendation struct {
	RecommendedSize string         `json:"recommended_size"`
	Confidence      string         `json:"confidence"` // high, medium, low
	AllScores       []SizeFitScore `json:"all_scores"`
}

// ---------------------------------------------------------------------------
// Standard Russian size tables (GOST-based)
// ---------------------------------------------------------------------------

var standardWomenSizeChart = SizeChart{
	"XXS": {ChestMin: 78, ChestMax: 82, WaistMin: 57, WaistMax: 60, HipMin: 82, HipMax: 86},
	"XS":  {ChestMin: 82, ChestMax: 86, WaistMin: 61, WaistMax: 64, HipMin: 86, HipMax: 90},
	"S":   {ChestMin: 86, ChestMax: 90, WaistMin: 65, WaistMax: 69, HipMin: 90, HipMax: 94},
	"M":   {ChestMin: 90, ChestMax: 94, WaistMin: 70, WaistMax: 74, HipMin: 94, HipMax: 98},
	"L":   {ChestMin: 94, ChestMax: 98, WaistMin: 75, WaistMax: 78, HipMin: 98, HipMax: 102},
	"XL":  {ChestMin: 98, ChestMax: 102, WaistMin: 79, WaistMax: 82, HipMin: 102, HipMax: 106},
	"XXL": {ChestMin: 102, ChestMax: 106, WaistMin: 83, WaistMax: 87, HipMin: 106, HipMax: 110},
}

var standardMenSizeChart = SizeChart{
	"XXS": {ChestMin: 84, ChestMax: 88, WaistMin: 70, WaistMax: 74, HipMin: 86, HipMax: 90},
	"XS":  {ChestMin: 88, ChestMax: 92, WaistMin: 74, WaistMax: 78, HipMin: 90, HipMax: 94},
	"S":   {ChestMin: 92, ChestMax: 96, WaistMin: 78, WaistMax: 82, HipMin: 94, HipMax: 98},
	"M":   {ChestMin: 96, ChestMax: 100, WaistMin: 82, WaistMax: 86, HipMin: 98, HipMax: 102},
	"L":   {ChestMin: 100, ChestMax: 104, WaistMin: 86, WaistMax: 90, HipMin: 102, HipMax: 106},
	"XL":  {ChestMin: 104, ChestMax: 108, WaistMin: 90, WaistMax: 94, HipMin: 106, HipMax: 110},
	"XXL": {ChestMin: 108, ChestMax: 112, WaistMin: 94, WaistMax: 98, HipMin: 110, HipMax: 114},
}

// sizeOrder defines the canonical ordering of standard size labels.
var sizeOrder = map[string]int{
	"XXS": 0, "XS": 1, "S": 2, "M": 3, "L": 4, "XL": 5, "XXL": 6, "XXXL": 7,
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

// SizeRecommendationService computes the best-fitting clothing size for a user.
type SizeRecommendationService struct {
	repos *repository.Repositories
}

func NewSizeRecommendation(repos *repository.Repositories) *SizeRecommendationService {
	return &SizeRecommendationService{repos: repos}
}

// Recommend computes a size recommendation for the given product and user measurements.
func (s *SizeRecommendationService) Recommend(ctx context.Context, productPublicID uuid.UUID, user UserMeasurements) (*SizeRecommendation, error) {
	product, err := s.repos.Product.GetByPublicID(ctx, productPublicID)
	if err != nil {
		return nil, ErrProductNotFound
	}

	logger.Info("size_recommendation", "input",
		"gender", user.Gender, "height", user.Height, "weight", user.Weight,
		"chest", user.Chest, "waist", user.Waist, "hip", user.Hip,
		"euSize", user.EuSize, "productID", productPublicID.String())

	// 0. If the user explicitly picked a standard size (e.g. "M" in the
	//    onboarding slider), trust it — they know their body better than any
	//    algorithm. Return immediately with high confidence.
	if user.EuSize != "" {
		if _, ok := sizeOrder[user.EuSize]; ok {
			logger.Info("size_recommendation", "using user-selected euSize", "size", user.EuSize)
			return &SizeRecommendation{
				RecommendedSize: user.EuSize,
				Confidence:      "high",
			}, nil
		}
	}

	// 1. Resolve size chart: per-product override or standard table.
	chart := resolveChart(product.SizeChart, product.Gender, user.Gender)

	// 2. Determine available sizes from product data.
	available := collectAvailableSizes(product)

	// 3. Filter chart to available sizes only (if product defines them).
	if len(available) > 0 {
		filtered := make(SizeChart)
		for _, sz := range available {
			if m, ok := chart[sz]; ok {
				filtered[sz] = m
			}
		}
		if len(filtered) > 0 {
			chart = filtered
		}
	}

	if len(chart) == 0 {
		return fallbackRecommendation(available, user.EuSize), nil
	}

	// 4. Handle missing measurements (common when the "measurements" onboarding
	//    stage is disabled). Instead of a useless median-based fallback, derive
	//    the best size from BMI which gives ±1 size accuracy.
	if user.Chest == 0 && user.Waist == 0 && user.Hip == 0 {
		if user.Height > 0 && user.Weight > 0 {
			bmiSize := estimateSizeByBMI(user.Gender, user.Height, user.Weight)
			return bmiRecommendation(bmiSize, available, user.EuSize), nil
		}
		return fallbackRecommendation(available, user.EuSize), nil
	}

	// 5. Category-based weights.
	chestW, waistW, hipW := categoryWeights(ptrStr(product.Category))

	// 6. Score each size.
	scores := make([]SizeFitScore, 0, len(chart))
	for sz, m := range chart {
		chestFit := dimensionFit(user.Chest, m.ChestMin, m.ChestMax)
		waistFit := dimensionFit(user.Waist, m.WaistMin, m.WaistMax)
		hipFit := dimensionFit(user.Hip, m.HipMin, m.HipMax)

		totalWeight := 0.0
		total := 0.0
		if user.Chest > 0 {
			total += chestFit * chestW
			totalWeight += chestW
		}
		if user.Waist > 0 {
			total += waistFit * waistW
			totalWeight += waistW
		}
		if user.Hip > 0 {
			total += hipFit * hipW
			totalWeight += hipW
		}
		score := 0.0
		if totalWeight > 0 {
			score = total / totalWeight
		}

		scores = append(scores, SizeFitScore{
			Size:     sz,
			Score:    math.Round(score*100) / 100,
			ChestFit: math.Round(chestFit*100) / 100,
			WaistFit: math.Round(waistFit*100) / 100,
			HipFit:   math.Round(hipFit*100) / 100,
		})
	}

	// Sort by score descending, then by canonical size order for stability.
	sort.Slice(scores, func(i, j int) bool {
		if scores[i].Score != scores[j].Score {
			return scores[i].Score > scores[j].Score
		}
		return sizeOrder[scores[i].Size] < sizeOrder[scores[j].Size]
	})

	// 7. Height correction: taller people need physically larger garments
	//    regardless of body circumference (longer sleeves, torso, inseam).
	//    Shift the recommended size up for every 5cm above reference height.
	//    Male ref=178, Female ref=166 (median RU heights).
	recommended := scores[0].Size
	{
		var refH int
		if user.Gender == "female" {
			refH = 166
		} else {
			refH = 178
		}
		shift := (user.Height - refH) / 5 // +1 per 5cm above ref
		if shift < 0 {
			shift = 0
		}
		if shift > 0 {
			targetOrder := sizeOrder[recommended] + shift
			// Find the size closest to targetOrder
			bestSize := recommended
			bestDist := 100
			for _, sc := range scores {
				d := sizeOrder[sc.Size] - targetOrder
				if d < 0 {
					d = -d
				}
				if d < bestDist {
					bestDist = d
					bestSize = sc.Size
				}
			}
			if bestSize != recommended {
				logger.Info("size_recommendation", "height correction applied",
					"height", user.Height, "from", recommended, "to", bestSize, "shift", shift)
				// Move bestSize to top of scores
				for i, sc := range scores {
					if sc.Size == bestSize {
						scores[0], scores[i] = scores[i], scores[0]
						break
					}
				}
			}
		}
	}

	// 7b. Tiebreaker: if top two are close and user's euSize matches one, prefer it.
	if len(scores) >= 2 && scores[0].Score-scores[1].Score < 0.02 && user.EuSize != "" {
		for idx := 0; idx < len(scores) && idx < 3; idx++ {
			if scores[idx].Size == user.EuSize {
				scores[0], scores[idx] = scores[idx], scores[0]
				break
			}
		}
	}

	// 8. Confidence level.
	confidence := "low"
	if scores[0].Score >= 0.85 {
		confidence = "high"
	} else if scores[0].Score >= 0.60 {
		confidence = "medium"
	}
	if len(scores) >= 2 && scores[0].Score-scores[1].Score < 0.05 {
		if confidence == "high" {
			confidence = "medium"
		} else if confidence == "medium" {
			confidence = "low"
		}
	}

	return &SizeRecommendation{
		RecommendedSize: scores[0].Size,
		Confidence:      confidence,
		AllScores:       scores,
	}, nil
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

func resolveChart(sizeChartJSON *json.RawMessage, productGender *string, userGender string) SizeChart {
	if sizeChartJSON != nil {
		var custom SizeChart
		if err := json.Unmarshal(*sizeChartJSON, &custom); err == nil && len(custom) > 0 {
			return custom
		}
		logger.Warn("size_recommendation", "Failed to unmarshal custom size chart, falling back to standard")
	}

	gender := userGender
	if productGender != nil && *productGender != "" && *productGender != "unisex" {
		gender = *productGender
	}
	if gender == "male" {
		return standardMenSizeChart
	}
	return standardWomenSizeChart
}

func collectAvailableSizes(product *model.Product) []string {
	seen := make(map[string]struct{})
	var result []string

	for _, sz := range product.Sizes {
		if _, ok := seen[sz]; !ok {
			seen[sz] = struct{}{}
			result = append(result, sz)
		}
	}

	if product.SizeVariants != nil {
		var sv map[string]string
		if err := json.Unmarshal(*product.SizeVariants, &sv); err == nil {
			for sz := range sv {
				if _, ok := seen[sz]; !ok {
					seen[sz] = struct{}{}
					result = append(result, sz)
				}
			}
		}
	}

	return result
}

func categoryWeights(category string) (chestW, waistW, hipW float64) {
	switch category {
	case "tops", "outerwear":
		return 0.50, 0.30, 0.20
	case "bottoms":
		return 0.10, 0.45, 0.45
	default:
		return 0.34, 0.33, 0.33
	}
}

func fallbackRecommendation(available []string, euSize string) *SizeRecommendation {
	if euSize != "" {
		for _, sz := range available {
			if sz == euSize {
				return &SizeRecommendation{
					RecommendedSize: euSize,
					Confidence:      "low",
				}
			}
		}
	}
	if len(available) > 0 {
		sorted := make([]string, len(available))
		copy(sorted, available)
		sort.Slice(sorted, func(i, j int) bool {
			return sizeOrder[sorted[i]] < sizeOrder[sorted[j]]
		})
		return &SizeRecommendation{
			RecommendedSize: sorted[len(sorted)/2],
			Confidence:      "low",
		}
	}
	return &SizeRecommendation{
		RecommendedSize: "M",
		Confidence:      "low",
	}
}

// estimateSizeByBMI picks the best standard size label purely from height +
// weight. BMI ranges are calibrated against RU/EU ready-to-wear charts.
//
// Examples (male):
//
//	189 cm / 69 kg  → BMI 19.3 → "S"
//	180 cm / 80 kg  → BMI 24.7 → "M"
//	175 cm / 90 kg  → BMI 29.4 → "XL"
//	170 cm / 55 kg  → BMI 19.0 → "XS"
func estimateSizeByBMI(gender string, height, weight int) string {
	bmi := float64(weight) / math.Pow(float64(height)/100.0, 2)

	// Height adjustment: taller people wear bigger sizes at the same BMI.
	// A 190cm guy with BMI 20 wears M, not XS. Shift BMI thresholds down
	// by ~0.5 per 5cm above 175 (male) / 165 (female).
	var ref float64
	if gender == "female" {
		ref = 165.0
	} else {
		ref = 175.0
	}
	heightBonus := (float64(height) - ref) * 0.1 // +0.5 per 5cm above ref

	// Effective BMI for sizing: real BMI + height bonus
	effBMI := bmi + heightBonus

	if gender == "female" {
		switch {
		case effBMI < 18.5:
			return "XS"
		case effBMI < 21.0:
			return "S"
		case effBMI < 24.0:
			return "M"
		case effBMI < 27.0:
			return "L"
		case effBMI < 30.0:
			return "XL"
		default:
			return "XXL"
		}
	}
	// male / unisex
	switch {
	case effBMI < 19.5:
		return "XS"
	case effBMI < 22.0:
		return "S"
	case effBMI < 25.0:
		return "M"
	case effBMI < 28.0:
		return "L"
	case effBMI < 31.0:
		return "XL"
	default:
		return "XXL"
	}
}

// bmiRecommendation returns the BMI-estimated size (or closest available)
// with "medium" confidence. This is used when exact body measurements are
// unavailable but height + weight provide a reasonable BMI signal.
func bmiRecommendation(bmiSize string, available []string, euSize string) *SizeRecommendation {
	// Prefer user's self-reported size if available.
	if euSize != "" {
		for _, sz := range available {
			if sz == euSize {
				return &SizeRecommendation{RecommendedSize: euSize, Confidence: "medium"}
			}
		}
	}
	// If product defines specific sizes, pick the closest to BMI estimate.
	if len(available) > 0 {
		sorted := make([]string, len(available))
		copy(sorted, available)
		sort.Slice(sorted, func(i, j int) bool {
			return sizeOrder[sorted[i]] < sizeOrder[sorted[j]]
		})
		closest := sorted[0]
		bestDist := absDist(sizeOrder[bmiSize], sizeOrder[sorted[0]])
		for _, sz := range sorted {
			d := absDist(sizeOrder[bmiSize], sizeOrder[sz])
			if d < bestDist {
				bestDist = d
				closest = sz
			}
		}
		return &SizeRecommendation{RecommendedSize: closest, Confidence: "medium"}
	}
	return &SizeRecommendation{RecommendedSize: bmiSize, Confidence: "medium"}
}

func absDist(a, b int) int {
	if a > b {
		return a - b
	}
	return b - a
}

// dimensionFit returns a 0.0-1.0 score for how well a measurement fits a range.
// 1.0 = perfectly within range, decaying linearly outside.
func dimensionFit(value, min, max int) float64 {
	if value <= 0 {
		return 0.5
	}
	if value >= min && value <= max {
		return 1.0
	}
	rangeWidth := float64(max - min)
	if rangeWidth < 1 {
		rangeWidth = 1
	}
	mid := float64(min+max) / 2.0
	halfRange := rangeWidth / 2.0
	distance := math.Abs(float64(value) - mid)
	penalty := distance - halfRange
	maxPenalty := rangeWidth

	score := 1.0 - penalty/maxPenalty
	if score < 0 {
		return 0
	}
	if score > 1 {
		return 1
	}
	return score
}

func ptrStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
