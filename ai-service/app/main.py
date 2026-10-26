"""
main.py
-------
FastAPI application entry-point.
Registers all routers, middleware, and startup/shutdown lifecycle hooks.
"""
from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import pre_scan, verify, blur, video_pre_scan
from app.config import settings
from app.core.logging import get_logger
from app.schemas import HealthResponse, ReadinessResponse

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm-up heavy models on startup so the first request is fast."""
    logger.info("Starting %s …", settings.app_name)

    # Lazy-import pipelines to trigger model loading once at startup
    try:
        from app.services.cv.pipeline import CVPipeline       # noqa: F401
        from app.services.nlp.pipeline import NLPPipeline     # noqa: F401
        logger.info("Pipelines initialised successfully.")
    except Exception as exc:
        logger.warning("Pipeline pre-load failed (models may be missing): %s", exc)

    yield  # application runs

    logger.info("Shutting down %s.", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="AI microservice for AccessMap VN – WF-01 Contributor Data Submission",
    lifespan=lifespan,
    debug=settings.debug,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request timing middleware ──────────────────────────────────────────────────
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = time.perf_counter() - start
    response.headers["X-Process-Time"] = f"{elapsed:.4f}s"
    logger.debug("%s %s → %s (%.4fs)", request.method, request.url.path, response.status_code, elapsed)
    return response


# ── Global exception handler ───────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error", "error": str(exc)})


# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1/ai"
app.include_router(pre_scan.router, prefix=API_PREFIX)
app.include_router(video_pre_scan.router, prefix=API_PREFIX)
app.include_router(verify.router,   prefix=API_PREFIX)
app.include_router(blur.router,     prefix=API_PREFIX)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health() -> HealthResponse:
    """Liveness probe – returns 200 when the service is up."""
    return HealthResponse()


@app.get("/health/ready", response_model=ReadinessResponse, tags=["health"])
async def health_ready(response: Response) -> ReadinessResponse:
    """
    Readiness probe – returns 200 when required AI models (ramp, step, door)
    are successfully loaded into memory and ready to serve inference.
    Returns 503 if any required model is unavailable or failed to load.
    """
    try:
        from app.api.pre_scan import _cv_pipeline
        readiness = _cv_pipeline.get_readiness()
    except Exception as exc:
        logger.error("Readiness check encountered an error: %s", exc)
        readiness = {
            "status": "not_ready",
            "required_models_loaded": False,
            "detectors": {},
        }

    if not readiness.get("required_models_loaded", False):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return ReadinessResponse(
        status=readiness.get("status", "not_ready"),
        version="1.0.0",
        required_models_loaded=readiness.get("required_models_loaded", False),
        detectors=readiness.get("detectors", {}),
    )
