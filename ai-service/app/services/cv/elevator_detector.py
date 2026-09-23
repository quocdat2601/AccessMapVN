"""
services/cv/elevator_detector.py
----------------------------------
YOLOv8-based elevator / lift detector.
"""
from __future__ import annotations

from app.config import settings
from app.services.cv._base import BaseYOLODetector, DetectionResult


class ElevatorDetector(BaseYOLODetector):
    """Detects the presence of an elevator or lift in an image."""

    TARGET_CLASS: str = "elevator"

    def __init__(self) -> None:
        weight_path = settings.yolo_weights_path["elevator"]
        super().__init__(weight_path=weight_path, target_class=self.TARGET_CLASS)

    def detect_elevator(self, image_bytes: bytes) -> dict:
        """
        Detect an elevator in the image.

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
