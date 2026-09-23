"""
services/media/image_utils.py
------------------------------
Image validation and preprocessing utilities.

Responsibilities
----------------
* Validate that the input bytes are a decodable image.
* Resize images so no dimension exceeds *max_dim* (preserving aspect ratio).
* Re-encode as JPEG to normalise format before inference.
"""
from __future__ import annotations

import cv2
import numpy as np

from app.core.logging import get_logger

logger = get_logger(__name__)


def validate_and_preprocess(image_bytes: bytes, max_dim: int = 1024) -> bytes:
    """
    Validate, resize (if needed), and normalise *image_bytes* to JPEG.

    Parameters
    ----------
    image_bytes:
        Raw image bytes (JPEG, PNG, WebP, …).
    max_dim:
        Maximum allowed pixel dimension for width or height.
        Images exceeding this are resized proportionally.

    Returns
    -------
    bytes
        JPEG-encoded image bytes ready for model inference.

    Raises
    ------
    ValueError
        If the bytes cannot be decoded as an image.
    """
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Could not decode image bytes. Make sure the file is a valid image.")

    img = _resize_if_needed(img, max_dim)
    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return buf.tobytes()


def check_resolution(image_bytes: bytes, min_dim: int = 100) -> bool:
    """
    Return ``True`` if both image dimensions are at least *min_dim* pixels.

    Parameters
    ----------
    image_bytes:
        Raw image bytes.
    min_dim:
        Minimum required dimension in pixels (width and height).
    """
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        return False
    h, w = img.shape[:2]
    return h >= min_dim and w >= min_dim


def _resize_if_needed(img: np.ndarray, max_dim: int) -> np.ndarray:
    """Downscale *img* so the largest dimension does not exceed *max_dim*."""
    h, w = img.shape[:2]
    if max(h, w) <= max_dim:
        return img
    scale = max_dim / max(h, w)
    new_w = int(w * scale)
    new_h = int(h * scale)
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    logger.debug("Resized image from (%d,%d) to (%d,%d)", w, h, new_w, new_h)
    return resized
