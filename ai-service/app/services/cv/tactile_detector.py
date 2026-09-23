"""
services/cv/tactile_detector.py
---------------------------------
YOLOv8-based tactile paving detector.

Tactile paving (blister / directional guidance tiles) helps visually
impaired users navigate safely.  This detector is optional for the MVP
but the inference interface is fully wired.
"""
from __future__ import annotations

from app.config import settings
from app.services.cv._base import BaseYOLODetector, DetectionResult


class TactileDetector(BaseYOLODetector):
    """Detects tactile paving / guidance tiles in images."""

    TARGET_CLASS: str = "tactile_paving"

    def __init__(self) -> None:
        weight_path = settings.yolo_weights_path["tactile"]
        super().__init__(weight_path=weight_path, target_class=self.TARGET_CLASS)

    def detect_tactile(self, image_bytes: bytes) -> dict:
        """
        Detect tactile paving tiles.

        Returns
        -------
        dict
            ``{"value": bool, "confidence": float}``
        """
        result: DetectionResult = self._detect(image_bytes)
        return {
            "value":      result.detected,
            "confidence": round(result.max_confidence, 4),
        }
