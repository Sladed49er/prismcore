# Prism Core — Build Plan

*Started 2026-05-16. Target: PIA conference demo June 3, 2026 (18 days).*

## Decision record

- **Scope:** Full core rebuild — rebuild the *kernel* (the composer core), pour the
  existing modules in. Not a from-scratch rewrite of working modules.
- **Strategy:** Strangler pattern. `prismcore` is a NEW repo built alongside the live
  apps. `prismams` (serves PIA/Kim) and `voip-middleware-portal` (serves Mitchell Reed)
  keep running untouched. Per-tenant cutover switch when modules are proven.
- **June 3 = demo, not cutover.** Demo runs on a clean Prism Core demo tenant. No
  paying customer's production moves until after the conference.
- **CallIntel:** New-branded voice app (`apps/voice`) reimplements the VoIP↔AMS
  middleware on the shared Drizzle stack, keeping the screen-pop endpoint contract
  wire-compatible. Repoint Mitchell Reed's webhook only when proven. Brand name TBD.
- **Pillars for the June 3 demo:** (1) software-picker composer, (2) self-service
  customization, (3) API clearinghouse/marketplace, (4) CallIntel inside Prism.

## Architecture

New repo `prismcore` — Turborepo monorepo. Stack inherited from PrismAMS:
Next.js 16, React 19, Drizzle + Neon Postgres, Clerk, tRPC, shadcn/Tailwind v4.

```
prismcore/
  apps/core/             Kernel + the new shell. Composer is the front door, not the CRM.
  apps/voice/            New-branded CallIntel (VoIP<->AMS middleware, Drizzle).
  packages/module-sdk/   The module contract every module implements.
  packages/db/           Shared Drizzle schema, one Neon instance.
  packages/modules/*     The 35 PrismAMS modules, ported onto the SDK contract.
  docs/compliance/       Compliance binder, migrated/extended from prismams.
  marketing/             Dynamic marketing-materials folder.
```

### The kernel — what we build NEW

1. **Module registry + runtime loader.** Modules self-register; routes, navigation,
   and permissions are generated dynamically. Replaces the hardcoded feature enum.
   This is the foundation for plugins and the marketplace.
2. **Composer onboarding.** "Do you need a CRM? VoIP? Document processing?" picker →
   provisions a tenant with exactly the chosen modules.
3. **Customization engine.** Per-tenant no-code: custom fields, form builder, workflow
   builder. Builds on PrismAMS's existing `custom_fields` JSONB, intake-form and
   report builders — promoted to a first-class scaffolding layer.
4. **API gateway + clearinghouse.** Universal API ingestion, no fees/per-call charges.
   Carrier/MGA registry that grows into the marketplace.

### What we DON'T rebuild

The 35 PrismAMS modules. They're already structured as `{service, schemas, index}`.
They adapt to the module-SDK contract and get poured in. Multi-tenancy (RLS,
`tenantProcedure`, per-request tenant context) carries over as-is — it's solid.

## 18-day milestones

| Days | Milestone | Status |
|------|-----------|--------|
| 1–2  | Repo scaffold, module-SDK contract, `packages/db` (kernel schema) | ✅ 2026-05-16 |
| 3–6  | Kernel: registry + runtime loader + new shell; composer onboarding skeleton | ✅ 2026-05-16 |
| 7–10 | Pour in AMS modules onto the SDK; customization engine MVP (fields + forms) | 🔄 catalog + Neon/DB done 2026-05-16; guided onboarding + customization engine next |
| 11–14| API clearinghouse MVP + carrier marketplace stub; `apps/voice` screen-pop demo | todo |
| 15–17| Demo tenant — all 4 pillars working end-to-end; marketing capture | todo |
| 18   | Dry run with Tony | todo |

## Open items / TBD

- Brand name for the new-branded CallIntel voice app.
- Pricing model: per-user, per-module, monthly. Stripe + ACH (Kim prefers ACH).
- Compliance binder migration from `prismams/docs/compliance/` to the new core.
- DB consolidation: `voip-middleware-portal` is on Prisma; new `apps/voice` is Drizzle
  from the start, so no migration of the live CI app — it's a parallel build.

## Progress log

### Days 1–2 — 2026-05-16 ✅

Monorepo scaffolded and verified (typecheck + production build both green).

- **Turborepo** monorepo, npm workspaces. `apps/core`, `apps/voice` (placeholder),
  `packages/module-sdk`, `packages/db`.
- **`@prismcore/module-sdk`** — the module contract. `ModuleDefinition` (id, category,
  deps, nav, routes, permissions, customizable entities, lazy router, pricing,
  lifecycle hooks) + `ModuleRegistry` (dependency-ordered resolution with cycle
  detection, composer filter, nav builder, route→module mapping). This is the spine
  of the kernel — get it right and the next 16 days flow through it.
- **`@prismcore/db`** — shared Drizzle schema + the two-client RLS connection pattern
  carried over from PrismAMS (`adminDb` BYPASSRLS / `appDb` NOBYPASSRLS +
  `withTenantContext`). Kernel schema only so far: `tenants`, `users`, and
  **`tenant_modules`** — the table that replaces PrismAMS's hardcoded feature
  booleans with runtime module enablement. Module-owned tables get poured in Days 7–10.
