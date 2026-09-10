"""Body analysis — deterministic, measurement-driven (Tier 1).

Encodes the widely-accepted, license-free body model: horizontal shape via the
5% balance / 25% waist-definition thresholds, vertical proportion, and scale.
We store the continuous ratios as the engine truth; the shape *label* is a
derived, human-readable convenience. Kibbe and other gestalt typologies are a
separate optional self-ID layer and deliberately NOT computed here.

Sources: theconceptwardrobe body-shape rules; FFIT (Simmons/Istook) for the
9-shape subtypes. Thresholds are conventions, not standards — keep them here as
named constants so they stay tunable and auditable.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Optional

# --- Tunable rule constants (conventions, not laws) --------------------------
BALANCE_TOL = 0.05     # |upper - hips| within 5% of the larger => "balanced"
WAIST_DEFINED = 0.75   # waist <= 75% of the smaller of upper/hips => defined (>=25% smaller)
APPLE_WAIST = 0.95     # waist >= 95% of upper (mid-section full) => apple vs inverted-triangle
HIGH_HIP_SHELF = 1.06  # high_hip / hips ratio that flags a spoon/figure-8 shelf


@dataclass
class BodyResult:
    # engine truth (continuous)
    whr: float                      # waist-to-hip
    waist_to_bust: float
    shoulder_to_hip: float
    leg_to_height: Optional[float]
    wrist_to_height: Optional[float]
    # derived labels (Tier-2 convenience, user-overridable)
    body_shape: str                 # hourglass|pear|apple|rectangle|inverted_triangle
    subtypes: list                  # e.g. ["spoon"], ["figure_8"]
    vertical_proportion: Optional[str]  # short_torso_long_legs|balanced|long_torso_short_legs
    height_band: Optional[str]      # petite|average|tall
    frame_size: Optional[str]       # small|medium|large
    scale: Optional[str]            # small|medium|large (height x frame)

    def to_dict(self) -> dict:
        return asdict(self)


# Height bands are gender-dependent; defaults for women's market (cm).
_HEIGHT_BANDS = {
    "female": (163, 173),   # < petite, > tall
    "male":   (170, 183),
    "unisex": (166, 178),
}


def classify_body_shape(bust: float, waist: float, hips: float,
                        shoulders: Optional[float] = None,
                        high_hip: Optional[float] = None) -> tuple:
    """Return (shape, subtypes) from circumference measurements (same unit)."""
    upper = max(bust, shoulders) if shoulders else bust
    smaller = min(upper, hips)
    balanced = abs(upper - hips) / max(upper, hips) <= BALANCE_TOL
    waist_defined = waist <= WAIST_DEFINED * smaller

    subtypes: list = []
    if high_hip and hips and high_hip / hips >= HIGH_HIP_SHELF:
        subtypes.append("spoon")

    if balanced:
        shape = "hourglass" if waist_defined else "rectangle"
    elif hips >= (1 + BALANCE_TOL) * upper:
        shape = "pear"                       # hips clearly largest
    else:                                     # upper clearly largest
        if waist >= APPLE_WAIST * upper:
            shape = "apple"                   # full mid-section, no defined waist
        else:
            shape = "inverted_triangle"

    if shape == "hourglass" and "spoon" in subtypes:
        subtypes = [s for s in subtypes if s != "spoon"] + ["figure_8"]
    return shape, subtypes


def _vertical_proportion(height: Optional[float], inseam: Optional[float],
                        leg_to_height: Optional[float]) -> tuple:
    """Return (label, leg_to_height ratio). Legs ~half of height = balanced."""
    ratio = leg_to_height
    if ratio is None and height and inseam:
        ratio = inseam / height
    if ratio is None:
        return None, None
    if ratio > 0.52:
        return "short_torso_long_legs", ratio
    if ratio < 0.48:
        return "long_torso_short_legs", ratio
    return "balanced", ratio


def _scale(height: Optional[float], wrist: Optional[float],
          gender: str) -> tuple:
    """Return (height_band, frame_size, scale, wrist_to_height)."""
    band = frame = None
    wth = None
    if height:
        low, high = _HEIGHT_BANDS.get(gender, _HEIGHT_BANDS["unisex"])
        band = "petite" if height < low else "tall" if height > high else "average"
    if height and wrist:
        wth = wrist / height
        # frame from wrist-to-height ratio (women's rough anchors)
        frame = "small" if wth < 0.095 else "large" if wth > 0.11 else "medium"
    scale = None
    if band and frame:
        order = {"petite": 0, "average": 1, "tall": 2,
                 "small": 0, "medium": 1, "large": 2}
        combined = round((order[band] + order[frame]) / 2)
        scale = ["small", "medium", "large"][combined]
    return band, frame, scale, wth


def analyze_body(measurements: dict, gender: str = "female") -> BodyResult:
    """Main entrypoint.

    measurements keys (same unit, cm): bust, waist, hips, [shoulders,
    high_hip, height, inseam, wrist].
    """
    bust = measurements["bust"]
    waist = measurements["waist"]
    hips = measurements["hips"]
    shoulders = measurements.get("shoulders")
    high_hip = measurements.get("high_hip")
    height = measurements.get("height")
    inseam = measurements.get("inseam")
    wrist = measurements.get("wrist")

    shape, subtypes = classify_body_shape(bust, waist, hips, shoulders, high_hip)
    vprop, l2h = _vertical_proportion(height, inseam,
                                      measurements.get("leg_to_height"))
    band, frame, scale, wth = _scale(height, wrist, gender)

    upper = max(bust, shoulders) if shoulders else bust
    return BodyResult(
        whr=round(waist / hips, 3),
        waist_to_bust=round(waist / bust, 3),
        shoulder_to_hip=round(upper / hips, 3),
        leg_to_height=round(l2h, 3) if l2h else None,
        wrist_to_height=round(wth, 4) if wth else None,
        body_shape=shape,
        subtypes=subtypes,
        vertical_proportion=vprop,
        height_band=band,
        frame_size=frame,
        scale=scale,
    )
