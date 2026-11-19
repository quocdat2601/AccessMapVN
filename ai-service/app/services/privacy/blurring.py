"""
services/privacy/blurring.py
-----------------------------
Detects faces using OpenCV and applies Gaussian blurring.

Two detectors are tried in order (fastest first):
1. **Haar cascade** – ships with every OpenCV build, zero extra deps.
2. **DNN face detector** (res10_300x300_ssd) – more accurate, but requires the
   Caffe model files to be present in ``models/opencv/``.  Falls back silently
   to Haar if files are missing.

Design decision (capstone)
--------------------------
MTCNN / RetinaFace were removed because both pull TensorFlow (≥500 MB),
dramatically inflating the Docker image and slowing CPU-only builds.
OpenCV's built-in detectors are sufficient for privacy blurring on
community-uploaded photos.

ponytail: Haar cascade misses profiles / partially occluded faces; upgrade
          to the DNN detector or MediaPipe FaceMesh for production accuracy.
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Optional DNN model paths (anchored to configured models directory)
_DNN_PROTOTXT = settings.models_dir / "opencv" / "deploy.prototxt"
_DNN_WEIGHTS  = settings.models_dir / "opencv" / "res10_300x300_ssd_iter_140000.caffemodel"


class FaceBlurrer:
    """
    Detects and Gaussian-blurs all faces in an image.

    Parameters
    ----------
    blur_kernel:
        Size of the Gaussian kernel (must be odd).  Larger → stronger blur.
    """

    def __init__(self, blur_kernel: int = 51) -> None:
        self._kernel   = blur_kernel if blur_kernel % 2 == 1 else blur_kernel + 1
        self._detector = None   # lazy-loaded

    # ── Detector loading ───────────────────────────────────────────────────────

    def _load_detector(self) -> "_BaseDetector":
        if self._detector is not None:
            return self._detector

        # Prefer DNN detector when model files are available
        if _DNN_PROTOTXT.exists() and _DNN_WEIGHTS.exists():
            try:
                net = cv2.dnn.readNetFromCaffe(str(_DNN_PROTOTXT), str(_DNN_WEIGHTS))
                self._detector = _DNNDetector(net)
                logger.info("FaceBlurrer: using OpenCV DNN face detector.")
                return self._detector
            except Exception as exc:
                logger.warning("DNN detector failed to load: %s – falling back to Haar.", exc)

        # Default: Haar cascades when available in this OpenCV build (frontal + profile)
        cascade_cls = getattr(cv2, "CascadeClassifier", None)
        data_mod = getattr(cv2, "data", None)
        if cascade_cls is not None and data_mod is not None and hasattr(data_mod, "haarcascades"):
            frontal = cascade_cls(data_mod.haarcascades + "haarcascade_frontalface_default.xml")
            profile = cascade_cls(data_mod.haarcascades + "haarcascade_profileface.xml")
            if not frontal.empty() or not profile.empty():
                self._detector = _HaarDetector(frontal, None if profile.empty() else profile)
                logger.info("FaceBlurrer: using OpenCV Haar cascade face detector (frontal+profile).")
                return self._detector

        logger.warning(
            "No compatible OpenCV face detector available (OpenCV %s) – face blurring will be a no-op.",
            cv2.__version__,
        )
        self._detector = _NoOpDetector()
        return self._detector

    # ── Public API ─────────────────────────────────────────────────────────────

    def blur(self, image_bytes: bytes) -> tuple[bytes, int]:
        """
        Detect faces in *image_bytes* and blur each detected region.

        Parameters
        ----------
        image_bytes:
            Raw JPEG/PNG image data.

        Returns
        -------
        tuple[bytes, int]
            ``(blurred_jpeg_bytes, face_count)``
        """
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            logger.warning("FaceBlurrer: could not decode image; returning original.")
            return image_bytes, 0

        detector = self._load_detector()
        boxes    = detector.detect(img)   # list of (x, y, w, h)
        logger.debug("FaceBlurrer: detected %d face(s).", len(boxes))

        for (x, y, w, h) in boxes:
            x1, y1 = max(0, x),      max(0, y)
            x2, y2 = min(img.shape[1], x + w), min(img.shape[0], y + h)
            roi = img[y1:y2, x1:x2]
            if roi.size == 0:
                continue
            img[y1:y2, x1:x2] = cv2.GaussianBlur(roi, (self._kernel, self._kernel), 0)

        _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        return buf.tobytes(), len(boxes)


# ── Internal detector adapters ─────────────────────────────────────────────────

class _BaseDetector:
    def detect(self, img_bgr: np.ndarray) -> list[tuple[int, int, int, int]]:
        raise NotImplementedError


class _HaarDetector(_BaseDetector):
    def __init__(
        self,
        frontal_cascade: cv2.CascadeClassifier,
        profile_cascade: cv2.CascadeClassifier | None = None,
    ) -> None:
        self._frontal = frontal_cascade
        self._profile = profile_cascade

    @staticmethod
    def _iou(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> float:
        ax1, ay1, aw, ah = a
        bx1, by1, bw, bh = b
        ax2, ay2 = ax1 + aw, ay1 + ah
        bx2, by2 = bx1 + bw, by1 + bh
        ix1, iy1 = max(ax1, bx1), max(ay1, by1)
        ix2, iy2 = min(ax2, bx2), min(ay2, by2)
        inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
        if inter == 0:
            return 0.0
        union = aw * ah + bw * bh - inter
        return inter / union if union > 0 else 0.0

    def detect(self, img_bgr: np.ndarray) -> list[tuple[int, int, int, int]]:
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        candidates: list[tuple[int, int, int, int]] = []
        if not self._frontal.empty():
            faces = self._frontal.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
            )
            if len(faces) > 0:
                candidates.extend(tuple(int(v) for v in f) for f in faces)
        if self._profile is not None and not self._profile.empty():
            profiles = self._profile.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
            )
            if len(profiles) > 0:
                for p in profiles:
                    box = tuple(int(v) for v in p)
                    if not any(self._iou(box, existing) > 0.35 for existing in candidates):
                        candidates.append(box)
        return candidates


class _DNNDetector(_BaseDetector):
    """
    OpenCV DNN-based face detector (res10_300x300_ssd).
    More robust than Haar for rotated / partially visible faces.
    """
    _CONFIDENCE_THRESHOLD = 0.5

    def __init__(self, net: cv2.dnn.Net) -> None:
        self._net = net

    def detect(self, img_bgr: np.ndarray) -> list[tuple[int, int, int, int]]:
        h, w = img_bgr.shape[:2]
        blob = cv2.dnn.blobFromImage(
            cv2.resize(img_bgr, (300, 300)), 1.0, (300, 300),
            (104.0, 177.0, 123.0),
        )
        self._net.setInput(blob)
        detections = self._net.forward()
        boxes: list[tuple[int, int, int, int]] = []
        for i in range(detections.shape[2]):
            conf = float(detections[0, 0, i, 2])
            if conf < self._CONFIDENCE_THRESHOLD:
                continue
            x1 = int(detections[0, 0, i, 3] * w)
            y1 = int(detections[0, 0, i, 4] * h)
            x2 = int(detections[0, 0, i, 5] * w)
            y2 = int(detections[0, 0, i, 6] * h)
            boxes.append((x1, y1, x2 - x1, y2 - y1))
        return boxes


class _NoOpDetector(_BaseDetector):
    def detect(self, img_bgr: np.ndarray) -> list[tuple[int, int, int, int]]:
        return []
