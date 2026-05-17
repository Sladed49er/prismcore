# Prism Core — One-Pager

## The problem

~40,000 independent insurance agencies run on bloated, expensive AMS platforms —
Vertafore, AMS360, Applied. They use roughly 5% of the features and pay for all
of it, bolt on overlapping products to fill the gaps, and pay licensing tolls
just to integrate ($7,500/yr for the Applied SDK). Switching anything means
downtime and dread, so they stay stuck.

## The product

**Prism Core** — a composable agency platform. The core is not a CRM; it is the
composer. Agencies pick only the modules they need, customize them themselves,
connect anything through open APIs with no fees, and run siloed on one shared,
centrally-patched codebase.

## How it is different

| Legacy AMS | Prism Core |
|---|---|
| 400 features, you use 5% | Pick exactly the modules you need |
| Customization = a vendor change request | Self-service — add fields and forms yourself |
| $7,500/yr just to open an API | Open APIs — no fees, no per-call charges |
| Switching = a downtime project | API-matched, low-friction transitions |
| One-size pricing | Per-user, per-module — right-sized |

## The four pillars

1. **Composer** — answer two questions, get a workspace that fits.
2. **Self-service customization** — your fields, your forms, no code.
3. **API Clearinghouse** — every carrier and MGA, one click, no tolls.
4. **PrismVoice** — the call center built in: screen pop, AI call notes.

## Security and isolation

Multi-tenant and fully siloed — Postgres Row-Level Security enforces that an
agency can only ever see and change its own data. One shared codebase means a
zero-day is patched for everyone at once. An optional dedicated-database tier is
available for enterprises that require physical separation.

## Economics

A third the cost, twice the productivity. Per-user, per-module pricing — agencies
pay only for what they use. Everyone wins: they pay less for a better product.

## Status

Live platform — 36 modules across 7 categories, multi-tenant with database-level
isolation. Built on Next.js, Postgres, and Clerk.
