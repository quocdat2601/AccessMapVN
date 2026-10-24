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

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.api.pre_scan import _cv_pipeline
from app.config import settings
from app.core.logging import get_logger
from app.schemas import VideoPreScanResponse
from app.services.media.video_pipeline import (
    FfmpegUnavailableError,
    VideoValidationError,
    analyze_video,
)

logger = get_logger(__name__)
router = APIRouter(tags=["pre-scan"])

_slots = asyncio.Semaphore(settings.video_max_concurrency)


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
