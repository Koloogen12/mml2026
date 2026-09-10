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
	// OutOfChart is true when none of the product's sizes meaningfully fit
	// the user — i.e. the best score is below 0.30. The widget can show a
	// "вне размерной сетки" warning so users understand the recommendation
	// is a best-effort guess rather than a real fit.
	OutOfChart bool `json:"out_of_chart"`
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

// ruToEuSize maps a Russian numeric size (as entered by the user) to the
// closest EU letter size. Used when the user didn't pick a letter size
// explicitly — the widget typically stores "52" / "46" etc. and the
// recommender treated these as opaque strings that never matched any
// chart entry, so the tiebreaker silently did nothing.
var ruToEuSize = map[string]string{
	// Women
	"40": "XXS", "42": "XS", "44": "S", "46": "M", "48": "L",
	"50": "XL", "52": "XXL", "54": "XXXL", "56": "XXXL",
	// Men (same digits, but the width bands differ — mapping is identical
	// because the letter sizes already track the user's gender chart).
}

// normalizeEuSize converts whatever the user supplied (letter or Russian
// numeric) into a canonical EU letter size, if possible. Returns "" when
// unknown so the caller can skip tiebreaking.
func normalizeEuSize(input string) string {
	if input == "" {
		return ""
	}
	// Already a letter size?
	if _, ok := sizeOrder[input]; ok {
		return input
	}
	if mapped, ok := ruToEuSize[input]; ok {
		return mapped
	}
	return ""
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

	// Normalize EuSize up-front — converts "52" → "XXL" etc. Used both
	// for the tiebreaker below and as a last-resort signal when chest/
	// waist/hip are missing.
	normalizedEu := normalizeEuSize(user.EuSize)

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
		return fallbackRecommendation(available, normalizedEu), nil
	}

	// Short-circuit: the user explicitly told us their size (after RU→EU
	// normalisation). Three cases:
	//
	//   1. The stated size exists in the product's chart → return it with
	//      high confidence. Trust the user over the tape-measure algorithm.
	//   2. The stated size is LARGER than anything the product offers →
	//      return the largest available size + OutOfChart=true. The BMI/
	//      dimension scorer would otherwise pick a random size that happens
	//      to match one narrow dimension (e.g. narrow waist fits S while
	//      chest blows past every size).
	//   3. The stated size is SMALLER than anything the product offers →
	//      return the smallest available size + OutOfChart=true.
	//
	// Dimension scoring only runs when the user did not supply any size.
	if normalizedEu != "" {
		if _, ok := chart[normalizedEu]; ok {
			return &SizeRecommendation{
				RecommendedSize: normalizedEu,
				Confidence:      "high",
				AllScores:       nil,
				OutOfChart:      false,
			}, nil
		}

		// Pick the closest available size relative to the user's stated one.
		userIdx, userKnown := sizeOrder[normalizedEu]
		if userKnown {
			closest := ""
			closestDiff := 1 << 30
			for sz := range chart {
				idx, ok := sizeOrder[sz]
				if !ok {
					continue
				}
				d := idx - userIdx
				if d < 0 {
					d = -d
				}
				if d < closestDiff {
					closestDiff = d
					closest = sz
				}
			}
			if closest != "" {
				return &SizeRecommendation{
					RecommendedSize: closest,
					Confidence:      "low",
					AllScores:       nil,
					OutOfChart:      true,
				}, nil
			}
		}
	}

	// 4. Handle missing measurements.
	if user.Chest == 0 && user.Waist == 0 && user.Hip == 0 {
		return fallbackRecommendation(available, normalizedEu), nil
	}

	// 5. Category-based weights. Body weight is an independent axis layered
	// on top of the chest/waist/hip fit — see scoring below.
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

		// Height / weight sanity layer. If the user supplied them, blend
		// an additional "body compatibility" score that softly penalises
		// sizes that are far off the expected band for this height+weight.
		// Weight 0.15 so it nudges rather than dominates.
		if user.Height > 0 && user.Weight > 0 {
			bodyFit := bodyCompatibility(user.Height, user.Weight, sz, user.Gender)
			score = score*0.85 + bodyFit*0.15
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

	// 7. Tiebreaker: if top two are close and user's euSize matches one, prefer it.
	if len(scores) >= 2 && scores[0].Score-scores[1].Score < 0.02 && normalizedEu != "" {
		for idx := 0; idx < len(scores) && idx < 3; idx++ {
			if scores[idx].Size == normalizedEu {
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
		OutOfChart:      scores[0].Score < 0.30,
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

// bodyCompatibility returns a 0.0–1.0 "does this letter size make sense
// for a person this tall and this heavy" sanity score, independent of
// the per-product size chart.
//
// We approximate BMI-driven expected size from height+weight:
//   BMI = weight / (height_m)^2.  Normal adult BMI bands roughly map to
//   letter sizes as below (same table for men and women — the actual
//   chest/waist/hip fit in the main scorer already accounts for gender).
//
// Then we score how far the candidate letter size is from that expected
// size on the canonical ordering. Exact match = 1.0, one step away = 0.6,
// two steps = 0.3, three or more = 0.0.
func bodyCompatibility(heightCm, weightKg int, size, gender string) float64 {
	if heightCm < 50 || weightKg < 20 {
		return 0.5
	}
	hM := float64(heightCm) / 100.0
	bmi := float64(weightKg) / (hM * hM)

	var expected string
	switch {
	case bmi < 17.5:
		expected = "XXS"
	case bmi < 19.5:
		expected = "XS"
	case bmi < 21.5:
		expected = "S"
	case bmi < 23.5:
		expected = "M"
	case bmi < 25.5:
		expected = "L"
	case bmi < 28.0:
		expected = "XL"
	case bmi < 31.0:
		expected = "XXL"
	default:
		expected = "XXXL"
	}

	// Tall men (>185cm) at the same BMI carry mass "longer" and typically
	// wear one size up vs. the BMI table. Small adjustment so e.g.
	// 188cm/90kg (BMI 25.5 → XL) nudges toward XXL rather than L.
	if gender == "male" && heightCm >= 185 {
		if idx, ok := sizeOrder[expected]; ok && idx < 7 {
			for k, v := range sizeOrder {
				if v == idx+1 {
					expected = k
					break
				}
			}
		}
	}

	expectedIdx, okE := sizeOrder[expected]
	candIdx, okC := sizeOrder[size]
	if !okE || !okC {
		return 0.5
	}
	diff := math.Abs(float64(expectedIdx - candIdx))
	switch {
	case diff == 0:
		return 1.0
	case diff == 1:
		return 0.6
	case diff == 2:
		return 0.3
	default:
		return 0.0
	}
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
