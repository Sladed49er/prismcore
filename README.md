# Prism Core

The composable multi-tenant platform for independent insurance agencies.
**Software your way** — the core isn't a CRM, it's the composer.

See [`PLAN.md`](./PLAN.md) for architecture and the build plan, and
[`marketing/WHY.md`](./marketing/WHY.md) for the product narrative.

## Monorepo layout

```
apps/core/             Kernel + shell. The composer is the front door.
apps/voice/            New-branded CallIntel (VoIP<->AMS middleware).  [scaffold pending]
packages/module-sdk/   The module contract every module implements.
packages/db/           Shared Drizzle schema + RLS-bound connections (one Neon instance).
```

## Stack

Next.js 16 · React 19 · Drizzle ORM + Neon Postgres · Clerk · tRPC · Tailwind v4 ·
Turborepo · TypeScript strict.

## Commands

```sh
npm install        # install the workspace
npm run dev        # run all apps
npm run typecheck  # typecheck every package
npm run build      # build every app
```

## How the kernel works

Modules are not hardcoded. Each one is a `ModuleDefinition` (see `packages/module-sdk`)
that self-registers with the `ModuleRegistry`. The registry resolves dependency order,
generates navigation, maps routes to modules, and exposes the set of *composable*
modules to the onboarding composer. Per-tenant enablement lives in the `tenant_modules`
table — runtime, not compile-time. This is what makes the composer, plugins, and the
marketplace possible.
