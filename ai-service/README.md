# AccessMapVN AI Service

FastAPI microservice for WF-01 accessibility pre-scan and verification (`uvicorn app.main:app --port 8000`).

## Endpoints
- `POST /api/v1/ai/pre-scan`: synchronous CV + Vietnamese NLP pre-scan on 1–3 images
- `POST /api/v1/ai/pre-scan/video`: sampled frame extraction (`ffmpeg` / OpenCV fallback) + CV suggestions
- `POST /api/v1/ai/verify`: asynchronous submission verification called by Hangfire worker
- `POST /api/v1/ai/blur`: EXIF orientation + privacy blur + SHA-256 provenance headers
- `GET /health` & `GET /health/ready`: liveness and loaded-detector readiness probes

## Models
- YOLOv8 weights under `models/yolo/`: `accessibility_v8s.pt` (door, entrance-door, elevator, restroom signage, ramp/stair fallback), `ramp.pt`, `step.pt`
- Vietnamese NLP extractor & PhoBERT classifier under `models/phobert/` (optional)

## Run
- Local Python venv: `npm run dev:ai:local`
- Docker: `npm run dev:ai`
