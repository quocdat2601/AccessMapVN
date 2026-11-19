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
    start: int = 0
    end: int = 0


# ── Rule patterns ──────────────────────────────────────────────────────────────
#
# Each entry: (feature_key, value, confidence, [regex patterns])
# Negative rules precede positive rules per feature so negations like
# "không có đường dốc tiếp cận" are never misclassified as positive.
#
_RULES: list[tuple[str, bool | str, float, list[str]]] = [
    # Ramp negative
    (
        "exterior_ramp_present", False, 0.85,
        [
            r"(?:không|chưa|chẳng)\s+(?:hề\s+|thấy\s+|còn\s+)?(?:có\s+)?(?:ramp|ram\s+dốc|đường\s+dốc(?:\s+tiếp\s+cận)?|lối\s+dốc|dốc)",
            r"thiếu\s+(?:ramp|ram\s+dốc|đường\s+dốc|lối\s+dốc)",
        ],
    ),
    # Ramp positive
    (
        "exterior_ramp_present", True, 0.80,
        [
            r"(?<!không\s)(?<!chưa\s)(?<!chẳng\s)(?<!thiếu\s)\bcó\s+(?:ramp|ram\s+dốc|đường\s+dốc|lối\s+dốc)",
            r"(?<!không\s)(?<!chưa\s)(?<!chẳng\s)(?<!có\s)\b(?:ramp\s+(?:lối|vào|ra|bên|tiếp\s+cận)|đường\s+dốc\s+tiếp\s+cận|ram\s+dốc)",
        ],
    ),
    # Steps negative
    (
        "steps_present", False, 0.80,
        [
            r"(?:không|chưa|chẳng)\s+(?:hề\s+|thấy\s+|còn\s+)?(?:có\s+)?(?:bậc(?:\s+thang|\s+thềm|\s+tam\s+cấp)?|cầu\s+thang)",
            r"bằng\s+phẳng\s*,?\s*không\s+bậc",
        ],
    ),
    # Steps positive
    (
        "steps_present", True, 0.78,
        [
            r"(?<!không\s)(?<!chưa\s)(?<!chẳng\s)\bcó\s+(?:bậc(?:\s+thang|\s+thềm|\s+tam\s+cấp)?|cầu\s+thang)",
            r"\bnhiều\s+bậc",
            r"(?<!không\s)(?<!có\s)\bbậc\s+(?:thềm|tam\s+cấp|thang)",
        ],
    ),
    # Elevator negative
    (
        "elevator_present", False, 0.82,
        [
            r"(?:không|chưa|chẳng|thiếu)\s+(?:hề\s+|thấy\s+|còn\s+)?(?:có\s+)?thang\s+máy(?:\s+(?:cho|dành)\s+[^\.,;]+)?",
        ],
    ),
    # Elevator positive
    (
        "elevator_present", True, 0.82,
        [
            r"(?<!không\s)(?<!chưa\s)(?<!chẳng\s)\bcó\s+thang\s+máy",
            r"\bthang\s+máy\s+(?:hoạt\s+động|rộng|dành|cho|tiếp\s+cận)",
        ],
    ),
    # Door narrow
    (
        "door_width_ok", False, 0.75,
        [
            r"cửa\s+(?:hơi\s+|rất\s+|khá\s+|quá\s+)?(?:hẹp|nhỏ|chật)",
            r"cửa\s+(?:không|chưa)\s+(?:đủ\s+)?rộng",
        ],
    ),
    # Door OK
    (
        "door_width_ok", True, 0.70,
        [
            r"cửa\s+(?:khá\s+|rất\s+)?(?:đủ\s+)?rộng",
            r"cửa\s+to",
        ],
    ),
    # Accessible restroom signage negative
    (
        "accessible_restroom_sign", False, 0.78,
        [
            r"(?:không|chưa|chẳng|thiếu)\s+(?:hề\s+|thấy\s+)?(?:có\s+)?biển\s+(?:nhà\s+vệ\s+sinh|toilet|wc)(?:\s+(?:khuyết\s+tật|người\s+khuyết|tiếp\s+cận))?",
            r"(?:không|chưa|chẳng|thiếu)\s+(?:hề\s+|thấy\s+)?(?:có\s+)?(?:nhà\s+vệ\s+sinh|toilet|wc)\s+(?:tiếp\s+cận|dành\s+cho|khuyết\s+tật)",
        ],
    ),
    # Accessible restroom signage positive
    (
        "accessible_restroom_sign", True, 0.75,
        [
            r"(?<!không\s)(?<!chưa\s)\bcó\s+biển\s+(?:nhà\s+vệ\s+sinh|toilet|wc)\s+(?:khuyết\s+tật|người\s+khuyết|tiếp\s+cận)",
            r"(?<!không\s)(?<!chưa\s)\bcó\s+(?:nhà\s+vệ\s+sinh|toilet|wc)\s+(?:tiếp\s+cận|dành\s+cho)",
        ],
    ),
    # Tactile paving negative
    (
        "tactile_paving_present", False, 0.75,
        [
            r"(?:không|chưa|chẳng|thiếu)\s+(?:hề\s+|thấy\s+)?(?:có\s+)?(?:gạch\s+tactile|vỉa\s+hè\s+nổi|lối\s+dẫn\s+(?:hướng\s+)?cho\s+người\s+mù|gạch\s+nổi)",
        ],
    ),
    # Tactile paving positive
    (
        "tactile_paving_present", True, 0.72,
        [
            r"(?<!không\s)(?<!chưa\s)\bcó\s+(?:gạch\s+tactile|vỉa\s+hè\s+nổi|lối\s+dẫn\s+(?:hướng\s+)?cho\s+người\s+mù|gạch\s+nổi)",
        ],
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
                        start=m.start(),
                        end=m.end(),
                    )
                    break

        return list(mentions.values())
