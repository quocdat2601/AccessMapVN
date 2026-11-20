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
from app.services.cv._base import BaseYOLODetector
from app.services.cv.door_estimator import DoorEstimator
from app.services.cv.elevator_detector import ElevatorDetector
from app.services.cv.ramp_detector import RampDetector
from app.services.cv.signage_detector import SignageDetector
from app.services.cv.step_detector import StepDetector

logger = get_logger(__name__)

# Sentinel to represent "not seen yet"
_NOT_SEEN: dict = {"value": False, "confidence": 0.0}

_OFF_DOMAIN_COCO_CLASSES: frozenset[str] = frozenset({
    "keyboard", "laptop", "mouse", "tv", "cell phone", "remote",
    "book", "bed", "couch", "dining table", "cup", "bowl", "bottle",
    "wine glass", "fork", "knife", "spoon", "pizza", "cake",
    "sandwich", "donut", "teddy bear", "toothbrush", "hair drier", "scissors",
})
_STRONG_DESK_SCREEN_CLASSES: frozenset[str] = frozenset({
    "keyboard", "laptop", "tv", "cell phone", "book", "bed",
})
_MARGINAL_PRIMARY_CONF = 0.65


def _is_digital_screenshot(bgr) -> bool:
    """Detect stark pure-white digital UI/document screenshots (>=30% exact-flat white)."""
    if getattr(bgr, "ndim", 0) != 3 or bgr.shape[0] < 16 or bgr.shape[1] < 16:
        return False
    white = (bgr[:, :, 0] >= 250) & (bgr[:, :, 1] >= 250) & (bgr[:, :, 2] >= 250)
    flat_h = (
        (bgr[:, 1:, 0] == bgr[:, :-1, 0])
        & (bgr[:, 1:, 1] == bgr[:, :-1, 1])
        & (bgr[:, 1:, 2] == bgr[:, :-1, 2])
    )
    return float((white[:, 1:] & flat_h).mean()) >= 0.30


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
        ramp_fb_path = settings.yolo_weights_path["ramp_fallback"]
        self._ramp_fallback: BaseYOLODetector | None = (
            BaseYOLODetector(
                weight_path=ramp_fb_path,
                target_class="ramp",
                effective_conf_threshold=settings.yolo_ramp_fallback_conf_threshold,
            )
            if ramp_fb_path != self._ramp._weight_path and ramp_fb_path.exists()
            else None
        )
        self._step = StepDetector()
        self._door = DoorEstimator()
        self._elevator = ElevatorDetector()
        self._signage = SignageDetector()
        self._ood_model = None
        ood_path = settings.yolo_weights_path.get("ood")
        if ood_path and ood_path.exists():
            try:
                from ultralytics import YOLO
                self._ood_model = YOLO(str(ood_path))
                logger.info("Loaded OOD pre-filter weights from %s", ood_path)
            except Exception as exc:
                logger.warning("Failed to load OOD pre-filter weights: %s", exc)

        # Warm-up heavy models immediately so the first HTTP request is instantaneous (<0.2s)
        for detector in (
            self._ramp,
            self._ramp_fallback,
            self._step,
            self._door,
            self._elevator,
            self._signage,
        ):
            if detector and hasattr(detector, "_load_model"):
                try:
                    detector._load_model()
                except Exception as exc:
                    logger.warning("Eager model warm-up skipped: %s", exc)

        logger.info(
            "CV pipeline ready | active detectors: ramp=%s, step=%s, door=%s, elevator=%s, signage=%s",
            self._ramp._engine,
            self._step._engine,
            self._door._engine,
            self._elevator._engine,
            self._signage._engine,
        )

    def _is_off_domain_scene(self, target_input) -> tuple[bool, str | None]:
        """
        ponytail: Interim COCO OOD + screenshot guard to block off-domain scenes (desks,
        keyboards, UI screenshots) until accessibility_v8s.pt is fine-tuned with hard negatives.
        """
        import numpy as np

        if isinstance(target_input, np.ndarray) and _is_digital_screenshot(target_input):
            return True, "digital_screenshot"

        if self._ood_model is None:
            return False, None

        try:
            res = self._ood_model.predict(target_input, conf=0.30, imgsz=640, verbose=False)[0]
        except Exception as exc:
            logger.warning("OOD pre-filter inference failed: %s", exc)
            return False, None

        names = getattr(res, "names", {}) or {}
        off_domain_area = 0.0
        top_label: str | None = None
        for box in getattr(res, "boxes", []) or []:
            cls_name = str(names.get(int(box.cls), "")).lower()
            if cls_name not in _OFF_DOMAIN_COCO_CLASSES:
                continue
            conf = float(box.conf)
            x1, y1, x2, y2 = box.xyxyn[0].tolist()
            area = max(0.0, x2 - x1) * max(0.0, y2 - y1)
            if cls_name in _STRONG_DESK_SCREEN_CLASSES and conf >= 0.35 and area >= 0.12:
                return True, f"off_domain:{cls_name}"
            off_domain_area += area
            top_label = top_label or cls_name

        if off_domain_area >= 0.25 and top_label:
            return True, f"off_domain:{top_label}"
        return False, None

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
            "exterior_ramp_present":    {"value": "unknown", "confidence": 0.0, "method": "detector", "reason": "Chưa đủ dữ liệu để kết luận từ ảnh này"},
            "ramp_slope_compliant":     {"value": "unknown", "confidence": 0.0, "method": "unmeasured", "reason": "Cần đo đạc thực địa hoặc nhập kích thước chiều cao/chiều dài dốc"},
            "steps_present":            {"value": "unknown", "confidence": 0.0, "method": "detector", "reason": "Chưa đủ dữ liệu để kết luận từ ảnh này", "step_count_estimate": None},
            "elevator_present":         {"value": "unknown", "confidence": 0.0, "method": "detector", "reason": "Chưa đủ dữ liệu để kết luận từ ảnh này"},
            "door_detected":            {"value": "unknown", "confidence": 0.0, "method": "detector", "reason": "Chưa đủ dữ liệu để kết luận từ ảnh này"},
            "door_width_compliant":     {"value": "unknown", "confidence": 0.0, "method": "unmeasured", "reason": "Không thể đo chiều rộng chính xác từ ảnh 2D đơn lẻ"},
            "door_width_ok":            {"value": "unknown", "confidence": 0.0, "method": "unmeasured", "reason": "Legacy field: chỉ suy ra từ số đo đã xác minh"},
            "accessible_restroom_sign": {"value": "unknown", "confidence": 0.0, "method": "detector", "reason": "Chưa đủ dữ liệu để kết luận từ ảnh này"},
            "tactile_paving_present":   {"value": "unknown", "confidence": 0.0, "method": "unsupported", "reason": "Chưa hỗ trợ nhận diện đặc tính này trong ảnh"},
        }

        engines_used: set[str] = set()
        ramp_r: dict = {"status": "completed", "engine": "none"}
        step_r: dict = {"status": "completed", "engine": "none"}
        door_r: dict = {"status": "completed", "engine": "none"}
        elev_r: dict = {"status": "completed", "engine": "none"}
        sign_r: dict = {"status": "completed", "engine": "none"}

        for idx, img_bytes in enumerate(images):
            logger.debug("CV pipeline processing image %d/%d", idx + 1, len(images))
            try:
                import cv2
                import numpy as np
                arr = np.frombuffer(img_bytes, dtype=np.uint8)
                img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                target_input = img if img is not None else img_bytes

                door_r = self._door.detect_door(target_input)
                elev_r = self._elevator.detect_elevator(target_input)
                sign_r = self._signage.detect_signage(target_input)

                is_restroom_context = (
                    sign_r.get("restroom_fixture_detected")
                    and sign_r.get("confidence", 0.0) >= 0.35
                )
                is_indoor_context = is_restroom_context or (
                    elev_r.get("value") and elev_r.get("confidence", 0.0) >= 0.35
                )

                ood_cache: tuple[bool, str | None] | None = None

                def check_off_domain() -> tuple[bool, str | None]:
                    nonlocal ood_cache
                    if ood_cache is None:
                        ood_cache = self._is_off_domain_scene(target_input)
                    return ood_cache

                ramp_r = self._ramp.detect_ramp(target_input)
                if (
                    self._ramp_fallback is not None
                    and not ramp_r.get("value")
                    and not is_indoor_context
                ):
                    fb = self._ramp_fallback._detect(target_input)
                    if fb.detected and fb.status == "completed":
                        is_ood, ood_reason = check_off_domain()
                        if is_ood:
                            logger.info(
                                "Suppressing fallback ramp (conf=%.3f) due to %s",
                                fb.max_confidence,
                                ood_reason,
                            )
                        else:
                            ramp_r = {
                                "value": True,
                                "confidence": round(fb.max_confidence, 4),
                                "bbox_normalized": fb.boxes_normalized[0] if fb.boxes_normalized else None,
                                "engine": fb.engine,
                                "status": fb.status,
                                "error_code": fb.error_code,
                            }

                if (
                    is_indoor_context
                    and ramp_r.get("value")
                    and ramp_r.get("confidence", 0.0) < 0.85
                ):
                    suppress_reason = (
                        "Triệt tiêu nhận diện nhầm ram dốc trong khu vực nhà vệ sinh"
                        if is_restroom_context
                        else "Triệt tiêu nhận diện nhầm ram dốc trong khu vực trong nhà"
                    )
                    logger.info(
                        "Suppressing ramp detection (conf=%.3f) due to indoor context (sign=%.3f, elev=%.3f)",
                        ramp_r.get("confidence", 0.0),
                        sign_r.get("confidence", 0.0),
                        elev_r.get("confidence", 0.0),
                    )
                    ramp_r = {
                        "value": False,
                        "confidence": 0.0,
                        "bbox_normalized": None,
                        "engine": ramp_r.get("engine", "yolo"),
                        "status": "completed",
                        "error_code": None,
                        "reason": suppress_reason,
                    }

                step_r = self._step.detect_steps(target_input)

                for key, res_dict, empty_val in (
                    ("door", door_r, "unknown"),
                    ("elevator", elev_r, False),
                    ("ramp", ramp_r, False),
                    ("step", step_r, False),
                ):
                    is_active = res_dict.get("value") is True or res_dict.get("value") == "present"
                    conf = float(res_dict.get("confidence", 0.0) or 0.0)
                    if is_active and conf < _MARGINAL_PRIMARY_CONF:
                        is_ood, ood_reason = check_off_domain()
                        if is_ood:
                            logger.info(
                                "Suppressing marginal %s detection (conf=%.3f) due to %s",
                                key,
                                conf,
                                ood_reason,
                            )
                            res_dict["value"] = empty_val
                            res_dict["confidence"] = 0.0
                            res_dict["bbox_normalized"] = None
                            res_dict["reason"] = f"Triệt tiêu nhận diện nhiễu ngoài miền ({ood_reason})"
                            if key == "step":
                                res_dict["step_count_estimate"] = None

                for r in (ramp_r, step_r, door_r, elev_r, sign_r):
                    eng = r.get("engine")
                    if eng and eng not in ("none", "pending", "unavailable"):
                        engines_used.add(eng)

                agg["exterior_ramp_present"]    = _merge(agg["exterior_ramp_present"], ramp_r)
                agg["steps_present"]            = _merge(agg["steps_present"], step_r)
                agg["door_detected"]            = _merge(agg["door_detected"], door_r)
                agg["elevator_present"]         = _merge(agg["elevator_present"], elev_r)
                agg["accessible_restroom_sign"] = _merge(agg["accessible_restroom_sign"], sign_r)

            except Exception as exc:
                logger.exception("CV pipeline error on image %d: %s", idx, exc)

        # Anti-false positive rule: anti-slip chevron grooves or threshold joints on a verified ramp
        # should not be misclassified as stairs.
        ramp_conf = agg["exterior_ramp_present"].get("confidence", 0.0)
        step_conf = agg["steps_present"].get("confidence", 0.0)
        if ramp_conf >= 0.62 and step_conf < 0.68:
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
