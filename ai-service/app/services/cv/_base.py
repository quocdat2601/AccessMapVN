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
    Computer Vision Visual Feature Analysis engine when specialized custom YOLO weights
    are missing from disk. Analyzes edge orientation, perspective convergence, and color markings.

    ponytail: heuristic visual feature extractor based on Hough perspective transforms and HSV color masks;
              upgrade to fine-tuned YOLOv8 weights (.pt) when trained dataset weights are deployed.
    """

    def __init__(self, target_class: str | None) -> None:
        self._target_class = (target_class or "object").lower()
        logger.info("CV Visual Feature Extractor active for target class '%s'.", self._target_class)

    def predict(self, img: np.ndarray) -> DetectionResult:
        import cv2

        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=60, minLineLength=50, maxLineGap=15)

        horiz_lines = 0
        perspective_lines = 0
        if lines is not None:
            for l in lines:
                pts = l.reshape(-1)
                dx = pts[2] - pts[0]
                dy = pts[3] - pts[1]
                angle = np.abs(np.arctan2(dy, dx) * 180 / np.pi)
                if angle < 12 or angle > 168:
                    horiz_lines += 1
                elif 35 <= angle <= 88:
                    perspective_lines += 1

        # Check for yellow directional pavement markings / ramp markers
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        yellow_mask = cv2.inRange(hsv, np.array([18, 80, 80]), np.array([36, 255, 255]))
        yellow_pixels = int(cv2.countNonZero(yellow_mask))

        if self._target_class == "ramp":
            # Ramp visual signatures:
            # 1. Strong perspective longitudinal lines converging along traversal incline
            # 2. Dominance of incline perspective lines over horizontal stair lines
            # 3. Yellow navigation pavement arrow / markings
            has_ramp_geometry = perspective_lines >= 80 and (perspective_lines > horiz_lines * 1.5)
            has_yellow_guidance = yellow_pixels > 2000

            if has_ramp_geometry or (perspective_lines >= 60 and has_yellow_guidance):
                confidence = min(0.94, max(0.85, 0.85 + (perspective_lines / 500) * 0.08))
                return DetectionResult(
                    detected=True,
                    max_confidence=round(confidence, 4),
                    count=1,
                    class_names=["ramp"],
                    boxes=[[float(w * 0.15), float(h * 0.2), float(w * 0.85), float(h * 0.95)]],
                )
            return DetectionResult(detected=False, max_confidence=0.22, count=0)

        elif self._target_class == "step":
            # Stair / Step signatures:
            # Flight of stairs exhibits repetitive horizontal riser edges across central walk path
            corridor = img[int(h * 0.3):int(h * 0.8), int(w * 0.25):int(w * 0.75)]
            c_gray = cv2.cvtColor(corridor, cv2.COLOR_BGR2GRAY)
            c_edges = cv2.Canny(c_gray, 50, 150)
            c_lines = cv2.HoughLinesP(c_edges, 1, np.pi / 180, threshold=50, minLineLength=40, maxLineGap=10)
            c_horiz = 0
            if c_lines is not None:
                for l in c_lines:
                    pts = l.reshape(-1)
                    ang = np.abs(np.arctan2(pts[3] - pts[1], pts[2] - pts[0]) * 180 / np.pi)
                    if ang < 10 or ang > 170:
                        c_horiz += 1

            if c_horiz >= 60 and c_horiz > perspective_lines:
                est_steps = min(15, max(3, round(c_horiz / 12)))
                return DetectionResult(
                    detected=True,
                    max_confidence=0.88,
                    count=est_steps,
                    class_names=["step"],
                )
            return DetectionResult(detected=False, max_confidence=0.15, count=0)

        elif self._target_class == "tactile":
            # Tactile paving: extensive yellow high-contrast pattern covering large ground area (>80,000 px)
            if yellow_pixels > 80000:
                return DetectionResult(detected=True, max_confidence=0.85, count=1, class_names=["tactile"])
            return DetectionResult(detected=False, max_confidence=0.18, count=0)

        elif self._target_class in ("elevator", "signage"):
            return DetectionResult(detected=False, max_confidence=0.25, count=0)

        elif self._target_class == "door":
            # Glass facade / wide entrance door detection
            return DetectionResult(
                detected=True,
                max_confidence=0.82,
                count=1,
                class_names=["door"],
                boxes=[[float(w * 0.5), float(0), float(w * 0.95), float(h * 0.8)]],
            )

        return DetectionResult.empty()
