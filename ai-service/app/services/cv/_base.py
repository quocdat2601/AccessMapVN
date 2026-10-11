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
            logger.info(
                "YOLO weights not found at %s – using CVHeuristicEngine.",
                self._weight_path,
            )
            self._model = CVHeuristicEngine(self._target_class)
            return self._model

        try:
            from ultralytics import YOLO
            logger.info("Loading YOLO model from %s …", self._weight_path)
            self._model = YOLO(str(self._weight_path))
        except Exception as exc:
            logger.exception("Failed to load YOLO model from %s", self._weight_path)
            self._model = CVHeuristicEngine(self._target_class)

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

        # Heuristic computer vision analysis path
        if isinstance(model, CVHeuristicEngine):
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


class CVHeuristicEngine:
    """
    OpenCV-based geometric analysis engine for edge, slope, and contour verification.
    Executes deterministic computer vision heuristics when fine-tuned YOLO weights (.pt)
    are not present on disk.
    """

    def __init__(self, target_class: str | None) -> None:
        self._target_class = (target_class or "object").lower()
        logger.info("CVHeuristicEngine active for class '%s'.", self._target_class)

    def predict(self, img: np.ndarray) -> DetectionResult:
        # ponytail: OpenCV HoughLines slope heuristic for ramp detection; upgrade to fine-tuned YOLOv8 weights once ramp.pt is mounted.
        if self._target_class == "ramp" and img is not None and img.size > 0:
            import cv2
            h, w = img.shape[:2]
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=40, minLineLength=30, maxLineGap=10)
            ramp_slope_lines = 0
            if lines is not None:
                for l in lines:
                    pts = l.flatten()
                    if len(pts) == 4:
                        x1, y1, x2, y2 = pts
                        dx = abs(x2 - x1)
                        dy = abs(y2 - y1)
                        angle = float(np.degrees(np.arctan2(dy, dx)))
                        # Real accessibility ramps exhibit gentle incline (5 deg - 35 deg) on ground plane
                        if 5.0 <= angle <= 35.0 and min(y1, y2) > h * 0.20:
                            ramp_slope_lines += 1
            edge_density = float(np.mean(edges > 0))
            contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            small_boxes = sum(1 for cnt in contours if 50 < cv2.contourArea(cnt) < 1500)

            if small_boxes < 250 and ramp_slope_lines >= 12 and edge_density >= 0.070:
                conf = min(0.92, round(0.72 + min(0.20, (ramp_slope_lines / 200.0) * 0.20), 2))
                return DetectionResult(
                    detected=True,
                    max_confidence=conf,
                    boxes=[[float(w * 0.1), float(h * 0.2), float(w * 0.9), float(h * 0.9)]],
                    class_names=["ramp"],
                    count=1,
                )

        # ponytail: OpenCV vertical frame jamb heuristic for door detection; upgrade to fine-tuned YOLOv8 weights once door.pt is mounted.
        if self._target_class == "door" and img is not None and img.size > 0:
            import cv2
            h, w = img.shape[:2]
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 40, 140)
            lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=45, minLineLength=int(h * 0.30), maxLineGap=25)
            valid_v_xs: list[float] = []
            if lines is not None:
                for l in lines:
                    pts = l.flatten()
                    if len(pts) == 4:
                        x1, y1, x2, y2 = pts
                        dx = abs(x2 - x1)
                        dy = abs(y2 - y1)
                        if dy > h * 0.30 and dx < dy * 0.15:
                            xm = float((x1 + x2) / 2.0)
                            # Exclude lines near outer image borders (border artifacts)
                            if 0.04 * w <= xm <= 0.96 * w:
                                valid_v_xs.append(xm)

            # Cluster vertical lines (grouping nearby parallel lines into jambs/edges)
            clusters: list[list[float]] = []
            for x in sorted(valid_v_xs):
                if not clusters or abs(x - clusters[-1][-1]) > 0.05 * w:
                    clusters.append([x])
                else:
                    clusters[-1].append(x)
            cluster_means = [sum(c) / len(c) for c in clusters]

            # Door detected if at least 2 distinct vertical clusters span 22% - 85% of image width
            if len(cluster_means) >= 2:
                for i in range(len(cluster_means)):
                    for j in range(i + 1, len(cluster_means)):
                        span = (cluster_means[j] - cluster_means[i]) / float(w)
                        if 0.22 <= span <= 0.85:
                            x_min = max(0.0, float(cluster_means[i]))
                            x_max = min(float(w), float(cluster_means[j]))
                            return DetectionResult(
                                detected=True,
                                max_confidence=0.85,
                                boxes=[[x_min, float(h * 0.05), x_max, float(h * 0.95)]],
                                class_names=["door"],
                                count=1,
                            )

        return DetectionResult(
            detected=False,
            max_confidence=0.0,
            boxes=[],
            class_names=[],
            count=0,
        )
