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
            edges = cv2.Canny(gray, 40, 140)

            # Check for door and steps to differentiate entrance stairs from ramps
            door_min_line = int(h * 0.25)
            lines_door = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=35, minLineLength=door_min_line, maxLineGap=20)
            door_verticals: list[float] = []
            if lines_door is not None:
                for l in lines_door:
                    x1, y1, x2, y2 = l.flatten()
                    dx = abs(x2 - x1)
                    dy = abs(y2 - y1)
                    if dx < dy * 0.20 and max(y1, y2) > h * 0.50:
                        door_verticals.append(float((x1 + x2) / 2.0))

            has_large_door = False
            if len(door_verticals) >= 2:
                for i in range(len(door_verticals)):
                    for j in range(i + 1, len(door_verticals)):
                        span = abs(door_verticals[j] - door_verticals[i])
                        if 0.18 * w <= span <= 0.85 * w:
                            has_large_door = True
                            break
                    if has_large_door:
                        break

            lines_ramp = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=35, minLineLength=35, maxLineGap=15)
            ramp_slope_lines = 0
            entrance_horizontal_steps = 0
            if lines_ramp is not None:
                for l in lines_ramp:
                    pts = l.flatten()
                    if len(pts) == 4:
                        x1, y1, x2, y2 = pts
                        dx = abs(x2 - x1)
                        dy = abs(y2 - y1)
                        y_bot = max(y1, y2)
                        deg = float(np.degrees(np.arctan2(dy, max(dx, 1))))
                        # Ramp corridor sloping lines in ground area
                        if 6.0 <= deg <= 78.0 and y_bot > h * 0.35 and dy > h * 0.035:
                            ramp_slope_lines += 1
                        # Near-horizontal entrance steps in threshold zone
                        if deg < 6.0 and y_bot > h * 0.65 and dx > 0.15 * w:
                            entrance_horizontal_steps += 1

            # Detect saturated yellow guidance marking on ground (arrow or tactile tiles)
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            yellow_mask = cv2.inRange(hsv, np.array([16, 110, 90]), np.array([36, 255, 255]))
            ground_yellow_px = int(cv2.countNonZero(yellow_mask[int(h * 0.60):, :]))
            has_ground_yellow = ground_yellow_px > 3000

            # Entrance stairs exclusion: if a prominent door with horizontal entrance steps exists
            is_entrance_steps_only = has_large_door and entrance_horizontal_steps >= 20

            if not is_entrance_steps_only and (has_ground_yellow or ramp_slope_lines >= 8):
                conf = min(0.92, round(0.75 + min(0.15, (ramp_slope_lines / 20.0) * 0.15), 2))
                return DetectionResult(
                    detected=True,
                    max_confidence=conf,
                    boxes=[[float(w * 0.1), float(h * 0.35), float(w * 0.9), float(h * 0.95)]],
                    class_names=["ramp"],
                    count=1,
                )

        # ponytail: OpenCV vertical frame jamb and lintel heuristic for door detection; upgrade to fine-tuned YOLOv8 weights once door.pt is mounted.
        if self._target_class == "door" and img is not None and img.size > 0:
            import cv2
            h, w = img.shape[:2]
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 40, 140)
            # Entrance door jambs are human-scale (at least 25% of image height)
            door_min_line = int(h * 0.25)
            lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=35, minLineLength=door_min_line, maxLineGap=20)
            vertical_jambs: list[tuple[float, float, float, float]] = []
            horizontal_headers: list[tuple[float, float, float, float]] = []
            if lines is not None:
                for l in lines:
                    pts = l.flatten()
                    if len(pts) == 4:
                        x1, y1, x2, y2 = pts
                        dx = abs(x2 - x1)
                        dy = abs(y2 - y1)
                        y_top = min(y1, y2)
                        y_bot = max(y1, y2)
                        # Vertical door jamb: near vertical, bottom extends into lower half
                        if dx < dy * 0.20 and y_bot > h * 0.50 and dy >= door_min_line:
                            xm = float((x1 + x2) / 2.0)
                            if 0.05 * w <= xm <= 0.95 * w:
                                vertical_jambs.append((xm, float(y_top), float(y_bot), float(dy)))
                        # Horizontal header / lintel candidate
                        if dy < dx * 0.18 and dx >= 0.15 * w:
                            ym = float((y1 + y2) / 2.0)
                            horizontal_headers.append((min(x1, x2), max(x1, x2), ym, float(dx)))

            # Cluster vertical lines
            clusters: list[list[tuple[float, float, float, float]]] = []
            for jm in sorted(vertical_jambs, key=lambda j: j[0]):
                if not clusters or abs(jm[0] - clusters[-1][-1][0]) > 0.04 * w:
                    clusters.append([jm])
                else:
                    clusters[-1].append(jm)

            cluster_reps: list[tuple[float, float, float, float]] = []
            for c in clusters:
                avg_x = sum(j[0] for j in c) / len(c)
                min_yt = min(j[1] for j in c)
                max_yb = max(j[2] for j in c)
                max_dy = max(j[3] for j in c)
                cluster_reps.append((avg_x, min_yt, max_yb, max_dy))

            if len(cluster_reps) >= 2:
                for i in range(len(cluster_reps)):
                    for j in range(i + 1, len(cluster_reps)):
                        c1 = cluster_reps[i]
                        c2 = cluster_reps[j]
                        span = abs(c2[0] - c1[0])
                        span_ratio = span / float(w)
                        avg_jamb_h = max(c1[3], c2[3])
                        # Door opening aspect ratio: width/height <= 1.5 to exclude short, widely spaced planter/curb posts
                        if 0.18 <= span_ratio <= 0.85 and span <= avg_jamb_h * 1.5:
                            y_top_ref = min(c1[1], c2[1])
                            has_header = any(
                                (h_line[0] <= c2[0] and h_line[1] >= c1[0])
                                and abs(h_line[2] - y_top_ref) < h * 0.20
                                for h_line in horizontal_headers
                            )
                            if has_header or (c1[3] > 0.28 * h and c2[3] > 0.28 * h):
                                return DetectionResult(
                                    detected=True,
                                    max_confidence=0.85,
                                    boxes=[[float(c1[0]), float(y_top_ref), float(c2[0]), float(max(c1[2], c2[2]))]],
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
