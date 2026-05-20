# prismcore

The composable multi-tenant platform for independent insurance agencies — built
*alongside* the live `prismams` + `voip-middleware-portal` apps with no cutover
yet (strangler pattern). GitHub: `Sladed49er/prismcore`.

## Stack
Next.js 16 · React 19 · TypeScript 5.7 · Drizzle ORM 0.45 · Neon Postgres ·
Clerk auth · tRPC · Tailwind v4 · Stripe · Anthropic SDK. Node ≥20.

## Repo shape — Turborepo + npm workspaces (NOT pnpm)
Single root `package-lock.json`. `npm install` at the root installs everything.

```
apps/core           Kernel + composer shell (Next.js app — the front door)
apps/voice          CallIntel — new-branded VoIP↔AMS middleware (rebuild of voip-middleware-portal)
packages/db         Shared Drizzle schema + RLS-bound connections
packages/module-sdk Module contract — ModuleDefinition + ModuleRegistry
```

## Commands
- `npm run dev` — `turbo dev` (all apps in parallel)
- `npm run build` — `turbo build`
- `npm run typecheck` — `turbo typecheck`
- In `packages/db`: `db:generate`, `db:migrate`, `db:studio` (Drizzle Kit)

## Deploy
**Vercel**, project name `prismcore` (`.vercel/project.json`). Push to `main` →
auto-deploy. Never `vercel --prod` from a local checkout (stale-checkout deploys
have frozen production on other projects).

## Env vars
- `DATABASE_URL` — Neon admin (migrations only, BYPASSRLS)
- `DATABASE_URL_APP` — Neon app runtime (NOBYPASSRLS; falls back to `DATABASE_URL`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`

## Gotchas
- **Two-client RLS pattern**: admin client bypasses RLS for migrations;
  app client uses `withTenantContext` and respects RLS. Don't mix them.
- **Modules self-register** via `ModuleRegistry` with dependency-order + cycle
  detection. Per-tenant enable/disable lives in the `tenant_modules` table —
  runtime, not compile-time.
- **CallIntel screen-pop contract** must stay wire-compatible with the legacy
  middleware until cutover.
- **Demo target**: June 3 2026 on a clean tenant; no prod data migration until
  after the conference.

## Per machine
`node_modules` is not synced (and shouldn't be) — `npm install` on every
machine. See parent `../CLAUDE.md` for the cross-machine convention.
