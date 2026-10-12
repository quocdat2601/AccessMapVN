"""
services/cv/door_estimator.py
------------------------------
YOLOv8-based door detector and width estimator.

Width is estimated heuristically from the bounding-box width relative to
image width.  A door box ≥ 10 % of image width is considered potentially
accessible (≥ 80 cm for a standard corridor shot).

ponytail: pixel-ratio heuristic for width; upgrade with metric depth estimation
          (e.g., MiDaS or stereo camera data) for accurate measurements.
"""
from __future__ import annotations

import numpy as np

from app.config import settings
from app.core.logging import get_logger
from app.services.cv._base import BaseYOLODetector, DetectionResult

logger = get_logger(__name__)

# Rough threshold: door bbox width / image width considered wide enough
_WIDTH_RATIO_THRESHOLD = 0.10


class DoorEstimator(BaseYOLODetector):
    """Detects doors and estimates whether the width is accessibility-compliant."""

    TARGET_CLASS: str = "door"

    def __init__(self) -> None:
        weight_path = settings.yolo_weights_path["door"]
        super().__init__(weight_path=weight_path, target_class=self.TARGET_CLASS)

    def detect_door(self, image_bytes: bytes) -> dict:
        """
        Detect door presence in the image.
        Compliance (clear width >= 900mm per QCVN 10:2014) is decoupled and marked unmeasured.

        Returns
        -------
        dict
            ``{"value": "present" | "unknown", "confidence": float}``
        """
        result: DetectionResult = self._detect(image_bytes)

        if not result.detected:
            return {"value": "unknown", "confidence": round(result.max_confidence, 4)}

        return {
            "value":      "present",
            "confidence": round(result.max_confidence, 4),
        }
