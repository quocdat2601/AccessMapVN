"""
api/verify.py
-------------
POST /api/v1/ai/verify
Asynchronous endpoint called by the ASP.NET Core Hangfire worker.
Downloads media from signed S3 URLs, extracts keyframes from videos,
runs the full CV + NLP pipeline, and computes a confidence score.
"""
from __future__ import annotations

import asyncio
import time

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from app.config import settings
from app.core.logging import get_logger
from app.core.s3_client import download_url
from app.schemas import VerifyRequest, VerifyResponse
from app.services.cv.pipeline import CVPipeline
from app.services.media.image_utils import validate_and_preprocess
from app.services.media.video_pipeline import select_video_frames
from app.services.nlp.pipeline import NLPPipeline
from app.services.scoring.scorer import Scorer

logger = get_logger(__name__)
router = APIRouter(tags=["verify"])

_cv_pipeline  = CVPipeline()
_nlp_pipeline = NLPPipeline()
_scorer       = Scorer()

# File extension helpers
_VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def _is_video(url: str) -> bool:
    from pathlib import PurePosixPath
    suffix = PurePosixPath(url.split("?")[0]).suffix.lower()
    return suffix in _VIDEO_EXTS


async def _collect_frames(url: str) -> list[bytes]:
    """Download a media URL and return a list of image-byte frames."""
    raw = await download_url(url)
    if _is_video(url):
        selection = await asyncio.to_thread(select_video_frames, raw)
        frames = [frame.jpeg for frame in selection.selected]
        logger.info("Selected %d representative frames from video %s", len(frames), url)
        return frames
    # Plain image
    try:
        return [validate_and_preprocess(raw, max_dim=1280)]
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Media from '{url}' is corrupted or invalid: {exc}",
        )


@router.post(
    "/verify",
    response_model=VerifyResponse,
    summary="Full accessibility verification of a submission (called by backend worker)",
)
async def verify(payload: VerifyRequest) -> VerifyResponse:
    """
    Download media, extract keyframes, run CV + NLP, and return a confidence score.

    - **submission_id**: UUID of the submission being verified.
    - **media_urls**: signed S3/MinIO URLs (images or videos).
    - **text_description**: optional Vietnamese text to analyse.
    """
    t0 = time.perf_counter()
    logger.info("verify started for submission %s", payload.submission_id)

    # ── Download & unpack all media concurrently ─────────────────────────────
    frame_batches = await asyncio.gather(
        *[_collect_frames(url) for url in payload.media_urls],
        return_exceptions=True,
    )

    all_frames: list[bytes] = []
    for idx, result in enumerate(frame_batches):
        if isinstance(result, Exception):
            logger.warning("Failed to download media[%d]: %s", idx, result)
        else:
            all_frames.extend(result)

    if not all_frames:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No usable frames could be extracted from the provided media URLs.",
        )

    async def _noop() -> None:
        return None

    loop = asyncio.get_event_loop()
    cv_task  = loop.run_in_executor(None, _cv_pipeline.run, all_frames)
    nlp_task = (
        loop.run_in_executor(None, _nlp_pipeline.run, payload.text_description)
        if payload.text_description
        else _noop()
    )
    cv_result, nlp_result = await asyncio.gather(cv_task, nlp_task)

    # ── Standardized visual suggestions & user claims ────────────────────────
    visual_suggestions = _scorer.extract_visual_suggestions(cv_result)
    user_claims        = _scorer.extract_user_claims(nlp_result)

    # ── Score ────────────────────────────────────────────────────────────────
    features, overall_score, recommendation = _scorer.compute_verify(cv_result, nlp_result)

    elapsed = time.perf_counter() - t0
    logger.info(
        "verify completed for %s in %.3f s | score=%.3f | rec=%s",
        payload.submission_id,
        elapsed,
        overall_score,
        recommendation,
    )

    has_model_detections = any(s.detector_score is not None for s in visual_suggestions)
    return VerifyResponse(
        submission_id=payload.submission_id,
        analysis_status="completed",
        analysis_method="model" if has_model_detections else "heuristic",
        model_id="yolov8n-accessmap-v1" if has_model_detections else None,
        model_version="1.0.0" if has_model_detections else None,
        image_reference="exif_corrected_original",
        visual_suggestions=visual_suggestions,
        user_claims=user_claims,
        requires_user_confirmation=True,
        warnings=[],
        features=features,
        overall_confidence_score=round(overall_score, 4),
        recommendation=recommendation,
    )
