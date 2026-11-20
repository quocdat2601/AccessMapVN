# AccessMapVN

AccessMapVN is a multi-service platform for collecting, reviewing, and publishing accessibility
information about places in Vietnam.

## Services

| Directory | Responsibility |
| --- | --- |
| `mobile/` | Expo SDK 57 application for public map reads, accessibility contributions, and community votes, reports, timeline, and comments |
| `backend/` | ASP.NET Core 8 API, PostgreSQL persistence, publication rules, moderation, and background jobs |
| `web-admin/` | Next.js administration portal for authenticated review and moderation |
| `ai-service/` | FastAPI media pre-scan/verification used only by the contribution evidence pipeline |
| `infra/` | Local PostgreSQL/PostGIS and private S3-compatible object-storage development stack |

The mobile and admin clients call the API; they do not read or write application tables directly.
Supabase owns user authentication, while the backend derives the actor from the verified JWT
subject and enforces application roles and policies server-side.

## Local Setup & First-Time Install

Requirements: Node `22.13.x`, .NET 8 SDK, Python `3.11+`, and Docker (plus Android SDK `adb` / `scrcpy` if testing on a physical phone over USB).

### 1. Copy Environment Files (Fresh Clone)

```powershell
Copy-Item infra/.env.example infra/.env
Copy-Item ai-service/.env.example ai-service/.env
Copy-Item mobile/.env.example mobile/.env
Copy-Item web-admin/.env.example web-admin/.env.local
```

### 2. Install Dependencies (Run Whenever Pulling New Dependencies)

```powershell
# Monorepo root, Mobile, and Web Admin (Node)
npm install
npm --prefix mobile install
npm --prefix web-admin install

# Backend (.NET 8)
dotnet restore backend/AccessMapVN.sln

# AI Service (Python venv + model weights)
python -m venv ai-service/.venv
& "ai-service\.venv\Scripts\python.exe" -m pip install -r ai-service/requirements.txt
```

> Ensure the primary YOLO weights file `accessibility_v8s.pt` is present under `ai-service/models/yolo/` before starting `ai-service` (`ramp.pt` and `step.pt` are only used as fallback if `accessibility_v8s.pt` is absent).

## Running Each Module

From the repository root, run each service individually in separate terminals (or use the Docker / production commands when deploying):

### 1. Infrastructure (Local PostgreSQL + PostGIS & Adminer)

```powershell
npm run dev:infra          # Start infra/docker-compose.dev.yml
npm run db:migrate:local   # Apply local SQL migrations
npm run db:seed:community  # Seed sample WF-01/WF-02 places & reports
npm run db:seed:admin      # Create/reset admin login account
npm run db:tables          # Inspect migrated tables
npm run dev:infra:down     # Stop containers
```

### 2. Backend (`http://localhost:5256`)

- **Local dev:** `npm run dev:backend` (runs `scripts/dev-backend.mjs` via `dotnet run --project backend/src/WebApi`)
- **Production publish / deploy:**
  ```powershell
  dotnet publish backend/src/WebApi/AccessMapVN.WebApi.csproj -c Release -o publish/backend
  dotnet publish/backend/AccessMapVN.WebApi.dll
  ```

### 3. AI Service (`http://localhost:8000`)

- **Local Python venv (fastest, no Docker, hot-reload):**
  ```powershell
  npm run dev:ai:local
  # Equivalent: cd ai-service && .venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  ```
- **Docker Compose (AI + local MinIO S3):**
  ```powershell
  npm run dev:ai
  ```
- **Standalone Container Build / Deploy (`ai-service/Dockerfile`):**
  ```powershell
  docker build -t accessmap-ai:latest ai-service
  docker run --rm -p 8000:8000 --env-file ai-service/.env -v "${PWD}/ai-service/models:/service/models:ro" accessmap-ai:latest
  ```
  - Probe readiness on `GET http://localhost:8000/health/ready` (`"status": "ready"`).

### 4. Web Admin (`http://localhost:3000`)

- **Local dev:**
  ```powershell
  npm --prefix web-admin run dev
  ```
- **Production build & start (deploy):**
  ```powershell
  npm --prefix web-admin run build
  npm --prefix web-admin run start
  ```

### 5. Mobile App (`mobile/` — Expo SDK 57, port `8081`)

- **Option A — Wi-Fi LAN (dev client already installed on phone):**
  ```powershell
  npm --prefix mobile start
  ```
  Scan the QR code in the dev client; `client.ts` resolves the laptop's LAN IP for `:5256` (API) and `:8000` (AI).
- **Option B — USB + ADB (needed to install/rebuild native client or bypass LAN firewall):**
  ```powershell
  npm run device:ports       # adb reverse tcp:8081, tcp:5256, tcp:8000
  npm --prefix mobile run android   # First-time native Android dev build
  ```
  *(If connecting Metro purely via `localhost:8081` over USB on a physical phone, add `EXPO_PUBLIC_API_URL=http://localhost:5256` and `EXPO_PUBLIC_AI_SERVICE_URL=http://localhost:8000` to `mobile/.env`.)*
- **Optional — Mirror & capture phone screen on laptop:**
  ```powershell
  scrcpy --stay-awake --max-size 1280
  ```

### Combined Root Shortcuts

*(These orchestrator scripts start `ai-service` via Docker `npm run dev:ai`; run terminals manually with `npm run dev:ai:local` if you prefer local Python venv.)*

- `npm run web` — Backend + Web Admin
- `npm run mobile` — Optional ADB reverse + Backend + AI (Docker) + Mobile
- `npm run mobile:device` — Required ADB reverse + Backend + AI (Docker) + Mobile
- `npm run all` — Full stack via `concurrently`

Supply Supabase, storage, and notification credentials through local environment files or the deployment secret store. Never commit service-role keys, database passwords, or signing secrets.

## Community validation safety boundaries

- A quick community vote or detailed Report never changes a published feature, contribution confidence,
  or EXP.
- Only the contribution publication service can append a published `LocationFeature` version.
- Reports remain separate from vote consensus, and private notes/evidence are never exposed by
  public endpoints.
- Crowd auto-resolution, vote rewards/penalties, tier multipliers, and contribution confidence feedback
  are disabled for the initial policy.
- Schema changes are EF Core migrations; production applies them as a deployment step.

## Verification

```powershell
# Backend
dotnet test backend/tests/UnitTests/AccessMapVN.UnitTests.csproj --verbosity minimal
# Full solution release test:
npm run check:backend

# AI Service
& "ai-service\.venv\Scripts\python.exe" -m unittest discover -s ai-service/tests -p "test_*.py"

# Mobile
npm --prefix mobile run typecheck
npm --prefix mobile test
# Or full mobile check (typecheck + lint + unit tests + expo-doctor):
npm run check:mobile

# Web Admin
npm --prefix web-admin run typecheck
npm --prefix web-admin test
npm --prefix web-admin run lint
# Or full web check (typecheck + lint + build + test):
npm run check:web
```

The CI workflow also runs `ai-service` unit tests, applies migrations to a clean PostgreSQL/PostGIS database, and verifies `web-admin` and `mobile`.