- **`apps/core`** — Next.js 16 app booting on the kernel. The home page renders the
  composer's module grid live from the registry (proves the contract end-to-end).
- Stack pinned to PrismAMS's known-good versions (Next 16.2.1, React 19.2.4,
  drizzle-orm 0.45.2, etc.).

Verification: `npm run typecheck` — 4/4 packages clean. `npm run build` — `apps/core`
compiles, `/` prerenders static.

**Repo & deploy** — renamed `prism-core` → `prismcore`. GitHub: `Sladed49er/prismcore`
(public). Live on Vercel: https://prismcore-gray.vercel.app — monorepo, project root
directory `apps/core`, deployment protection disabled (public).

### Days 3–6 — 2026-05-16 ✅

Kernel runtime loader, registry-driven shell, and composer onboarding — live.

- **Runtime loader** (`lib/kernel.ts`) — `loadTenant()` resolves a tenant's enabled
  module ids against the registry into ordered modules + a navigation tree.
  `requireModule()` enforces route→module gating: a page 404s unless the tenant has
  that module enabled.
- **Shell** (`app/(shell)/` route group) — sidebar generated from
  `registry.navFor()`; add a module to a tenant and its nav entry appears with no
  shell change. Module pages for `clients` / `documents` / `calls`, each guarded.
- **Composer** (`/compose`) — pick modules as cards; dependency closure is computed
  live (selecting Call Center auto-adds Clients), price totals update, and the
  `createWorkspace` server action provisions the workspace.
- **Tenant seam** (`lib/tenant.ts`, `current-tenant.ts`) — workspace is cookie-backed
  for now; swaps to Drizzle `tenants`/`tenant_modules` when Neon is provisioned, with
  no change to the kernel, shell, or composer.

Verification: typecheck 4/4, build green (8 routes). Live and confirmed at
https://prismcore-gray.vercel.app — `/`, `/compose`, `/dashboard`, `/clients`,
`/documents`, `/calls` all 200. Auto-deploys on push (GitHub→Vercel connected).

**Next — before Days 7–10:** provision a Neon Postgres database (Vercel Marketplace)
so the kernel loader, composer, and tenant seam move off the cookie onto real
`tenants`/`tenant_modules` rows. Required before pouring in module-owned schema.

### Days 7–10 (part 1) — 2026-05-16 🔄

Full module catalog poured in — live and verified.

- **`modules/catalog.ts`** — all 33 PrismAMS modules ported onto the module-SDK
  contract (id, category, dependencies, pricing, customizable entities) plus **Call
  Center** (CallIntel) and the **API Clearinghouse**. 36 modules across 7 categories.
  The composer now offers the real product surface; the home page reports it live
  from the registry.
- **Unified module routing** — every module routes through `/m/[module]`; one generic
  shell page replaced the bespoke per-module pages. `requireModule()` gating verified:
  `/m/policies` renders for the demo tenant, `/m/bookscan` 404s (not enabled).
- **Composer** grouped by category with a sticky create bar; `module-icon` does
  dynamic lucide lookup so 36 modules need zero hand-wired imports.
- **Kernel migration generated** — `packages/db/drizzle/0000_*.sql` (tenants, users,
  tenant_modules). Ready to apply with `npm run db:migrate -w @prismcore/db` once
  Neon is connected.

Verification: typecheck 4/4, build green (4 routes), live at
https://prismcore-gray.vercel.app.

**Still open in Days 7–10:**
- Provision Neon (Vercel Marketplace) — needs a one-time browser step:
  `vercel integration add neon` from the repo. Then move the tenant seam off the
  cookie onto real `tenants`/`tenant_modules` rows + apply the migration.
- Customization engine MVP — per-tenant custom fields on the entities each module
  declares via `customizableEntities`.
- Pour in real module service/schema implementations (module by module, behind the
  contract — the catalog metadata is in place; the logic follows).

### Days 7–10 (part 2) — 2026-05-16 ✅ Neon + DB persistence

- Provisioned Neon project `prismcore-db`; applied the kernel migration
  (`tenants`, `users`, `tenant_modules`); `DATABASE_URL` set on the Vercel project.
- Tenant seam swapped off the cookie — `tenant-store.ts` does DB-backed
  `createTenant` / `getTenantById` / demo-tenant seeding via `@prismcore/db`.
  The workspace cookie now holds only a tenant id; the composer provisions real
  `tenants` + `tenant_modules` rows.
- `@prismcore/db`: `ws` fallback for the Neon socket driver on runtimes without
  a global `WebSocket`.
- Verified live: `/dashboard` on the deployment seeds and renders the demo
  tenant from Neon.

Open / deferred: RLS policies on the kernel tables and a `DATABASE_URL_APP`
NOBYPASSRLS app role (hardening — no real tenant data in the DB yet).

## Reference

- Source survey: PrismAMS = `~/Tresorit/ClaudeProjects/prismams/` (Next.js 16, 35
  modules, RLS multi-tenancy, 25-module feature-flag system).
- CallIntel = `voip-middleware-portal/` (Prisma) + `prism-receptionist/` (AI voice).
- Vision / why: `marketing/WHY.md`.
