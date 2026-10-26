"""
services/cv/_base.py
---------------------
Shared base class for all YOLOv8-backed detectors.

Each concrete detector subclasses ``BaseYOLODetector`` and calls
``self._detect(image_bytes)`` to obtain a ``DetectionResult``.

Design notes
------------
* Models are loaded lazily on the first call (not at import time) so that
  missing weight files don't crash the entire service at startup.
* The ``ponytail: global singleton model`` is intentional for MVP to keep
  memory usage low.  For production, consider a per-worker model pool.
"""
from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def compute_file_sha256(path: Path) -> str:
    """Compute SHA256 checksum of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


@dataclass
class DetectionResult:
    """Raw result returned by a single YOLO inference call."""
    detected: bool
    max_confidence: float
    boxes: list[list[float]] = field(default_factory=list)            # [[x1, y1, x2, y2], ...] (pixel coordinates)
    boxes_normalized: list[list[float]] = field(default_factory=list) # [[xmin, ymin, xmax, ymax], ...] in [0, 1]
    class_names: list[str]   = field(default_factory=list)
    count: int               = 0
    engine: str              = "none"
    status: str              = "completed"                            # "completed" | "failed" | "unavailable"
    error_code: str | None   = None

    @classmethod
    def empty(cls, engine: str = "none", status: str = "completed", error_code: str | None = None) -> "DetectionResult":
        """Return a result indicating nothing was detected or analysis failed."""
        return cls(detected=False, max_confidence=0.0, engine=engine, status=status, error_code=error_code)


_MODEL_CACHE: dict[str, Any] = {}


class BaseYOLODetector:
    """
    Base class for all YOLOv8 object detectors.

    Parameters
    ----------
    weight_path:
        Path to the ``.pt`` weights file.
    target_class:
        Single class label or None.
    target_classes:
        Optional set of class labels (e.g. {"stairs", "step"}).
    effective_conf_threshold:
        Optional threshold override (defaults to settings.yolo_conf_threshold).
    """

    def __init__(
        self,
        weight_path: Path,
        target_class: str | None = None,
        target_classes: set[str] | tuple[str, ...] | list[str] | None = None,
        effective_conf_threshold: float | None = None,
    ) -> None:
        self._weight_path  = weight_path
        self._target_class = target_class
        self._target_classes = {c.lower() for c in target_classes} if target_classes else None
        self.effective_conf_threshold = effective_conf_threshold or settings.yolo_conf_threshold
        self.detector_name = target_class or (list(self._target_classes)[0] if self._target_classes else "detector")
        self._model        = None   # lazy-loaded
        self._engine       = "pending"
        self._weights_sha256: str | None = None
        self._initialization_attempted = False

    @property
    def model_loaded(self) -> bool:
        """True only if the model is actually loaded and ready for inference."""
        return self._model is not None and self._engine == "yolo"

    @property
    def initialization_attempted(self) -> bool:
        return self._initialization_attempted

    # ── Model loading ──────────────────────────────────────────────────────────

    def _load_model(self) -> Any:
        """Load the YOLO model from disk (called at most once per process)."""
        if self._initialization_attempted:
            return self._model

        if not self._weight_path.exists():
            logger.warning("YOLO weights not found at %s", self._weight_path)
            self._engine = "unavailable"
            self._model = None
            self._initialization_attempted = True
            self._log_detector_status()
            return self._model

        cache_key = str(self._weight_path.resolve())
        if cache_key in _MODEL_CACHE:
            self._model = _MODEL_CACHE[cache_key]
            self._engine = "yolo"
            self._initialization_attempted = True
            return self._model

        try:
            self._weights_sha256 = compute_file_sha256(self._weight_path)
            import torch
            try:
                from ultralytics.nn.tasks import DetectionModel
                torch.serialization.add_safe_globals([DetectionModel])
            except Exception:
                pass

            # Safe monkeypatch for PyTorch 2.6+ which defaults weights_only=True
            _orig_torch_load = torch.load
            def _trusted_torch_load(*args, **kwargs):
                if "weights_only" not in kwargs:
                    kwargs["weights_only"] = False
                return _orig_torch_load(*args, **kwargs)
            torch.load = _trusted_torch_load

            from ultralytics import YOLO
            logger.info("Loading YOLO model from %s …", self._weight_path)
            model = YOLO(str(self._weight_path))

            # Eager warm-up pass: forces PyTorch ATen kernel compilation & memory pool allocation at startup
            try:
                dummy = np.zeros((settings.yolo_img_size, settings.yolo_img_size, 3), dtype=np.uint8)
                model.predict(source=dummy, conf=self.effective_conf_threshold, imgsz=settings.yolo_img_size, verbose=False)
            except Exception as w_exc:
                logger.debug("Model warmup pass skipped: %s", w_exc)

            _MODEL_CACHE[cache_key] = model
            self._model = model
            self._engine = "yolo"
            self._initialization_attempted = True
        except Exception as exc:
            logger.exception("Failed to load YOLO model from %s: %s", self._weight_path, exc)
            self._engine = "unavailable"
            self._model = None
            self._initialization_attempted = True

        self._log_detector_status()
        return self._model

    def _log_detector_status(self) -> None:
        """Log the real loaded status of this detector."""
        logger.info(
            "detector=%s engine=%s model_loaded=%s weights_sha256=%s effective_conf_threshold=%.2f",
            self.detector_name,
            self._engine,
            str(self.model_loaded).lower(),
            self._weights_sha256 or "none",
            self.effective_conf_threshold,
        )

    # ── Inference ──────────────────────────────────────────────────────────────

    def _detect(self, image_input: bytes | np.ndarray) -> DetectionResult:
        """
        Run YOLO inference on raw image bytes or a pre-decoded BGR numpy array.

        Parameters
        ----------
        image_input:
            JPEG/PNG encoded bytes or np.ndarray (H×W×BGR).

        Returns
        -------
        DetectionResult
        """
        model = self._load_model()

        if isinstance(image_input, np.ndarray):
            img = image_input
        else:
            import cv2
            arr = np.frombuffer(image_input, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

        if img is None:
            logger.warning("Could not decode image bytes – returning failed result.")
            return DetectionResult.empty(engine=self._engine, status="failed", error_code="decode_error")

        if self._engine == "unavailable" or model is None:
            return DetectionResult.empty(engine="unavailable", status="unavailable", error_code="weights_missing")

        # Real YOLO inference
        try:
            results = model.predict(
                source=img,
                conf=self.effective_conf_threshold,
                imgsz=settings.yolo_img_size,
                verbose=False,
            )
        except Exception as exc:
            logger.exception("detector=%s engine=yolo inference_error=%s", self.detector_name, exc)
            return DetectionResult.empty(engine="yolo", status="failed", error_code="inference_failed")

        if not results:
            logger.info(
                "detector=%s engine=yolo inference_executed=true raw_detection_count=0 accepted_detection_count=0 max_conf=0.0000",
                self.detector_name,
            )
            return DetectionResult.empty(engine="yolo", status="completed")

        boxes_detected: list[list[float]] = []
        boxes_norm: list[list[float]]     = []
        names_detected: list[str]         = []
        max_conf: float                   = 0.0
        raw_count: int                    = 0

        for r in results:
            if r.boxes is None:
                continue
            raw_count += len(r.boxes)
            for box in r.boxes:
                cls_id   = int(box.cls[0].item())
                cls_name = model.names.get(cls_id, str(cls_id))
                conf     = float(box.conf[0].item())

                # Filter by target class(es) if specified
                if self._target_classes:
                    if cls_name.lower() not in self._target_classes:
                        continue
                elif self._target_class and cls_name.lower() != self._target_class.lower():
                    continue

                boxes_detected.append(box.xyxy[0].tolist())
                if hasattr(box, "xyxyn") and box.xyxyn is not None:
                    boxes_norm.append(box.xyxyn[0].tolist())
                names_detected.append(cls_name)
                max_conf = max(max_conf, conf)

        accepted_count = len(boxes_detected)
        detected = accepted_count > 0

        logger.info(
            "detector=%s engine=yolo inference_executed=true raw_detection_count=%d accepted_detection_count=%d max_conf=%.4f",
            self.detector_name,
            raw_count,
            accepted_count,
            max_conf,
        )

        return DetectionResult(
            detected=detected,
            max_confidence=max_conf,
            boxes=boxes_detected,
            boxes_normalized=boxes_norm,
            class_names=names_detected,
            count=accepted_count,
            engine="yolo",
            status="completed",
        )

