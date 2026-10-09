# AccessMapVN Admin Portal

Frontend prototype for the AccessMapVN operations team. The app uses Next.js App Router, TypeScript, Tailwind CSS, shadcn-style primitives, Lucide icons, Recharts, and a Feature-Sliced Design structure.

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The root route redirects to the demo login screen; submitting the form opens the dashboard at `/admin` without authentication.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

All dashboard data currently comes from a typed in-memory repository under `src/entities/dashboard/api`. Replace the repository implementation with an ASP.NET Core REST adapter when the backend contract is available.

## Submission management prototype

- List: `/admin/ho-so-dong-gop`
- Detail: `/admin/ho-so-dong-gop/[id]`
- Example states: `SUB-2026-1042` (pending), `SUB-2026-1040` (awaiting more info), `SUB-2026-1035` (published), and `SUB-2026-1032` (rejected).

Submission data and in-session mock transitions live under `src/entities/contribution`. Moderation actions are frontend-only demonstrations and do not represent authoritative business decisions.
