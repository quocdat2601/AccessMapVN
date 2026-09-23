"""
services/nlp/phobert_classifier.py
------------------------------------
Vietnamese text classifier using PhoBERT.

Classifies a piece of text as either:
  - ``accessibility``     – the text discusses accessibility features
  - ``not_accessibility`` – the text is off-topic

PhoBERT is loaded from ``settings.phobert_model_path`` (a local directory
containing ``config.json`` + ``pytorch_model.bin`` + tokenizer files).

Stub mode
---------
If the model path does not exist the classifier falls back to a simple
keyword-matching heuristic so the service remains functional during
development without downloading the full model.
"""
from __future__ import annotations

from pathlib import Path

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Vietnamese accessibility keywords used by the keyword stub
_ACCESSIBILITY_KEYWORDS = [
    "ramp", "dốc", "bậc", "cầu thang", "thang máy", "thang cuốn",
    "cửa", "nhà vệ sinh", "toilet", "khuyết tật", "xe lăn",
    "tiếp cận", "hỗ trợ", "mù", "điếc", "người già", "cao tuổi",
    "xe đẩy", "nạng", "tay vịn", "lan can", "biển báo", "tactile",
    "lề đường", "vỉa hè",
]


class PhoBERTClassifier:
    """
    Classifies Vietnamese text as accessibility-related or not.

    Parameters
    ----------
    model_path:
        Path to a local PhoBERT fine-tuned classification model.
    """

    def __init__(self, model_path: str | None = None) -> None:
        self._model_path = model_path or settings.phobert_model_path
        self._pipeline   = None  # lazy-loaded

    # ── Model loading ──────────────────────────────────────────────────────────

    def _load_pipeline(self):
        """Load the HuggingFace text-classification pipeline (once)."""
        if self._pipeline is not None:
            return self._pipeline

        path = Path(self._model_path)
        if not path.exists():
            logger.warning(
                "PhoBERT model not found at '%s' – using keyword stub.", self._model_path
            )
            self._pipeline = _KeywordStub()
            return self._pipeline

        try:
            from transformers import pipeline as hf_pipeline

            logger.info("Loading PhoBERT classifier from %s …", self._model_path)
            self._pipeline = hf_pipeline(
                task="text-classification",
                model=self._model_path,
                tokenizer=self._model_path,
                device=-1,          # CPU; set to 0 for GPU
                top_k=None,         # return all label scores
            )
            logger.info("PhoBERT classifier loaded.")
        except Exception as exc:
            logger.exception("Failed to load PhoBERT: %s", exc)
            self._pipeline = _KeywordStub()

        return self._pipeline

    # ── Public API ─────────────────────────────────────────────────────────────

    def classify(self, text: str) -> dict:
        """
        Classify *text* as accessibility-related or not.

        Returns
        -------
        dict
            ``{"label": str, "confidence": float}``
            ``label`` is one of ``"accessibility"`` / ``"not_accessibility"``.
        """
        pipe = self._load_pipeline()

        if isinstance(pipe, _KeywordStub):
            return pipe.classify(text)

        # HuggingFace pipeline returns a list of [{"label": ..., "score": ...}]
        raw = pipe(text[:512])   # PhoBERT max seq length
        if raw and isinstance(raw[0], list):
            raw = raw[0]

        best = max(raw, key=lambda x: x["score"])
        return {
            "label":      best["label"].lower(),
            "confidence": round(float(best["score"]), 4),
        }


class _KeywordStub:
    """Simple keyword-based fallback classifier."""

    def classify(self, text: str) -> dict:
        lower = text.lower()
        hits  = sum(1 for kw in _ACCESSIBILITY_KEYWORDS if kw in lower)
        if hits >= 2:
            return {"label": "accessibility", "confidence": round(min(0.5 + hits * 0.05, 0.9), 4)}
        elif hits == 1:
            return {"label": "accessibility", "confidence": 0.55}
        return {"label": "not_accessibility", "confidence": 0.80}
