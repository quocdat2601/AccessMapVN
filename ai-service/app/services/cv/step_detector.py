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

    TARGET_CLASSES: tuple[str, ...] = ("step", "steps", "stairs", "staircase", "stair")

    def __init__(self, effective_conf_threshold: float | None = None) -> None:
        weight_path = settings.yolo_weights_path["step"]
        super().__init__(
            weight_path=weight_path,
            target_classes=self.TARGET_CLASSES,
            effective_conf_threshold=effective_conf_threshold,
        )

    def detect_steps(self, image_input: bytes | np.ndarray) -> dict:
        """
        Detect steps and estimate count from bounding-box count.

        Returns
        -------
        dict
            ``{"value": bool, "step_count_estimate": int | None, "confidence": float, "bbox_normalized": list | None, "engine": str}``
        """
        result: DetectionResult = self._detect(image_input)
        if result.status != "completed":
            return {
                "value":               False,
                "step_count_estimate": None,
                "confidence":          0.0,
                "bbox_normalized":     None,
                "engine":              result.engine,
                "status":              result.status,
                "error_code":          result.error_code,
            }

        if not result.detected or result.max_confidence < self.effective_conf_threshold:
            return {
                "value":               False,
                "step_count_estimate": None,
                "confidence":          0.0,
                "bbox_normalized":     None,
                "engine":              result.engine,
                "status":              result.status,
                "error_code":          result.error_code,
            }

        step_count = result.count if result.detected else None
        bbox = result.boxes_normalized[0] if result.boxes_normalized else None

        return {
            "value":               result.detected,
            "step_count_estimate": step_count,
            "confidence":          round(result.max_confidence, 4),
            "bbox_normalized":     bbox,
            "engine":              result.engine,
            "status":              result.status,
            "error_code":          result.error_code,
        }
