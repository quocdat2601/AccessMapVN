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
database name, username and password from `infra/.env`. To migrate and add the idempotent WF-02
demo location, run from the repository root:

```powershell
npm run db:seed:wf02
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
