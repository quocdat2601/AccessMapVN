"""
api/pre_scan.py
---------------
POST /api/v1/ai/pre-scan
Synchronous endpoint (<2 s SLA) that runs the CV + NLP pipelines on uploaded
images and optional text, then returns fused accessibility features.
"""
from __future__ import annotations

import asyncio
import time
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.config import settings
from app.core.logging import get_logger
from app.schemas import PreScanResponse
from app.services.cv.pipeline import CVPipeline
from app.services.nlp.pipeline import NLPPipeline
from app.services.scoring.scorer import Scorer
from app.services.media.image_utils import validate_and_preprocess

logger = get_logger(__name__)
router = APIRouter(tags=["pre-scan"])

# Instantiated once (models are loaded at import time inside each class)
_cv_pipeline  = CVPipeline()
_nlp_pipeline = NLPPipeline()
_scorer       = Scorer()


@router.post(
    "/pre-scan",
    response_model=PreScanResponse,
    summary="Quick accessibility pre-scan on uploaded images and text",
)
async def pre_scan(
    images: Annotated[list[UploadFile], File(description="1–3 image files (jpg/png)")],
    text_description: Annotated[str | None, Form()] = None,
) -> PreScanResponse:
    """
    Run CV + NLP pipelines synchronously and return fused accessibility features.

    - **images**: 1 to 3 JPEG/PNG files. Larger images are resized internally.
    - **text_description**: optional Vietnamese free-text description.

    Returns a ``features`` dict and a short Vietnamese summary.
    """
    t0 = time.perf_counter()

    # ── Validation ──────────────────────────────────────────────────────────
    if not images or len(images) > settings.pre_scan_max_images:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Provide 1–{settings.pre_scan_max_images} images.",
        )

    # ── Read & preprocess images ─────────────────────────────────────────────
    image_bytes_list: list[bytes] = []
    for upload in images:
        raw = await upload.read()
        if len(raw) > settings.pre_scan_max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Image '{upload.filename}' exceeds 10 MB limit.",
            )
        preprocessed = validate_and_preprocess(raw, max_dim=1024)
        image_bytes_list.append(preprocessed)

    # ── Run pipelines (in thread pool to not block the event loop) ──────────
    loop = asyncio.get_event_loop()

    async def _noop() -> None:
        return None

    cv_task  = loop.run_in_executor(None, _cv_pipeline.run, image_bytes_list)
    nlp_task = (
        loop.run_in_executor(None, _nlp_pipeline.run, text_description)
        if text_description
        else _noop()
    )

    cv_result, nlp_result = await asyncio.gather(cv_task, nlp_task)

    # ── Fuse & score ─────────────────────────────────────────────────────────
    features, summary = _scorer.fuse_pre_scan(cv_result, nlp_result)

    elapsed = time.perf_counter() - t0
    logger.info("pre-scan completed in %.3f s", elapsed)

    return PreScanResponse(features=features, summary=summary)
