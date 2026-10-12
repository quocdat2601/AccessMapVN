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

class FeatureStatus(str, Enum):
    present = "present"
    absent  = "absent"
    unknown = "unknown"


class FeatureResult(BaseModel):
    """Generic result for a single detected accessibility feature with evidence provenance."""
    value: str = FeatureStatus.unknown      # "present" | "absent" | "unknown"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    method: str = "detector"                # "detector" | "vlm" | "unmeasured" | "heuristic" | "user_report"
    evidence: list[str] = Field(default_factory=list)
    reason: str | None = None
    extra: dict[str, Any] = Field(default_factory=dict)


class StepFeatureResult(FeatureResult):
    """Extends FeatureResult with an optional step count estimate."""
    step_count_estimate: int | None = None


class FeaturesDict(BaseModel):
    # Perception vs Compliance separation
    exterior_ramp_present:    FeatureResult
    ramp_slope_compliant:     FeatureResult = Field(
        default_factory=lambda: FeatureResult(
            value=FeatureStatus.unknown,
            confidence=0.0,
            method="unmeasured",
            reason="Cần đo đạc thực địa hoặc nhập kích thước chiều cao/chiều dài dốc"
        )
    )
    steps_present:            StepFeatureResult
    elevator_present:         FeatureResult
    door_detected:            FeatureResult = Field(
        default_factory=lambda: FeatureResult(
            value=FeatureStatus.unknown,
            confidence=0.0,
            method="detector",
            reason="Chưa phân tích cửa"
        )
    )
    door_width_compliant:     FeatureResult = Field(
        default_factory=lambda: FeatureResult(
            value=FeatureStatus.unknown,
            confidence=0.0,
            method="unmeasured",
            reason="Không thể đo chiều rộng chính xác từ ảnh 2D đơn lẻ"
        )
    )
    door_width_ok:            FeatureResult  # Kept for legacy client compatibility
    accessible_restroom_sign: FeatureResult
    tactile_paving_present:   FeatureResult


# ── Pre-scan ───────────────────────────────────────────────────────────────────

class PreScanResponse(BaseModel):
    """Response from POST /api/v1/ai/pre-scan"""
    analysis_status: str = "completed"
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
    analysis_status:         str = "completed"
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
