# AccessMapVN local infrastructure

The development stack provides PostgreSQL/PostGIS for the API, Hangfire storage and integration
tests, plus local S3-compatible RustFS object storage for owned evidence media. Production can use
AWS S3, Cloudflare R2, or another private S3-compatible provider.

```powershell
Copy-Item infra/.env.example infra/.env
docker compose --env-file infra/.env -f infra/docker-compose.dev.yml up -d
```

Default local service addresses:

- PostgreSQL: `localhost:5432`, database `accessmapvn`
- Database viewer: `http://localhost:8082` (server: `postgres`)
- S3 API: `http://localhost:9000`
- Object-storage console: `http://localhost:9001`

No PostgreSQL desktop application is required. Open the database viewer and sign in with the
database name, username and password from `infra/.env`. To migrate and add the idempotent community
demo location, run from the repository root:

```powershell
npm run db:seed:community
```

To list local tables directly in the terminal:

```powershell
npm run db:tables
```

For a full local mobile session, run `npm run mobile` from the repository root after the
infrastructure is up. Its backend process is explicitly pointed at this local PostgreSQL database,
so it does not write to a Supabase connection that may be saved in your .NET user secrets.

The checked-in defaults are development-only. Production credentials and Supabase/Firebase keys
must be supplied through the deployment secret store and must not be committed.

## IaC Reproducibility & Clean-Machine Rehearsal

To reset and reproduce the local PostGIS + Adminer stack cleanly on a fresh machine (from repo root):

```bash
docker compose -f infra/docker-compose.yml down -v
docker compose -f infra/docker-compose.yml up -d
npm run db:migrate:local
npm run db:seed:community
npm run db:tables
```

- **PostgreSQL + PostGIS**: `localhost:5432` (credentials configured in local `.env` / `infra/docker-compose.yml`).
- **Adminer UI**: `http://localhost:8082` (inspect migrated tables and seeded WF-01/WF-02 records).
- Verify all four application layers after infrastructure startup:
  - Backend: `dotnet test backend/tests/UnitTests/AccessMapVN.UnitTests.csproj`
  - AI Service: `python -m unittest discover -s ai-service/tests -p "test_*.py"`
  - Mobile: `npm --prefix mobile run typecheck && npm --prefix mobile test`
  - Web Admin: `npm run check:web`
