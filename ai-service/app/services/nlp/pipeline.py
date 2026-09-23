"""
services/nlp/pipeline.py
--------------------------
Orchestrates the NLP pipeline: classify → extract mentions → build summary.

The summary is a short Vietnamese sentence constructed from the extracted
mentions.  A production system would use a seq2seq model; for the MVP we
use template-based generation.
"""
from __future__ import annotations

from app.core.logging import get_logger
from app.services.nlp.mention_extractor import Mention, MentionExtractor
from app.services.nlp.phobert_classifier import PhoBERTClassifier

logger = get_logger(__name__)

# Template phrases for summary generation
_POSITIVE_TEMPLATES: dict[str, str] = {
    "exterior_ramp_present":    "có ramp tiếp cận",
    "steps_present":            "có bậc thang",
    "elevator_present":         "có thang máy",
    "door_width_ok":            "cửa đủ rộng",
    "accessible_restroom_sign": "có biển nhà vệ sinh dành cho người khuyết tật",
    "tactile_paving_present":   "có gạch tactile dẫn đường",
}
_NEGATIVE_TEMPLATES: dict[str, str] = {
    "exterior_ramp_present":    "không có ramp",
    "steps_present":            "không có bậc thang",
    "elevator_present":         "không có thang máy",
    "door_width_ok":            "cửa hẹp",
    "accessible_restroom_sign": "không có biển nhà vệ sinh tiếp cận",
    "tactile_paving_present":   "không có gạch tactile",
}


def _build_summary(mentions: list[Mention], is_accessibility: bool) -> str:
    """Build a short Vietnamese summary from extracted mentions."""
    if not is_accessibility or not mentions:
        return "Không có thông tin về khả năng tiếp cận."

    parts: list[str] = []
    for m in mentions:
        templates = _POSITIVE_TEMPLATES if m.value is True else _NEGATIVE_TEMPLATES
        phrase = templates.get(m.feature)
        if phrase:
            parts.append(phrase)

    if not parts:
        return "Có đề cập đến khả năng tiếp cận nhưng không rõ chi tiết."

    return "Địa điểm " + ", ".join(parts) + "."


class NLPPipeline:
    """
    Runs the full NLP pipeline on a Vietnamese text input.

    Usage::

        pipeline = NLPPipeline()
        result = pipeline.run("Có ramp nhưng cửa hơi hẹp, không có thang máy.")
    """

    def __init__(self) -> None:
        logger.info("Initialising NLP pipeline …")
        self._classifier = PhoBERTClassifier()
        self._extractor  = MentionExtractor()
        logger.info("NLP pipeline ready.")

    def run(self, text: str | None) -> dict | None:
        """
        Run classification and mention extraction on *text*.

        Parameters
        ----------
        text:
            Raw Vietnamese text.  Returns ``None`` if text is empty/None.

        Returns
        -------
        dict | None
            ``{"summary": str, "mentions": list[dict], "is_accessibility": bool,
               "classifier_confidence": float}``
        """
        if not text or not text.strip():
            return None

        logger.debug("NLP pipeline running on text of length %d", len(text))

        # Step 1: classify
        cls_result     = self._classifier.classify(text)
        is_access      = cls_result["label"] == "accessibility"
        cls_confidence = cls_result["confidence"]

        # Step 2: extract mentions (always run; useful even if off-topic)
        mentions: list[Mention] = self._extractor.extract(text)

        # Step 3: build summary
        summary = _build_summary(mentions, is_access)

        return {
            "summary":                summary,
            "is_accessibility":       is_access,
            "classifier_confidence":  cls_confidence,
            "mentions": [
                {
                    "feature":    m.feature,
                    "value":      m.value,
                    "confidence": m.confidence,
                    "snippet":    m.snippet,
                }
                for m in mentions
            ],
        }
