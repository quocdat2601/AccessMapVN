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

import hashlib
import io
from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageOps

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _decode_exif_corrected(image_bytes: bytes) -> np.ndarray:
    """Decode *image_bytes* into a BGR ndarray with EXIF orientation applied."""
    try:
        with Image.open(io.BytesIO(image_bytes)) as pil_img:
            transposed = ImageOps.exif_transpose(pil_img)
            rgb = transposed.convert("RGB")
            return cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2BGR)
    except Exception:
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image bytes. Make sure the file is a valid image.")
        return img


def assess_image_quality(raw_bytes: bytes, media_id: str | None = None) -> dict[str, Any]:
    """Compute SHA-256 and image quality metrics on the EXIF-oriented image."""
    sha256 = hashlib.sha256(raw_bytes).hexdigest()
    img = _decode_exif_corrected(raw_bytes)
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    laplacian_variance = round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 2)
    brightness = round(float(gray.mean()), 2)
    is_blur = laplacian_variance < settings.blur_laplacian_threshold

    quality_codes: list[str] = []
    if is_blur:
        quality_codes.append("IMAGE_BLURRY")
    if w < 300 or h < 300:
        quality_codes.append("LOW_RESOLUTION")
    if brightness < 40.0:
        quality_codes.append("IMAGE_TOO_DARK")
    elif brightness > 240.0:
        quality_codes.append("IMAGE_OVEREXPOSED")

    action = "warn" if quality_codes else "ok"
    if "IMAGE_BLURRY" in quality_codes and "LOW_RESOLUTION" in quality_codes:
        quality_assessment = "poor"
    elif quality_codes:
        quality_assessment = "warning"
    else:
        quality_assessment = "good"

    return {
        "media_id": media_id or sha256[:12],
        "sha256": sha256,
        "width": w,
        "height": h,
        "laplacian_variance": laplacian_variance,
        "brightness": brightness,
        "is_blur": is_blur,
        "quality_codes": quality_codes,
        "action": action,
        "quality_assessment": quality_assessment,
    }


def validate_and_preprocess(image_bytes: bytes, max_dim: int = 1024) -> bytes:
    """
    Validate, apply EXIF orientation, resize (if needed), and normalise *image_bytes* to JPEG.

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
    img = _decode_exif_corrected(image_bytes)
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
