"""
services/nlp/mention_extractor.py
------------------------------------
Extracts accessibility feature mentions from Vietnamese free text.

Approach (MVP)
--------------
Rule-based pattern matching with confidence scores calibrated for common
Vietnamese phrasing.  Each pattern maps to one of the canonical feature keys.

When a fine-tuned NER / relation-extraction model is available, swap the
``_RuleExtractor`` with a ``PhoBERTNERExtractor`` following the same interface.

ponytail: rule-based extraction – replace with a PhoBERT NER model for
          higher recall and handling of unseen phrasings.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class Mention:
    """A single extracted feature mention from the text."""
    feature: str        # canonical feature key
    value: bool | str   # detected value
    confidence: float   # extraction confidence 0–1
    snippet: str = ""   # matched text fragment


# ── Rule patterns ──────────────────────────────────────────────────────────────
#
# Each entry: (feature_key, value, confidence, [regex patterns])
# Patterns are tried in order; first match wins for that feature.
#
_RULES: list[tuple[str, bool | str, float, list[str]]] = [
    # Ramp positive
    (
        "exterior_ramp_present", True, 0.80,
        [
            r"có\s+ramp", r"có\s+đường\s+dốc", r"có\s+lối\s+dốc",
            r"ramp\s+(?:lối|vào|ra|bên)", r"đường\s+dốc\s+tiếp\s+cận",
        ],
    ),
    # Ramp negative
    (
        "exterior_ramp_present", False, 0.80,
        [
            r"không\s+(?:có)?\s*ramp", r"không\s+(?:có)?\s*đường\s+dốc",
            r"không\s+(?:có)?\s*dốc", r"chưa\s+(?:có)?\s*dốc", r"chưa\s+(?:có)?\s*ramp",
        ],
    ),
    # Steps positive
    (
        "steps_present", True, 0.78,
        [r"có\s+bậc", r"có\s+cầu\s+thang", r"nhiều\s+bậc", r"bậc\s+thềm"],
    ),
    # Steps negative
    (
        "steps_present", False, 0.75,
        [r"không\s+(?:có)?\s*bậc", r"không\s+(?:có)?\s*cầu\s+thang"],
    ),
    # Elevator positive
    (
        "elevator_present", True, 0.82,
        [r"có\s+thang\s+máy", r"thang\s+máy\s+hoạt\s+động", r"thang\s+máy\s+(?:cho|dành)"],
    ),
    # Elevator negative
    (
        "elevator_present", False, 0.82,
        [r"không\s+(?:có)?\s*thang\s+máy", r"chưa\s+(?:có)?\s*thang\s+máy"],
    ),
    # Door OK
    (
        "door_width_ok", True, 0.70,
        [r"cửa\s+rộng", r"cửa\s+đủ\s+rộng", r"cửa\s+to"],
    ),
    # Door narrow
    (
        "door_width_ok", False, 0.72,
        [r"cửa\s+(?:hơi\s+)?hẹp", r"cửa\s+nhỏ", r"cửa\s+chật"],
    ),
    # Accessible restroom signage
    (
        "accessible_restroom_sign", True, 0.75,
        [r"có\s+biển\s+(?:nhà\s+vệ\s+sinh|toilet)\s+(?:khuyết\s+tật|người\s+khuyết)",
         r"có\s+nhà\s+vệ\s+sinh\s+(?:tiếp\s+cận|dành\s+cho)"],
    ),
    (
        "accessible_restroom_sign", False, 0.70,
        [r"không\s+(?:có)?\s*biển\s+(?:nhà\s+vệ\s+sinh|wc)",
         r"không\s+(?:có)?\s*nhà\s+vệ\s+sinh\s+(?:tiếp\s+cận|dành\s+cho)"],
    ),
    # Tactile paving
    (
        "tactile_paving_present", True, 0.72,
        [r"có\s+gạch\s+tactile", r"có\s+vỉa\s+hè\s+nổi", r"có\s+lối\s+dẫn\s+cho\s+người\s+mù"],
    ),
    (
        "tactile_paving_present", False, 0.70,
        [r"không\s+(?:có)?\s*gạch\s+tactile", r"không\s+(?:có)?\s*vỉa\s+hè\s+nổi"],
    ),
]


class MentionExtractor:
    """
    Extracts accessibility feature mentions from Vietnamese text using rules.

    Returns one ``Mention`` per feature (the first matched rule wins).
    """

    def __init__(self) -> None:
        # Pre-compile all patterns
        self._compiled: list[tuple[str, bool | str, float, list[re.Pattern]]] = [
            (feat, val, conf, [re.compile(p, re.IGNORECASE | re.UNICODE) for p in patterns])
            for feat, val, conf, patterns in _RULES
        ]

    def extract(self, text: str) -> list[Mention]:
        """
        Extract feature mentions from *text*.

        Parameters
        ----------
        text:
            Raw Vietnamese text input.

        Returns
        -------
        list[Mention]
            One entry per feature found.  Features not mentioned are omitted.
        """
        mentions: dict[str, Mention] = {}

        for feature, value, confidence, compiled_patterns in self._compiled:
            if feature in mentions:
                continue  # already matched a rule for this feature
            for pattern in compiled_patterns:
                m = pattern.search(text)
                if m:
                    mentions[feature] = Mention(
                        feature=feature,
                        value=value,
                        confidence=confidence,
                        snippet=m.group(0),
                    )
                    break

        return list(mentions.values())
