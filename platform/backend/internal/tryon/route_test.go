package tryon

import "testing"

func TestRouteModel(t *testing.T) {
	cases := []struct {
		items     int
		wantModel string
		wantCost  int
	}{
		{1, "flash", costFlashKopecks},
		{2, "flash", costFlashKopecks},
		{3, "pro", costProKopecks}, // с 3 вещей включается Pro (держит идентичность+позу)
		{5, "pro", costProKopecks},
	}
	for _, c := range cases {
		m, cost := routeModel(c.items)
		if m != c.wantModel || cost != c.wantCost {
			t.Errorf("%d вещей → (%s, %d), ждали (%s, %d)", c.items, m, cost, c.wantModel, c.wantCost)
		}
	}
}
