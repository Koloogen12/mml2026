"""Colorimetry -> season suggestion (Tier-1 features, Tier-2 label).

HONESTY BY DESIGN: seasonal color analysis has poor inter-rater reliability and
Eurocentric bias. So the engine truth is the *continuous* CIE-Lab-derived
features (undertone, value, chroma, contrast); the season *label* is a derived,
user-overridable suggestion carrying a confidence, not a diagnosis.

Inputs are CIE Lab triples (L 0..100, a/b ~ -128..127) for skin, hair, eyes,
extracted upstream by a face-parsing pipeline under controlled light. Use a
2-axis skin read (lightness + hue), NOT single-axis Fitzpatrick, and audit on
deep skin tones before trusting the label.

Season names are NOT standardized across schools (True/Cool/Deep vs ...), so we
emit a canonical key; alias mapping lives in the DB, not here.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, asdict
from typing import Optional, Tuple

Lab = Tuple[float, float, float]

# --- Tunable constants (need calibration on real, multi-tone data) -----------
WARM_RATIO = 1.35      # b/a >= => warm undertone
COOL_RATIO = 1.05      # b/a <= => cool undertone (between = neutral)
OLIVE_CHROMA = 14.0    # neutral + low chroma + moderate b => olive
VALUE_LIGHT = 60.0     # overall L >= => light coloring
VALUE_DEEP = 42.0      # overall L <= => deep coloring
CHROMA_BRIGHT = 22.0   # skin C* >= => bright/clear
CHROMA_MUTED = 14.0    # skin C* <= => soft/muted
CONTRAST_HIGH = 45.0   # L spread >= => high contrast
CONTRAST_LOW = 25.0    # L spread <= => low contrast


@dataclass
class ColorResult:
    # engine truth (continuous / categorical features)
    undertone: str          # warm|cool|neutral|olive
    value_level: str        # light|medium|deep
    chroma: str             # bright|medium|muted
    contrast_level: str     # high|medium|low
    skin_hue_deg: float
    skin_chroma: float
    overall_value: float
    contrast_spread: float
    # derived label (suggestion, not truth)
    season_key: str         # canonical, e.g. "winter_deep"
    season_family: str      # spring|summer|autumn|winter
    confidence: float       # 0..1 — how decisive the axes were

    def to_dict(self) -> dict:
        return asdict(self)


def _chroma(lab: Lab) -> float:
    _, a, b = lab
    return math.hypot(a, b)


def _undertone(skin: Lab) -> str:
    _, a, b = skin
    a = max(a, 1e-6)
    ratio = b / a
    c = _chroma(skin)
    if ratio >= WARM_RATIO:
        return "warm"
    if ratio <= COOL_RATIO:
        return "cool"
    # neutral band: olive if low-chroma with a yellow-green lean
    if c <= OLIVE_CHROMA and ratio > 1.0:
        return "olive"
    return "neutral"


def _season_family(undertone: str, skin: Lab, value_level: str) -> Tuple[str, str]:
    """Parent season from temperature x value. Returns (family, temp)."""
    _, a, b = skin
    if undertone == "warm":
        temp = "warm"
    elif undertone == "cool":
        temp = "cool"
    else:  # neutral / olive -> resolve by hue lean
        temp = "warm" if (b / max(a, 1e-6)) > 1.15 else "cool"
    light = value_level != "deep"  # medium counts as light-leaning for parent
    family = {
        ("warm", True): "spring",
        ("warm", False): "autumn",
        ("cool", True): "summer",
        ("cool", False): "winter",
    }[(temp, light)]
    return family, temp


# canonical sub-season per family, keyed by the dominant secondary axis
_SUBSEASON = {
    "spring": {"value": "spring_light", "hue": "spring_warm", "chroma": "spring_bright"},
    "summer": {"value": "summer_light", "hue": "summer_cool", "chroma": "summer_soft"},
    "autumn": {"chroma": "autumn_soft", "hue": "autumn_warm", "value": "autumn_deep"},
    "winter": {"value": "winter_deep", "hue": "winter_cool", "chroma": "winter_bright"},
}


def analyze_color(skin: Lab, hair: Optional[Lab] = None,
                  eyes: Optional[Lab] = None) -> ColorResult:
    """Main entrypoint. skin required; hair/eyes improve value & contrast."""
    labs = [x for x in (skin, hair, eyes) if x is not None]
    Ls = [l[0] for l in labs]
    overall_value = sum(Ls) / len(Ls)
    spread = (max(Ls) - min(Ls)) if len(Ls) > 1 else 0.0
    skin_c = _chroma(skin)
    hue_deg = math.degrees(math.atan2(skin[2], max(skin[1], 1e-6)))

    undertone = _undertone(skin)
    value_level = ("light" if overall_value >= VALUE_LIGHT
                   else "deep" if overall_value <= VALUE_DEEP else "medium")
    chroma = ("bright" if skin_c >= CHROMA_BRIGHT
              else "muted" if skin_c <= CHROMA_MUTED else "medium")
    contrast = ("high" if spread >= CONTRAST_HIGH
                else "low" if spread <= CONTRAST_LOW else "medium")

    family, _ = _season_family(undertone, skin, value_level)

    # pick sub-season by the most extreme secondary axis
    axis_strength = {
        "value": abs(overall_value - 51) / 51,          # distance from mid-lightness
        "chroma": abs(skin_c - 18) / 18,                 # distance from mid-chroma
        "hue": abs((skin[2] / max(skin[1], 1e-6)) - 1.2) / 1.2,  # warm/cool decisiveness
    }
    available = _SUBSEASON[family]
    dominant_axis = max((ax for ax in axis_strength if ax in available),
                        key=lambda ax: axis_strength[ax])
    season_key = available[dominant_axis]
    confidence = round(min(1.0, 0.4 + axis_strength[dominant_axis]), 2)

    return ColorResult(
        undertone=undertone,
        value_level=value_level,
        chroma=chroma,
        contrast_level=contrast,
        skin_hue_deg=round(hue_deg, 1),
        skin_chroma=round(skin_c, 1),
        overall_value=round(overall_value, 1),
        contrast_spread=round(spread, 1),
        season_key=season_key,
        season_family=family,
        confidence=confidence,
    )
