# ─────────────────────────────────────────────────────────────────────────────
# AccessMap VN – AI Service
# Dockerfile
# ─────────────────────────────────────────────────────────────────────────────

# Use the official slim Python 3.11 image as the base
FROM python:3.11-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ── System dependencies ────────────────────────────────────────────────────────
# ffmpeg:        video decoding
# libgl1:        OpenCV GUI backend (headless opencv doesn't need it but some
#                cv2 internal links still reference libGL)
# libglib2.0-0:  glib dependency for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libgl1 \
        libglib2.0-0 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# ── Install Python dependencies ────────────────────────────────────────────────
WORKDIR /service

COPY requirements.txt .

# Step 1: Install torch CPU-only from the PyTorch wheel index.
RUN pip install --no-cache-dir \
        "torch>=2.1.0,<3" \
        "torchvision>=0.16.0,<1" \
        --index-url https://download.pytorch.org/whl/cpu

# Step 2: Pre-install numpy<2 BEFORE ultralytics/transformers can pull 2.x.
#   opencv-python-headless==4.9 is compiled against numpy 1.x; numpy 2.x
#   causes an _ARRAY_API AttributeError at import time.
RUN pip install --no-cache-dir "numpy>=1.26.4,<2.0"

# Step 3: Install everything else from PyPI (requirements.txt also declares
#   numpy<2.0 as an upper bound, so pip won't upgrade it during resolution).
RUN pip install --no-cache-dir -r requirements.txt

# Step 4: Force headless OpenCV (ultralytics installs the GUI variant).
RUN pip install --no-cache-dir --force-reinstall "opencv-python-headless==4.9.0.80"

# Step 5: Re-pin numpy in case any step above upgraded it to 2.x.
RUN pip install --no-cache-dir "numpy>=1.26.4,<2.0"

# ── Copy application source ────────────────────────────────────────────────────
COPY app/ ./app/

# models/ directory is mounted as a Docker volume in production;
# create an empty placeholder so the path always exists inside the container.
RUN mkdir -p models/yolo models/phobert

# ── Non-root user for security ─────────────────────────────────────────────────
RUN useradd --create-home appuser
USER appuser

# ── Expose port ────────────────────────────────────────────────────────────────
EXPOSE 8000

# ── Healthcheck ────────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# ── Start command ──────────────────────────────────────────────────────────────
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--log-level", "info"]
