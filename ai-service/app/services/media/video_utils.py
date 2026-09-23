"""
services/media/video_utils.py
------------------------------
Keyframe extraction from video using FFmpeg (via subprocess) and OpenCV.

Strategy
--------
1. Decode the video bytes to a temporary file (in-memory pipe with FFmpeg).
2. Sample frames at ``fps`` frames per second.
3. Filter out blurry frames using the Laplacian variance method:
      variance = cv2.Laplacian(gray_frame, cv2.CV_64F).var()
      If variance < blur_threshold → frame is too blurry, discard.
4. Return the remaining frames as JPEG-encoded bytes.

FFmpeg approach
---------------
We call FFmpeg as a subprocess and pipe stdout to capture raw BGR frames.
This avoids writing temp files to disk.

ponytail: subprocess FFmpeg – upgrade to ffmpeg-python for a richer API or
          to GPU-accelerated decoding (nvdec) when running on a CUDA host.
"""
from __future__ import annotations

import io
import subprocess
import tempfile
import os
from pathlib import Path

import cv2
import numpy as np

from app.core.logging import get_logger

logger = get_logger(__name__)

# Maximum number of keyframes to keep (safeguard against very long videos)
_MAX_FRAMES = 60


def _laplacian_variance(gray: np.ndarray) -> float:
    """Return the Laplacian variance (sharpness proxy) of a greyscale image."""
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def extract_keyframes(
    video_bytes: bytes,
    fps: float = 1.0,
    blur_threshold: float = 80.0,
) -> list[bytes]:
    """
    Extract keyframes from raw video bytes at *fps* frames per second.

    Parameters
    ----------
    video_bytes:
        Raw video file bytes (mp4, mov, avi, …).
    fps:
        Sampling rate in frames per second.
    blur_threshold:
        Frames with Laplacian variance below this value are discarded.

    Returns
    -------
    list[bytes]
        JPEG-encoded frames that passed the blur filter, up to ``_MAX_FRAMES``.
    """
    if not video_bytes:
        return []

    # Write video to a temp file because FFmpeg needs seekable input
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        return _extract_with_ffmpeg(tmp_path, fps, blur_threshold)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def _extract_with_ffmpeg(video_path: str, fps: float, blur_threshold: float) -> list[bytes]:
    """
    Call FFmpeg to decode the video and sample frames via stdout pipe.
    Falls back to OpenCV if FFmpeg is not available.
    """
    # First, probe video dimensions
    probe_cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=p=0",
        video_path,
    ]
    try:
        probe = subprocess.run(probe_cmd, capture_output=True, timeout=10)
        w_str, h_str = probe.stdout.decode().strip().split(",")
        width, height = int(w_str), int(h_str)
    except Exception:
        # Fallback to OpenCV reader if ffprobe fails
        logger.warning("ffprobe failed – falling back to OpenCV video reader.")
        return _extract_with_opencv(video_path, fps, blur_threshold)

    frame_bytes_size = width * height * 3  # BGR

    # FFmpeg command: output raw BGR frames at target fps
    ffmpeg_cmd = [
        "ffmpeg", "-loglevel", "error",
        "-i", video_path,
        "-vf", f"fps={fps}",
        "-f", "rawvideo",
        "-pix_fmt", "bgr24",
        "pipe:1",
    ]

    try:
        proc = subprocess.Popen(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        raw_stdout, _ = proc.communicate(timeout=120)
    except FileNotFoundError:
        logger.warning("FFmpeg not found in PATH – falling back to OpenCV reader.")
        return _extract_with_opencv(video_path, fps, blur_threshold)
    except subprocess.TimeoutExpired:
        proc.kill()
        logger.error("FFmpeg timed out extracting frames from %s", video_path)
        return []

    frames: list[bytes] = []
    offset = 0
    while offset + frame_bytes_size <= len(raw_stdout) and len(frames) < _MAX_FRAMES:
        chunk = raw_stdout[offset: offset + frame_bytes_size]
        offset += frame_bytes_size

        frame = np.frombuffer(chunk, dtype=np.uint8).reshape((height, width, 3))
        gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if _laplacian_variance(gray) < blur_threshold:
            continue  # too blurry

        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        frames.append(buf.tobytes())

    logger.debug("FFmpeg extracted %d usable frames (fps=%.1f)", len(frames), fps)
    return frames


def _extract_with_opencv(video_path: str, fps: float, blur_threshold: float) -> list[bytes]:
    """OpenCV-based fallback frame extractor."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logger.error("OpenCV could not open video: %s", video_path)
        return []

    src_fps   = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step      = max(1, int(src_fps / fps))
    frame_idx = 0
    frames: list[bytes] = []

    while len(frames) < _MAX_FRAMES:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % step == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            if _laplacian_variance(gray) >= blur_threshold:
                _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                frames.append(buf.tobytes())
        frame_idx += 1

    cap.release()
    logger.debug("OpenCV extracted %d usable frames", len(frames))
    return frames
