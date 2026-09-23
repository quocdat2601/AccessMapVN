"""
services/cv/signage_detector.py
---------------------------------
YOLOv8-based accessible restroom signage detector.

The model is trained to recognise the international wheelchair symbol and
similar accessible-restroom signage commonly found in Vietnamese public places.
"""
from __future__ import annotations

from app.config import settings
from app.services.cv._base import BaseYOLODetector, DetectionResult


class SignageDetector(BaseYOLODetector):
    """Detects accessible restroom / disability signage in images."""

    TARGET_CLASS: str = "accessibility_sign"

    def __init__(self) -> None:
        weight_path = settings.yolo_weights_path["signage"]
        super().__init__(weight_path=weight_path, target_class=self.TARGET_CLASS)

    def detect_signage(self, image_bytes: bytes) -> dict:
        """
        Detect accessible restroom or wheelchair signage.

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
