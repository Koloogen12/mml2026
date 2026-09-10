import unittest

from passport.color import analyze_color


class TestColor(unittest.TestCase):
    def test_warm_light_bright_is_spring(self):
        # light golden coloring: light skin + light hair (overall L high), warm hue
        r = analyze_color(skin=(72, 12, 24), hair=(66, 8, 20), eyes=(58, -2, 8))
        self.assertEqual(r.undertone, "warm")
        self.assertEqual(r.value_level, "light")
        self.assertEqual(r.season_family, "spring")
        self.assertTrue(r.season_key.startswith("spring_"))

    def test_cool_deep_is_winter(self):
        # deep cool coloring: low L overall, a >= b (pink/blue lean)
        r = analyze_color(skin=(40, 16, 15), hair=(12, 1, 2), eyes=(20, 0, 3))
        self.assertEqual(r.undertone, "cool")
        self.assertEqual(r.value_level, "deep")
        self.assertEqual(r.season_family, "winter")
        # high-contrast winter (light skin + very dark hair) is a *separate* case:
        r2 = analyze_color(skin=(68, 8, 10), hair=(10, 1, 2), eyes=(22, 0, 3))
        self.assertEqual(r2.contrast_level, "high")

    def test_features_always_present(self):
        r = analyze_color(skin=(55, 14, 18))
        for field in ("undertone", "value_level", "chroma", "contrast_level",
                      "season_key", "season_family"):
            self.assertTrue(getattr(r, field))
        self.assertGreaterEqual(r.confidence, 0.0)
        self.assertLessEqual(r.confidence, 1.0)

    def test_olive_undertone(self):
        # neutral band, low chroma, slight yellow-green lean
        r = analyze_color(skin=(50, 11, 12))
        self.assertIn(r.undertone, ("olive", "neutral"))


if __name__ == "__main__":
    unittest.main()
