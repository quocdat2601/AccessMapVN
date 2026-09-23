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

import io
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class DetectionResult:
    """Raw result returned by a single YOLO inference call."""
    detected: bool
    max_confidence: float
    boxes: list[list[float]] = field(default_factory=list)   # [[x1, y1, x2, y2], ...]
    class_names: list[str]   = field(default_factory=list)
    count: int               = 0

    @classmethod
    def empty(cls) -> "DetectionResult":
        """Return a result indicating nothing was detected."""
        return cls(detected=False, max_confidence=0.0)


class BaseYOLODetector:
    """
    Base class for all YOLOv8 object detectors.

    Parameters
    ----------
    weight_path:
        Path to the ``.pt`` weights file.
    target_class:
        The class label this detector is interested in.
        If ``None`` the detector considers all classes.
    """

    def __init__(self, weight_path: Path, target_class: str | None = None) -> None:
        self._weight_path  = weight_path
        self._target_class = target_class
        self._model        = None   # lazy-loaded

    # ── Model loading ──────────────────────────────────────────────────────────

    def _load_model(self) -> Any:
        """Load the YOLO model from disk (called at most once)."""
        if self._model is not None:
            return self._model

        if not self._weight_path.exists():
            logger.warning(
                "YOLO weights not found at %s – using stub mode (random scores).",
                self._weight_path,
            )
            self._model = _StubModel(self._target_class)
            return self._model

        try:
            from ultralytics import YOLO
            logger.info("Loading YOLO model from %s …", self._weight_path)
            self._model = YOLO(str(self._weight_path))
        except Exception as exc:
            logger.exception("Failed to load YOLO model from %s", self._weight_path)
            self._model = _StubModel(self._target_class)

        return self._model

    # ── Inference ──────────────────────────────────────────────────────────────

    def _detect(self, image_bytes: bytes) -> DetectionResult:
        """
        Run YOLO inference on raw image bytes.

        Parameters
        ----------
        image_bytes:
            JPEG/PNG encoded image.

        Returns
        -------
        DetectionResult
        """
        model = self._load_model()

        # Decode bytes to a numpy array (H×W×BGR)
        import cv2
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            logger.warning("Could not decode image bytes – returning empty result.")
            return DetectionResult.empty()

        # Stub model path
        if isinstance(model, _StubModel):
            return model.predict(img)

        # Real YOLO inference
        results = model.predict(
            source=img,
            conf=settings.yolo_conf_threshold,
            imgsz=settings.yolo_img_size,
            verbose=False,
        )

        if not results:
            return DetectionResult.empty()

        boxes_detected: list[list[float]] = []
        names_detected: list[str]         = []
        max_conf: float                   = 0.0

        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                cls_id   = int(box.cls[0].item())
                cls_name = model.names.get(cls_id, str(cls_id))
                conf     = float(box.conf[0].item())

                # Filter by target class if specified
                if self._target_class and cls_name.lower() != self._target_class.lower():
                    continue

                boxes_detected.append(box.xyxy[0].tolist())
                names_detected.append(cls_name)
                max_conf = max(max_conf, conf)

        detected = len(boxes_detected) > 0
        return DetectionResult(
            detected=detected,
            max_confidence=max_conf,
            boxes=boxes_detected,
            class_names=names_detected,
            count=len(boxes_detected),
        )


class _StubModel:
    """
    Fallback stub that returns plausible-looking random scores when model
    weights are missing.  Clearly logs that stub mode is active.

    ponytail: naive random stub – replace with real YOLO weights in production.
    """

    def __init__(self, target_class: str | None) -> None:
        self._target_class = target_class or "object"
        logger.warning("StubModel active for class '%s'.", self._target_class)

    def predict(self, img: np.ndarray) -> DetectionResult:
        import random
        # Deterministically seed on image content hash so results are
        # reproducible for the same image within a single run.
        rng = random.Random(int(img.mean() * 1000) % (2 ** 31))
        detected = rng.random() > 0.5
        confidence = rng.uniform(0.45, 0.95) if detected else rng.uniform(0.1, 0.44)
        return DetectionResult(
            detected=detected,
            max_confidence=confidence,
            count=1 if detected else 0,
        )
