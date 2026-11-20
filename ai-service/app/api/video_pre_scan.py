"""
api/video_pre_scan.py
---------------------
POST /api/v1/ai/pre-scan/video
Bounded request/response preview for a 5-10 s clip: representative frames are
run through the existing image CV pipeline. Persisted submissions are verified
by the durable /verify job instead.
"""
from __future__ import annotations

import asyncio
import time
from urllib.parse import urlparse

from fastapi import APIRouter, File, HTTPException, Response, UploadFile, status
from pydantic import BaseModel

from app.api.pre_scan import _cv_pipeline
from app.config import settings
from app.core.logging import get_logger
from app.core.s3_client import download_url
from app.schemas import VideoPreScanResponse
from app.services.media.video_pipeline import (
    FfmpegUnavailableError,
    VideoValidationError,
    analyze_video,
    extract_poster_frame,
)

logger = get_logger(__name__)
router = APIRouter(tags=["pre-scan"])

_slots = asyncio.Semaphore(settings.video_max_concurrency)
_VIDEO_EXTS = (".mp4", ".mov", ".webm")


class VideoPosterRequest(BaseModel):
    url: str


def _is_allowed_poster_url(raw_url: str) -> bool:
    parsed = urlparse((raw_url or "").strip())
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return False
    host = (parsed.hostname or "").lower()
    path = (parsed.path or "").lower()
    if not path.endswith(_VIDEO_EXTS):
        return False
    if host.endswith(".supabase.co") and "/storage/v1/object/public/contributions-media/" in path:
        return True
    if host in ("localhost", "127.0.0.1") and "/uploads/" in path:
        return True
    return False


@router.post(
    "/video-poster",
    summary="Extract representative JPEG poster frame from an allowed video URL",
)
async def create_video_poster(payload: VideoPosterRequest) -> Response:
    if not _is_allowed_poster_url(payload.url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_video_url", "message": "URL is not an allowed video source."},
        )

    try:
        raw = await download_url(payload.url)
    except Exception as exc:
        logger.warning("Failed to download video for poster from %s: %s", payload.url[:80], exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "download_failed", "message": "Could not download video for poster."},
        )

    try:
        async with _slots:
            jpeg_bytes = await asyncio.wait_for(
                asyncio.to_thread(extract_poster_frame, raw),
                timeout=settings.video_request_timeout_s,
            )
    except VideoValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": exc.code, "message": str(exc)},
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail={"code": "processing_timeout", "message": "Video poster extraction timed out."},
        )

    return Response(content=jpeg_bytes, media_type="image/jpeg")


@router.post(
    "/pre-scan/video",
    response_model=VideoPreScanResponse,
    summary="Frame-based accessibility pre-scan of a short video",
)
async def pre_scan_video(video: UploadFile = File(...)) -> VideoPreScanResponse:
    t0 = time.perf_counter()
    raw = await video.read(settings.video_max_bytes + 1)
    if len(raw) > settings.video_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"code": "file_too_large", "message": "Video exceeds the size limit."},
        )

    try:
        async with _slots:
            result = await asyncio.wait_for(
                asyncio.to_thread(analyze_video, raw, _cv_pipeline),
                timeout=settings.video_request_timeout_s,
            )
    except VideoValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": exc.code, "message": str(exc)},
        )
    except FfmpegUnavailableError as exc:
        logger.error("%s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "video_processing_unavailable", "message": "Video processing is unavailable."},
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail={"code": "processing_timeout", "message": "Video analysis timed out."},
        )

    logger.info("video pre-scan completed in %.3f s", time.perf_counter() - t0)
    return VideoPreScanResponse(**result)
