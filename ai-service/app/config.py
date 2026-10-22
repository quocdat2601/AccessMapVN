"""
config.py
---------
All runtime configuration is loaded from environment variables.
Provide a .env file (or set variables in Docker) before starting the service.
"""
from __future__ import annotations

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── Service ────────────────────────────────────────────────────────────────
    app_name: str = "AccessMap VN – AI Service"
    debug: bool = False
    log_level: str = "INFO"

    # ── Model paths ────────────────────────────────────────────────────────────
    models_dir: Path = Path("models")

    # YOLOv8 weights (relative to models_dir)
    yolo_ramp_weights: str = "yolo/ramp.pt"
    yolo_step_weights: str = "yolo/step.pt"
    yolo_elevator_weights: str = "yolo/elevator.pt"
    yolo_door_weights: str = "yolo/door.pt"
    yolo_signage_weights: str = "yolo/signage.pt"
    yolo_tactile_weights: str = "yolo/tactile.pt"

    # PhoBERT (HuggingFace local path or hub id)
    phobert_model_path: str = "models/phobert"
    phobert_classifier_labels: list[str] = ["not_accessibility", "accessibility"]

    # ── CV pipeline ────────────────────────────────────────────────────────────
    yolo_conf_threshold: float = 0.45          # minimum detection confidence
    yolo_img_size: int = 640                   # inference resolution

    # Video / keyframe extraction
    keyframe_fps: float = 1.0                  # frames per second to sample
    blur_laplacian_threshold: float = 80.0     # below → too blurry, discard

    # ── Privacy ────────────────────────────────────────────────────────────────
    face_blur_kernel: int = 51                 # Gaussian kernel for blurring faces

    # ── Scoring thresholds ─────────────────────────────────────────────────────
    score_auto_verify: float = 0.90
    score_pending: float = 0.60
    # <0.60 → awaiting_more_info, 0.60–0.89 → pending_moderation, ≥0.90 → auto_verify

    # CV/NLP fusion weights
    cv_weight: float = 0.6
    nlp_weight: float = 0.4

    # ── S3 / MinIO ─────────────────────────────────────────────────────────────
    s3_endpoint_url: str | None = None          # e.g. http://minio:9000 (None → AWS)
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_region: str = "ap-southeast-1"
    s3_bucket: str = "accessmap-media"

    # ── HTTP client ────────────────────────────────────────────────────────────
    backend_base_url: str = "http://backend:8080"
    http_timeout: float = 30.0

    # ── Pre-scan SLA ───────────────────────────────────────────────────────────
    pre_scan_max_images: int = 3
    pre_scan_max_bytes: int = 10 * 1024 * 1024  # 10 MB per image

    @property
    def yolo_weights_path(self) -> dict[str, Path]:
        """Return a mapping of detector name → absolute weight path."""
        base = self.models_dir
        return {
            "ramp":     base / self.yolo_ramp_weights,
            "step":     base / self.yolo_step_weights,
            "elevator": base / self.yolo_elevator_weights,
            "door":     base / self.yolo_door_weights,
            "signage":  base / self.yolo_signage_weights,
            "tactile":  base / self.yolo_tactile_weights,
        }


# Singleton – import this everywhere
settings = Settings()
