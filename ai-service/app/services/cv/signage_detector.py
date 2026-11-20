"""
services/cv/signage_detector.py
---------------------------------
YOLOv8-based accessible restroom signage detector.

The model is trained to recognise the international wheelchair symbol and
similar accessible-restroom signage commonly found in Vietnamese public places.
"""
from __future__ import annotations

import numpy as np

from app.config import settings
from app.services.cv._base import BaseYOLODetector, DetectionResult


class SignageDetector(BaseYOLODetector):
    """Detects accessible restroom / disability signage or fixtures in images."""

    TARGET_CLASSES: tuple[str, ...] = ("toilet", "wheelchair_logo", "accessibility_sign")

    def __init__(self) -> None:
        weight_path = settings.yolo_weights_path["signage"]
        super().__init__(weight_path=weight_path, target_classes=self.TARGET_CLASSES)

    def detect_signage(self, image_input: bytes | np.ndarray) -> dict:
        """
        Detect accessible restroom fixtures or wheelchair signage.

        Returns
        -------
        dict
            ``{"value": bool, "confidence": float, "bbox_normalized": list | None, "restroom_fixture_detected": bool, "engine": str, "status": str, "error_code": str | None}``
        """
        result: DetectionResult = self._detect(image_input)
        bbox = result.boxes_normalized[0] if result.boxes_normalized else None
        detected_labels = {c.lower() for c in result.class_names}
        restroom_fixture_detected = "toilet" in detected_labels
        return {
            "value":                     result.detected,
            "confidence":                round(result.max_confidence, 4),
            "bbox_normalized":           bbox,
            "restroom_fixture_detected": restroom_fixture_detected,
            "engine":                    result.engine,
            "status":                    result.status,
            "error_code":                result.error_code,
        }
