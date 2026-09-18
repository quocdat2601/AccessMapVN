# AccessMapVN

AccessMapVN is a multi-service graduation project for collecting and presenting accessibility
information about places in Vietnam. This repository is organized as a monorepo, but each service
owns its runtime, dependencies, and deployment lifecycle.

Currently, only the Expo mobile application is implemented. The other directories reserve clear
ownership boundaries for future work.

## Repository structure

| Directory | Responsibility | Status |
| --- | --- | --- |
| `mobile/` | Expo React Native application used by end users | Active |
| `backend/` | Future ASP.NET Core Web API and core server-side business logic | Not initialized |
| `web-admin/` | Future Next.js administration portal | Not initialized |
| `ai-service/` | Future Python/FastAPI AI capabilities | Not initialized |
| `infra/` | Future deployment, infrastructure, and DevOps configuration | Not initialized |

## Service boundaries

- Each service keeps its own source code, configuration, dependencies, and documentation.
- Services communicate through agreed APIs; they must not import source code from another service.
- The mobile and web clients must not access service databases directly.
- API contracts should be agreed by the affected teams before dependent work is merged.
- Secrets and local environment files must never be committed.

No root workspace or shared runtime package is configured. Add service tooling only when that
service is initialized and the team has agreed on it.

## Run the mobile application

From the repository root:

```bash
cd mobile
npm install
npm start
```

See the [mobile onboarding guide](mobile/README.md) for Expo Go setup, architecture rules, naming
conventions, and the frontend/backend boundary.
