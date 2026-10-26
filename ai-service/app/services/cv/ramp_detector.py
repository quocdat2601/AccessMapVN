"""
services/cv/ramp_detector.py
-----------------------------
YOLOv8-based ramp detector.

Expected classes in the model: ["ramp"] (class index 0).
The model file lives at ``models/yolo/ramp.pt``.
"""
from __future__ import annotations

import io
from pathlib import Path

import numpy as np

from app.config import settings
from app.core.logging import get_logger
from app.services.cv._base import BaseYOLODetector, DetectionResult

logger = get_logger(__name__)


class RampDetector(BaseYOLODetector):
    """Detects accessibility ramps in images using a fine-tuned YOLOv8 model."""

    TARGET_CLASS: str = "ramp"

    def __init__(self) -> None:
        weight_path = settings.yolo_weights_path["ramp"]
        super().__init__(weight_path=weight_path, target_class=self.TARGET_CLASS)

    def detect_ramp(self, image_input: bytes | np.ndarray) -> dict:
        """
        Run ramp detection on a single image.

        Parameters
        ----------
        image_bytes:
            Raw JPEG/PNG bytes of the image.

        Returns
        -------
        dict
            ``{"value": bool, "confidence": float}``
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
