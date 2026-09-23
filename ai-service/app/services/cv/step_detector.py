"""
services/cv/step_detector.py
------------------------------
YOLOv8-based staircase / step detector.

The model is expected to detect objects of class ``"step"`` or ``"staircase"``.
After detection, a rough step-count estimate is derived from the number of
bounding boxes (each box ≈ one step cluster; more sophisticated counting
would use segmentation masks or depth estimation).
"""
from __future__ import annotations

from app.config import settings
from app.core.logging import get_logger
from app.services.cv._base import BaseYOLODetector, DetectionResult

logger = get_logger(__name__)


class StepDetector(BaseYOLODetector):
    """Detects staircases / steps and estimates their count."""

    TARGET_CLASS: str = "step"

    def __init__(self) -> None:
        weight_path = settings.yolo_weights_path["step"]
        super().__init__(weight_path=weight_path, target_class=self.TARGET_CLASS)

    def detect_steps(self, image_bytes: bytes) -> dict:
        """
        Detect steps and estimate count from bounding-box count.

        Returns
        -------
        dict
            ``{"value": bool, "step_count_estimate": int | None, "confidence": float}``
        """
        result: DetectionResult = self._detect(image_bytes)

        # ponytail: step_count_estimate from box count is a rough heuristic;
        # upgrade with segmentation or depth-based counting for production.
        step_count = result.count if result.detected else None

        return {
            "value":               result.detected,
            "step_count_estimate": step_count,
            "confidence":          round(result.max_confidence, 4),
        }
