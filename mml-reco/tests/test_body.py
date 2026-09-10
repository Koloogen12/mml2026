import unittest

from passport.body import analyze_body, classify_body_shape


class TestBodyShape(unittest.TestCase):
    def test_hourglass(self):
        # balanced bust/hips, waist >=25% smaller
        shape, _ = classify_body_shape(bust=90, waist=66, hips=92)
        self.assertEqual(shape, "hourglass")

    def test_rectangle(self):
        # balanced bust/hips, waist NOT defined
        shape, _ = classify_body_shape(bust=88, waist=80, hips=90)
        self.assertEqual(shape, "rectangle")

    def test_pear(self):
        # hips clearly largest (>5%)
        shape, _ = classify_body_shape(bust=86, waist=70, hips=102)
        self.assertEqual(shape, "pear")

    def test_inverted_triangle(self):
        # upper clearly largest, waist not full
        shape, _ = classify_body_shape(bust=104, waist=80, hips=90)
        self.assertEqual(shape, "inverted_triangle")

    def test_apple(self):
        # upper largest AND full mid-section (waist >= bust)
        shape, _ = classify_body_shape(bust=96, waist=97, hips=88)
        self.assertEqual(shape, "apple")

    def test_shoulders_override_bust(self):
        # broad shoulders make upper dominate -> inverted triangle
        shape, _ = classify_body_shape(bust=88, waist=74, hips=90, shoulders=100)
        self.assertEqual(shape, "inverted_triangle")

    def test_spoon_subtype_on_pear(self):
        _, subtypes = classify_body_shape(bust=86, waist=70, hips=102, high_hip=112)
        self.assertIn("spoon", subtypes)


class TestFullBody(unittest.TestCase):
    def test_ratios_and_scale(self):
        r = analyze_body({
            "bust": 90, "waist": 66, "hips": 92,
            "height": 160, "inseam": 76, "wrist": 14,
        }, gender="female")
        self.assertEqual(r.body_shape, "hourglass")
        self.assertAlmostEqual(r.whr, round(66 / 92, 3))
        self.assertEqual(r.height_band, "petite")   # 160 < 163
        self.assertEqual(r.vertical_proportion, "long_torso_short_legs")  # 76/160 = 0.475 < 0.48
        self.assertIsNotNone(r.frame_size)

    def test_missing_optional_fields_ok(self):
        r = analyze_body({"bust": 88, "waist": 80, "hips": 90})
        self.assertEqual(r.body_shape, "rectangle")
        self.assertIsNone(r.height_band)
        self.assertIsNone(r.vertical_proportion)


if __name__ == "__main__":
    unittest.main()
