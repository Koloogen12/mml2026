package service

import (
	"testing"
)

func TestDimensionFit_InRange(t *testing.T) {
	score := dimensionFit(88, 86, 90)
	if score != 1.0 {
		t.Errorf("expected 1.0 for value in range, got %f", score)
	}
}

func TestDimensionFit_AtBoundary(t *testing.T) {
	score := dimensionFit(86, 86, 90)
	if score != 1.0 {
		t.Errorf("expected 1.0 at lower boundary, got %f", score)
	}
	score = dimensionFit(90, 86, 90)
	if score != 1.0 {
		t.Errorf("expected 1.0 at upper boundary, got %f", score)
	}
}

func TestDimensionFit_OutsideRange(t *testing.T) {
	// 2 cm outside a 4-cm range → penalty = 2-2 = 0... wait.
	// range = 86-90, mid = 88, halfRange = 2
	// value = 92: distance = 4, penalty = 4-2 = 2, maxPenalty = 4, score = 1 - 2/4 = 0.5
	score := dimensionFit(92, 86, 90)
	if score < 0.49 || score > 0.51 {
		t.Errorf("expected ~0.5 for value 2 outside range, got %f", score)
	}
}

func TestDimensionFit_FarOutside(t *testing.T) {
	// value = 96, range = 86-90, mid = 88, halfRange = 2
	// distance = 8, penalty = 8-2 = 6, maxPenalty = 4, score = 1 - 6/4 = -0.5 → clamped to 0
	score := dimensionFit(96, 86, 90)
	if score != 0.0 {
		t.Errorf("expected 0.0 for value far outside range, got %f", score)
	}
}

func TestDimensionFit_ZeroValue(t *testing.T) {
	score := dimensionFit(0, 86, 90)
	if score != 0.5 {
		t.Errorf("expected 0.5 for zero value, got %f", score)
	}
}

func TestCategoryWeights(t *testing.T) {
	c, w, h := categoryWeights("tops")
	if c != 0.50 || w != 0.30 || h != 0.20 {
		t.Errorf("tops weights wrong: %f %f %f", c, w, h)
	}
	c, w, h = categoryWeights("bottoms")
	if c != 0.10 || w != 0.45 || h != 0.45 {
		t.Errorf("bottoms weights wrong: %f %f %f", c, w, h)
	}
	c, w, h = categoryWeights("")
	if c != 0.34 || w != 0.33 || h != 0.33 {
		t.Errorf("default weights wrong: %f %f %f", c, w, h)
	}
}

func TestFallbackRecommendation_WithEuSize(t *testing.T) {
	rec := fallbackRecommendation([]string{"S", "M", "L"}, "M")
	if rec.RecommendedSize != "M" {
		t.Errorf("expected M, got %s", rec.RecommendedSize)
	}
	if rec.Confidence != "low" {
		t.Errorf("expected low confidence, got %s", rec.Confidence)
	}
}

func TestFallbackRecommendation_MiddleSize(t *testing.T) {
	rec := fallbackRecommendation([]string{"XS", "S", "M", "L", "XL"}, "")
	if rec.RecommendedSize != "M" {
		t.Errorf("expected middle size M, got %s", rec.RecommendedSize)
	}
}

func TestFallbackRecommendation_NoSizes(t *testing.T) {
	rec := fallbackRecommendation(nil, "")
	if rec.RecommendedSize != "M" {
		t.Errorf("expected default M, got %s", rec.RecommendedSize)
	}
}

// TestRecommendation_MalinaBonita simulates the pilot client's size chart
// with a real user's body parameters.
func TestRecommendation_MalinaBonita(t *testing.T) {
	// Malina Bonita standard Russian women's chart (matches our standardWomenSizeChart).
	// Test: woman with chest=88, waist=68, hip=94 → should be S or M.
	chart := standardWomenSizeChart

	user := UserMeasurements{
		Gender: "female",
		Chest:  88,
		Waist:  68,
		Hip:    94,
		EuSize: "S",
	}

	// Score S: chest 86-90 → 1.0, waist 65-69 → 1.0, hip 90-94 → 1.0
	// All perfectly in range for S
	available := []string{"XS", "S", "M", "L", "XL"}

	filtered := make(SizeChart)
	for _, sz := range available {
		if m, ok := chart[sz]; ok {
			filtered[sz] = m
		}
	}

	chestW, waistW, hipW := categoryWeights("tops")

	var bestSize string
	bestScore := -1.0

	for sz, m := range filtered {
		chestFit := dimensionFit(user.Chest, m.ChestMin, m.ChestMax)
		waistFit := dimensionFit(user.Waist, m.WaistMin, m.WaistMax)
		hipFit := dimensionFit(user.Hip, m.HipMin, m.HipMax)

		score := chestFit*chestW + waistFit*waistW + hipFit*hipW
		t.Logf("Size %s: chest_fit=%.2f waist_fit=%.2f hip_fit=%.2f score=%.2f",
			sz, chestFit, waistFit, hipFit, score)

		if score > bestScore {
			bestScore = score
			bestSize = sz
		}
	}

	if bestSize != "S" {
		t.Errorf("expected S for chest=88 waist=68 hip=94, got %s (score=%.2f)", bestSize, bestScore)
	}
	t.Logf("Best: %s with score %.2f", bestSize, bestScore)
}

// TestRecommendation_LargerWoman tests a woman who is between L and XL.
func TestRecommendation_LargerWoman(t *testing.T) {
	chart := standardWomenSizeChart
	available := []string{"XS", "S", "M", "L", "XL"}

	user := UserMeasurements{
		Gender: "female",
		Chest:  100,
		Waist:  80,
		Hip:    104,
	}

	filtered := make(SizeChart)
	for _, sz := range available {
		if m, ok := chart[sz]; ok {
			filtered[sz] = m
		}
	}

	chestW, waistW, hipW := categoryWeights("")

	var bestSize string
	bestScore := -1.0

	for sz, m := range filtered {
		chestFit := dimensionFit(user.Chest, m.ChestMin, m.ChestMax)
		waistFit := dimensionFit(user.Waist, m.WaistMin, m.WaistMax)
		hipFit := dimensionFit(user.Hip, m.HipMin, m.HipMax)

		score := chestFit*chestW + waistFit*waistW + hipFit*hipW
		t.Logf("Size %s: chest_fit=%.2f waist_fit=%.2f hip_fit=%.2f score=%.2f",
			sz, chestFit, waistFit, hipFit, score)

		if score > bestScore {
			bestScore = score
			bestSize = sz
		}
	}

	if bestSize != "XL" {
		t.Errorf("expected XL for chest=100 waist=80 hip=104, got %s", bestSize)
	}
	t.Logf("Best: %s with score %.2f", bestSize, bestScore)
}

func TestResolveChart_StandardWomen(t *testing.T) {
	chart := resolveChart(nil, nil, "female")
	if _, ok := chart["S"]; !ok {
		t.Error("expected S in women's chart")
	}
	// Verify S values match Malina Bonita
	s := chart["S"]
	if s.ChestMin != 86 || s.ChestMax != 90 {
		t.Errorf("S chest range wrong: %d-%d", s.ChestMin, s.ChestMax)
	}
}

func TestResolveChart_StandardMen(t *testing.T) {
	chart := resolveChart(nil, nil, "male")
	m := chart["M"]
	if m.ChestMin != 96 || m.ChestMax != 100 {
		t.Errorf("men's M chest range wrong: %d-%d", m.ChestMin, m.ChestMax)
	}
}
