"""
services/cv/pipeline.py
------------------------
Orchestrates all CV detectors over a list of images and returns a unified
feature dict ready for scoring.

Design
------
* Each detector is instantiated once when ``CVPipeline`` is first created.
* For each image we run all detectors; results are aggregated by taking the
  **max confidence** observation across all images for each feature.
* The aggregated dict matches the ``FeaturesDict`` schema expected by the API.
"""
from __future__ import annotations

from app.config import settings
from app.core.logging import get_logger
from app.services.cv.door_estimator import DoorEstimator
from app.services.cv.ramp_detector import RampDetector
from app.services.cv.step_detector import StepDetector

logger = get_logger(__name__)

# Sentinel to represent "not seen yet"
_NOT_SEEN: dict = {"value": False, "confidence": 0.0}


def _merge(current: dict, new: dict) -> dict:
    """
    Keep the detection with the higher confidence between *current* and *new*.
    Handles optional extra keys (step_count_estimate, etc.).
    """
    if new.get("confidence", 0.0) > current.get("confidence", 0.0):
        return new
    return current


class CVPipeline:
    """
    Runs all CV detectors on a batch of images and aggregates results.

    Usage::

        pipeline = CVPipeline()
        results = pipeline.run([img_bytes_1, img_bytes_2])
    """

    def __init__(self) -> None:
        logger.info("Initialising CV pipeline detectors …")
        self._ramp = RampDetector()
        self._step = StepDetector()
        self._door = DoorEstimator()

        # Warm-up heavy models immediately so the first HTTP request is instantaneous (<0.2s)
        for detector in (self._ramp, self._step, self._door):
            if detector and hasattr(detector, "_load_model"):
                try:
                    detector._load_model()
                except Exception as exc:
                    logger.warning("Eager model warm-up skipped: %s", exc)

        logger.info(
            "CV pipeline ready | active detectors: ramp=%s, step=%s, door=%s",
            self._ramp._engine,
            self._step._engine,
            self._door._engine,
        )

    def run(self, images: list[bytes]) -> dict:
        """
        Run all detectors on every image and return aggregated features.

        Parameters
        ----------
        images:
            List of raw image byte strings (JPEG/PNG).

        Returns
        -------
        dict
            Keys match ``FeaturesDict`` field names:
            - exterior_ramp_present
            - steps_present        (also has step_count_estimate)
            - elevator_present
            - door_width_ok
            - accessible_restroom_sign
            - tactile_paving_present
            - _engines_used
        """
        # Initialise accumulators
        agg: dict[str, dict] = {
            "exterior_ramp_present":   {"value": "unknown", "confidence": 0.0, "method": "detector", "reason": "Chưa đủ dữ liệu để kết luận từ ảnh này"},
            "ramp_slope_compliant":    {"value": "unknown", "confidence": 0.0, "method": "unmeasured", "reason": "Cần đo đạc thực địa hoặc nhập kích thước chiều cao/chiều dài dốc"},
            "steps_present":           {"value": "unknown", "confidence": 0.0, "method": "detector", "reason": "Chưa đủ dữ liệu để kết luận từ ảnh này", "step_count_estimate": None},
            "elevator_present":        {"value": "unknown", "confidence": 0.0, "method": "unsupported", "reason": "Chưa hỗ trợ nhận diện đặc tính này trong ảnh"},
            "door_detected":           {"value": "unknown", "confidence": 0.0, "method": "detector", "reason": "Chưa đủ dữ liệu để kết luận từ ảnh này"},
            "door_width_compliant":    {"value": "unknown", "confidence": 0.0, "method": "unmeasured", "reason": "Không thể đo chiều rộng chính xác từ ảnh 2D đơn lẻ"},
            "door_width_ok":           {"value": "unknown", "confidence": 0.0, "method": "unmeasured", "reason": "Legacy field: chỉ suy ra từ số đo đã xác minh"},
            "accessible_restroom_sign": {"value": "unknown", "confidence": 0.0, "method": "unsupported", "reason": "Chưa hỗ trợ nhận diện đặc tính này trong ảnh"},
            "tactile_paving_present":  {"value": "unknown", "confidence": 0.0, "method": "unsupported", "reason": "Chưa hỗ trợ nhận diện đặc tính này trong ảnh"},
        }

        engines_used: set[str] = set()
        ramp_r: dict = {"status": "completed", "engine": "none"}
        step_r: dict = {"status": "completed", "engine": "none"}
        door_r: dict = {"status": "completed", "engine": "none"}

        for idx, img_bytes in enumerate(images):
            logger.debug("CV pipeline processing image %d/%d", idx + 1, len(images))
            try:
                import cv2
                import numpy as np
                arr = np.frombuffer(img_bytes, dtype=np.uint8)
                img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                target_input = img if img is not None else img_bytes

                ramp_r = self._ramp.detect_ramp(target_input)
                step_r = self._step.detect_steps(target_input)
                door_r = self._door.detect_door(target_input)

                for r in (ramp_r, step_r, door_r):
                    eng = r.get("engine")
                    if eng and eng not in ("none", "pending", "unavailable"):
                        engines_used.add(eng)

                agg["exterior_ramp_present"] = _merge(agg["exterior_ramp_present"], ramp_r)
                agg["steps_present"]         = _merge(agg["steps_present"], step_r)
                agg["door_detected"]          = _merge(agg["door_detected"], door_r)

            except Exception as exc:
                logger.exception("CV pipeline error on image %d: %s", idx, exc)

        # Anti-false positive rule: anti-slip chevron grooves or threshold joints on a verified ramp
        # should not be misclassified as stairs.
        ramp_conf = agg["exterior_ramp_present"].get("confidence", 0.0)
        step_conf = agg["steps_present"].get("confidence", 0.0)
        if ramp_conf >= 0.70 and step_conf < 0.68:
            logger.info("Suppressing marginal steps (conf=%.3f) on verified ramp (conf=%.3f)", step_conf, ramp_conf)
            agg["steps_present"] = {"value": "unknown", "confidence": 0.0, "method": "detector", "reason": "Triệt tiêu bậc thang giả trên lối ram dốc", "step_count_estimate": None}

        # Build fine-grained detector status breakdown
        detector_results = {
            "ramp": {
                "status": ramp_r.get("status", "completed"),
                "engine": ramp_r.get("engine", "none"),
                "error_code": ramp_r.get("error_code"),
            },
            "step": {
                "status": step_r.get("status", "completed"),
                "engine": step_r.get("engine", "none"),
                "error_code": step_r.get("error_code"),
            },
            "door": {
                "status": door_r.get("status", "completed"),
                "engine": door_r.get("engine", "none"),
                "error_code": door_r.get("error_code"),
            },
        }

        # Determine overall analysis status
        core_statuses = [d["status"] for d in detector_results.values()]
        completed_count = sum(1 for s in core_statuses if s == "completed")
        if completed_count == len(core_statuses):
            analysis_status = "completed"
        elif completed_count == 0:
            analysis_status = "failed"
        else:
            analysis_status = "partial"

        # Generate user-safe warnings for failed or unavailable detectors
        warnings: list[str] = []
        if detector_results["ramp"]["status"] == "failed":
            warnings.append("Không phân tích được ram dốc; vui lòng kiểm tra thủ công.")
        elif detector_results["ramp"]["status"] == "unavailable":
            warnings.append("Detector ram dốc hiện không khả dụng.")

        if detector_results["step"]["status"] == "failed":
            warnings.append("Không phân tích được bậc thang; vui lòng kiểm tra thủ công.")
        elif detector_results["step"]["status"] == "unavailable":
            warnings.append("Detector bậc thang hiện không khả dụng.")

        if detector_results["door"]["status"] == "failed":
            warnings.append("Không phân tích được cửa ra vào; vui lòng kiểm tra thủ công.")
        elif detector_results["door"]["status"] == "unavailable":
            warnings.append("Detector cửa ra vào hiện không khả dụng.")

        agg["_engines_used"] = list(engines_used)
        agg["_detector_results"] = detector_results
        agg["_analysis_status"] = analysis_status
        agg["_warnings"] = warnings

        logger.debug("CV pipeline aggregated results: %s", agg)
        return agg

    def get_readiness(self) -> dict:
        """Check readiness of required CV models for health probe."""
        required = {
            "ramp": self._ramp,
            "step": self._step,
            "door": self._door,
        }
        detectors_info: dict[str, dict] = {}
        all_loaded = True
        for name, det in required.items():
            det._load_model()
            loaded = det.model_loaded
            if not loaded:
                all_loaded = False
            detectors_info[name] = {
                "loaded": loaded,
                "engine": det._engine,
                "weights_sha256": det._weights_sha256,
            }
        return {
            "status": "ready" if all_loaded else "not_ready",
            "required_models_loaded": all_loaded,
            "detectors": detectors_info,
        }
