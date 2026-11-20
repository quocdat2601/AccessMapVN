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

## Local setup

Requirements: Node `22.13.x`, .NET 8 SDK, Python 3.11+, and Docker.

```powershell
Copy-Item infra/.env.example infra/.env
Copy-Item mobile/.env.example mobile/.env
Copy-Item web-admin/.env.example web-admin/.env.local
npm install
npm --prefix mobile install
npm --prefix web-admin install
npm run dev:infra
```

Run the application surfaces from separate terminals:

```powershell
npm run dev:backend
npm --prefix mobile start
npm --prefix web-admin run dev
```

Supply Supabase, storage, and notification credentials through local environment files or the
deployment secret store. Never commit service-role keys, database passwords, or signing secrets.

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
npm run check:backend
npm run check:mobile
npm run check:web
```

The CI workflow also applies migrations to a clean PostgreSQL/PostGIS database and runs Expo
Doctor against the pinned SDK 57 dependency set.
