"""Style Passport computation core (deterministic, Tier-1).

Turns raw user inputs into structured passport features. No catalog, no LLM
required — this is the license-free, measurable backbone of the passport.
"""
from .body import analyze_body, classify_body_shape, BodyResult
from .color import analyze_color, ColorResult

__all__ = [
    "analyze_body", "classify_body_shape", "BodyResult",
    "analyze_color", "ColorResult",
]
