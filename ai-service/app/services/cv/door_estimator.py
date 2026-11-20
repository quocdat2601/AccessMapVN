"""
services/cv/door_estimator.py
------------------------------
YOLOv8-based entrance/door detector.

Presence is detected via YOLOv8 (`door`, `entrance-door`); physical clear-width
compliance (>= 900 mm per QCVN 10:2014) is recorded separately from user
measurements rather than inferred from pixel ratios.
"""
from __future__ import annotations

import numpy as np

from app.config import settings
from app.core.logging import get_logger
from app.services.cv._base import BaseYOLODetector, DetectionResult

logger = get_logger(__name__)


class DoorEstimator(BaseYOLODetector):
    """Detects doors and estimates whether the width is accessibility-compliant."""

    TARGET_CLASSES: tuple[str, ...] = ("door", "entrance-door")

    def __init__(self) -> None:
        weight_path = settings.yolo_weights_path["door"]
        super().__init__(weight_path=weight_path, target_classes=self.TARGET_CLASSES)

    def detect_door(self, image_input: bytes | np.ndarray) -> dict:
        """
        Detect door presence in the image.
        Compliance (clear width >= 900mm per QCVN 10:2014) is decoupled and marked unmeasured.

        Returns
        -------
        dict
            ``{"value": "present" | "unknown", "confidence": float}``
        """
        result: DetectionResult = self._detect(image_input)

        if not result.detected or result.status != "completed":
            return {
                "value":           "unknown",
                "confidence":      round(result.max_confidence, 4),
                "bbox_normalized": None,
                "engine":          result.engine,
                "status":          result.status,
                "error_code":      result.error_code,
            }

        bbox = result.boxes_normalized[0] if result.boxes_normalized else None
        return {
            "value":           "present",
            "confidence":      round(result.max_confidence, 4),
            "bbox_normalized": bbox,
            "engine":          result.engine,
            "status":          result.status,
            "error_code":      result.error_code,
        }
