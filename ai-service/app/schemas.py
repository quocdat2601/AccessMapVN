"""
schemas.py
----------
Pydantic models for all request/response bodies used by the API layer.
"""
from __future__ import annotations

from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


# ── Shared feature structures ──────────────────────────────────────────────────

class FeatureResult(BaseModel):
    """Generic result for a single detected accessibility feature."""
    value: bool | str        # True/False or "unknown"
    confidence: float = Field(ge=0.0, le=1.0)
    extra: dict[str, Any] = Field(default_factory=dict)


class StepFeatureResult(FeatureResult):
    """Extends FeatureResult with an optional step count estimate."""
    step_count_estimate: int | None = None


class FeaturesDict(BaseModel):
    exterior_ramp_present:   FeatureResult
    steps_present:           StepFeatureResult
    elevator_present:        FeatureResult
    door_width_ok:           FeatureResult
    accessible_restroom_sign: FeatureResult
    tactile_paving_present:  FeatureResult


# ── Pre-scan ───────────────────────────────────────────────────────────────────

class PreScanResponse(BaseModel):
    """Response from POST /api/v1/ai/pre-scan"""
    features: FeaturesDict
    summary:  str


# ── Verify ─────────────────────────────────────────────────────────────────────

class Recommendation(str, Enum):
    auto_verify        = "auto_verify"
    pending_moderation = "pending_moderation"
    awaiting_more_info = "awaiting_more_info"


class VerifyRequest(BaseModel):
    """Request body for POST /api/v1/ai/verify"""
    submission_id:    UUID
    location_id:      UUID
    media_urls:       list[str] = Field(..., min_length=1)
    text_description: str | None = None


class VerifyResponse(BaseModel):
    """Response from POST /api/v1/ai/verify"""
    submission_id:           UUID
    features:                FeaturesDict
    overall_confidence_score: float = Field(ge=0.0, le=1.0)
    recommendation:          Recommendation


# ── Blur ───────────────────────────────────────────────────────────────────────

class BlurResponse(BaseModel):
    """Response from POST /api/v1/ai/blur"""
    faces_detected: int
    blurred_image_url: str | None = None   # set when uploaded to S3
    # If not uploaded, raw bytes are returned directly (application/octet-stream)


# ── Health ─────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
