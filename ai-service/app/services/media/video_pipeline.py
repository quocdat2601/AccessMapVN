"""
services/media/video_pipeline.py
--------------------------------
Frame-based video pre-scan: validate -> sample -> select -> (existing image
CV pipeline per frame) -> conservative aggregation.

Video gives more views of one contributor's scene. It never yields
measurements, compliance, or extra independent corroboration.

ponytail: timestamps are the nominal ``index / fps`` of the ``fps`` filter,
          not decoder PTS. Upgrade to ``-vf showinfo`` parsing if exact
          times are needed.
"""
from __future__ import annotations

import json
import os
import subprocess
import tempfile
import uuid
from dataclasses import dataclass, field
from typing import Protocol

import cv2
import numpy as np

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_MIN_BRIGHTNESS = 25.0
_MAX_BRIGHTNESS = 235.0

# video-level suggestion key -> CVPipeline feature key
_SUGGESTION_KEYS = {
    "ramp_present": "exterior_ramp_present",
    "steps_present": "steps_present",
    "elevator_present": "elevator_present",
    "door_detected": "door_detected",
    "accessible_restroom_sign": "accessible_restroom_sign",
    "tactile_paving_present": "tactile_paving_present",
}


class VideoValidationError(ValueError):
    """Media is unusable; ``code`` is a stable machine-readable reason."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


class FfmpegUnavailableError(RuntimeError):
    """ffmpeg/ffprobe missing from PATH."""


class CvRunner(Protocol):
    def run(self, images: list[bytes]) -> dict: ...


@dataclass(frozen=True)
class Frame:
    frame_id: str
    timestamp_seconds: float
    jpeg: bytes
    sharpness: float
    brightness: float
    dhash: np.ndarray = field(repr=False, compare=False)


@dataclass(frozen=True)
class FrameSelection:
    frames_sampled: int
    selected: list[Frame]
    warnings: list[str]


def _run(cmd: list[str], timeout: float) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(cmd, capture_output=True, timeout=timeout)
    except FileNotFoundError as exc:
        raise FfmpegUnavailableError(f"{cmd[0]} not found in PATH") from exc
    except subprocess.TimeoutExpired as exc:
        raise VideoValidationError("processing_timeout", f"{cmd[0]} timed out") from exc


def probe_video(path: str) -> dict:
    """Inspect real media with ffprobe and enforce the MVP policy."""
    proc = _run(
        [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=codec_name,width,height:format=duration,size",
            "-of", "json", path,
        ],
        timeout=10,
    )
    try:
        info = json.loads(proc.stdout or b"{}")
        stream = info["streams"][0]
        duration = float(info["format"]["duration"])
        width, height = int(stream["width"]), int(stream["height"])
    except (KeyError, IndexError, ValueError, TypeError) as exc:
        raise VideoValidationError("not_a_video", "File has no readable video stream.") from exc

    codec = str(stream.get("codec_name", "")).lower()
    if codec not in settings.video_allowed_codecs:
        raise VideoValidationError("unsupported_codec", f"Codec '{codec}' is not supported.")
    if not settings.video_min_duration_s <= duration <= settings.video_max_duration_s:
        raise VideoValidationError(
            "invalid_duration",
            f"Duration {duration:.1f}s outside {settings.video_min_duration_s}-{settings.video_max_duration_s}s.",
        )
    if not (settings.video_min_side_px <= min(width, height) and max(width, height) <= settings.video_max_side_px):
        raise VideoValidationError("unsupported_resolution", f"Resolution {width}x{height} is not supported.")
    return {"codec": codec, "width": width, "height": height, "duration": duration}


def _dhash(gray: np.ndarray) -> np.ndarray:
    small = cv2.resize(gray, (9, 8), interpolation=cv2.INTER_AREA)
    return (small[:, 1:] > small[:, :-1]).flatten()


def _extract_candidates(path: str, workdir: str) -> list[Frame]:
    pattern = os.path.join(workdir, "frame_%03d.jpg")
    proc = _run(
        [
            "ffmpeg", "-nostdin", "-v", "error", "-i", path,
            "-vf", f"fps={settings.keyframe_fps},scale=960:960:force_original_aspect_ratio=decrease",
            "-frames:v", str(settings.video_max_candidates), pattern,
        ],
        timeout=settings.video_ffmpeg_timeout_s,
    )
    if proc.returncode != 0:
        logger.warning("ffmpeg decode failed: %s", proc.stderr.decode(errors="replace")[:300])
        raise VideoValidationError("decode_failed", "Video could not be decoded.")

    frames: list[Frame] = []
    for idx in range(settings.video_max_candidates):
        frame_path = pattern % (idx + 1)
        if not os.path.exists(frame_path):
            break
        img = cv2.imread(frame_path)
        if img is None:
            continue
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        with open(frame_path, "rb") as fh:
            jpeg = fh.read()
        frames.append(
            Frame(
                frame_id=f"frame_{idx + 1:03d}",
                timestamp_seconds=round(idx / settings.keyframe_fps, 2),
                jpeg=jpeg,
                sharpness=float(cv2.Laplacian(gray, cv2.CV_64F).var()),
                brightness=float(gray.mean()),
                dhash=_dhash(gray),
            )
        )
    if not frames:
        raise VideoValidationError("decode_failed", "No frames could be extracted.")
    return frames


def select_frames(candidates: list[Frame]) -> FrameSelection:
    """Drop poor frames and near-duplicates, then spread up to N picks over time."""
    warnings: list[str] = []
    usable = [
        f for f in candidates
        if f.sharpness >= settings.video_min_sharpness
        and _MIN_BRIGHTNESS <= f.brightness <= _MAX_BRIGHTNESS
    ]
    if not usable:
        return FrameSelection(len(candidates), [], ["insufficient_visual_quality"])

    kept: list[Frame] = []
    for frame in usable:
        if all(int(np.count_nonzero(frame.dhash != k.dhash)) >= settings.video_dup_hamming for k in kept):
            kept.append(frame)
    if len(kept) < len(usable) / 2:
        warnings.append("mostly_static_footage")

    limit = settings.video_max_selected
    if len(kept) > limit:
        bins = np.array_split(np.arange(len(kept)), limit)
        kept = [max((kept[i] for i in b), key=lambda f: f.sharpness) for b in bins]
    return FrameSelection(len(candidates), kept, warnings)


def select_video_frames(video_bytes: bytes) -> FrameSelection:
    """Validate raw video bytes and return the representative frames."""
    if len(video_bytes) > settings.video_max_bytes:
        raise VideoValidationError("file_too_large", "Video exceeds the size limit.")
    workdir = tempfile.mkdtemp(prefix="vid_")
    path = os.path.join(workdir, f"{uuid.uuid4().hex}.mp4")
    try:
        with open(path, "wb") as fh:
            fh.write(video_bytes)
        probe_video(path)
        return select_frames(_extract_candidates(path, workdir))
    finally:
        for name in os.listdir(workdir):
            try:
                os.unlink(os.path.join(workdir, name))
            except OSError:
                pass
        try:
            os.rmdir(workdir)
        except OSError:
            pass


def _is_present(result: dict) -> bool:
    return result.get("value") is True or result.get("value") == "present"


def aggregate_visual_observations(frame_results: list[tuple[Frame, dict]]) -> dict:
    """
    Conservative video-level suggestions. A feature absent from every frame is
    ``unknown`` (the camera may have panned away), never ``absent``. Detector
    confidence is kept only as per-frame provenance, never averaged.
    """
    suggestions: dict[str, dict] = {}
    for out_key, cv_key in _SUGGESTION_KEYS.items():
        evidence = [
            {
                "frame_id": frame.frame_id,
                "timestamp_seconds": frame.timestamp_seconds,
                "detector_confidence": result[cv_key].get("confidence", 0.0),
            }
            for frame, result in frame_results
            if _is_present(result.get(cv_key, {}))
        ]
        suggestions[out_key] = {
            "value": "suggested_present" if evidence else "unknown",
            "evidence": evidence,
        }
    return suggestions


def analyze_video(video_bytes: bytes, cv_pipeline: CvRunner) -> dict:
    """Blocking end-to-end video pre-scan; run in a worker thread."""
    selection = select_video_frames(video_bytes)
    response = {
        "processing_status": "completed" if selection.selected else "insufficient_visual_quality",
        "media_kind": "video",
        "frames_sampled": selection.frames_sampled,
        "frames_analyzed": len(selection.selected),
        "suggestions": {},
        "measurements": {
            "door_clear_width": {"status": "unmeasured"},
            "ramp_slope": {"status": "unmeasured"},
        },
        "compliance": {"door_width_compliant": "unknown", "ramp_slope_compliant": "unknown"},
        "warnings": selection.warnings,
        "requires_user_confirmation": True,
    }
    if not selection.selected:
        return response

    frame_results = [(f, cv_pipeline.run([f.jpeg])) for f in selection.selected]
    response["suggestions"] = aggregate_visual_observations(frame_results)
    return response
