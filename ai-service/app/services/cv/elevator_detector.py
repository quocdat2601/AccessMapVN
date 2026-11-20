"""
services/cv/elevator_detector.py
----------------------------------
YOLOv8-based elevator / lift detector.
"""
from __future__ import annotations

import numpy as np

from app.config import settings
from app.services.cv._base import BaseYOLODetector, DetectionResult


class ElevatorDetector(BaseYOLODetector):
    """Detects the presence of an elevator or lift in an image."""

    TARGET_CLASS: str = "elevator"

    def __init__(self) -> None:
        weight_path = settings.yolo_weights_path["elevator"]
        super().__init__(
            weight_path=weight_path,
            target_class=self.TARGET_CLASS,
            effective_conf_threshold=settings.yolo_elevator_conf_threshold,
        )

    def detect_elevator(self, image_input: bytes | np.ndarray) -> dict:
        """
        Detect an elevator in the image.

        Returns
        -------
        dict
            ``{"value": bool, "confidence": float, "bbox_normalized": list | None, "engine": str, "status": str, "error_code": str | None}``
        """
        result: DetectionResult = self._detect(image_input)
        bbox = result.boxes_normalized[0] if result.boxes_normalized else None
        return {
            "value":           result.detected,
            "confidence":      round(result.max_confidence, 4),
            "bbox_normalized": bbox,
            "engine":          result.engine,
            "status":          result.status,
            "error_code":      result.error_code,
        }
