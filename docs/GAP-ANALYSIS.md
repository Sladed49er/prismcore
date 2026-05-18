# Prism Core — Gap Analysis vs PrismAMS & CallIntel

_Generated 2026-05-18. A depth/gap audit of three codebases: Prism Core
(the rebuild), PrismAMS (the mature AMS), and CallIntel / voip-middleware-portal
(the telephony product). Goal: keep Prism Core's kernel, mine the other two for
the proven depth the rebuilt modules are missing._

---

## EXECUTION PLAN & PROGRESS

This is a **living document**. The four priorities below are worked **in order,
each to full completion** before the next begins.

| # | Priority | Status |
|---|---|---|
| 1 | **Detail pages** — per-record detail + drill-down (Client → Policy → Claim) | DONE |
| 2 | **CallIntel intelligence merge** — caller intel, risk radar, revenue intel, compliance watchdog, digests into telephony | DONE |
| 3 | **Carrier intelligence** — scorecard (loss ratio, commission variance) + NAICS appetite matching | DONE |
| 4 | **Document intelligence depth-up** — auditClient cross-policy audit, policy scoring, extracted-data persistence | DONE |

_Status: pending · IN PROGRESS · DONE. Update this table as work lands._

### Priority 1 detail — Detail pages — DONE 2026-05-18
The structural unlock. Built a reusable detail-page pattern
(`components/detail.tsx`: DetailPage, RecordHeader, Section, RecordTable) and
applied it across the insurance spine.

- [x] Client detail — `/m/clients/[id]` — policies, claims, contacts, locations, activity, attachments
- [x] Policy detail — `/m/policies/[id]` — coverages, endorsements, claims, cancellations, installments, schedule, audits, service activity, documents, attachments
- [x] Claim detail — `/m/claims/[id]` — diary, reserve ledger, payments, recoveries, parties, litigation, attachments
- [x] Carrier detail — `/m/carriers/[id]` — appointments, contacts, guidelines, placed policies
- [x] List rows (clients/policies/claims/carriers panels) link into detail pages; detail pages drill deeper
- [x] Interactive `<Attachments>` on each detail page (replaces the inline claims-register expander)

The pattern (`components/detail.tsx` + a `lib/<entity>-detail.ts` loader) is now
reusable for any future module's detail page.

### Priority 2 detail — CallIntel intelligence merge — DONE 2026-05-18
Ported CallIntel's intelligence layer into PrismVoice as a new
`/m/telephony/intelligence` sub-page. New tables `call_insights`,
`compliance_flags`, `call_digests` + `calls.intelAnalyzedAt` (migration 0058,
RLS on 128 tables).

- [x] Caller brief — `lib/voip-caller-brief.ts` — pre-call prep: call pattern, last interaction, AI sentiment + talking points
- [x] Revenue insights + compliance watchdog — `lib/voip-intelligence.ts` — one Claude call per call-record, forced tool returns cross-sell / renewal-risk / follow-up insights and E&O flags; `scanRecentCalls` batches un-analysed calls
- [x] Client risk radar — `lib/voip-risk.ts` — deterministic call-pattern scoring + AI sentiment on the top accounts
- [x] Weekly digest — `lib/voip-digest.ts` — gathers the week's calls, AI narrative (headlines/coaching/staffing/week-over-week), stored in `call_digests`
- [x] `/m/telephony/intelligence` page + panel; linked from the PrismVoice page

Caller intelligence is on-demand (pick a client) rather than wired into the
live screen-pop — Prism Core has no live screen-pop browser surface.

### Priority 3 detail — Carrier intelligence — DONE 2026-05-18
Ported PrismAMS's carrier scorecard and NAICS appetite matching into the
carriers module as a new `/m/carriers/intelligence` sub-page. New table
`carrier_appetite_rules` (migration 0059, RLS on 129 tables).

- [x] Carrier scorecard — `lib/carrier-scorecard.ts` — deterministic per-carrier rollup: policy/premium counts, claim activity, incurred loss ratio (paid + reserved over in-force premium), commission expected/received/variance, line-of-business breakdown
- [x] NAICS appetite matching — `lib/carrier-appetite.ts` — appetite rules keyed by NAICS prefix; `matchCarriers` picks the most-specific prefix per carrier and ranks preferred → declined
- [x] `/m/carriers/intelligence` page — scorecard table + appetite rule CRUD + a "find carriers for a risk" match tool; linked from the Carriers hub

### Priority 4 detail — Document intelligence depth-up — DONE 2026-05-18
Deepened the document store's AI layer to PrismAMS parity. `document_analyses`
gained `score`, `extractedData`, `clientId`, and `documentId` is now nullable
(migration 0060).

- [x] Policy scoring — `runReview` now returns a 0-100 coverage-health score
- [x] Extracted data — review pulls key policy fields (named insured, carrier, policy number, dates, premium, limits) into `extractedData`
- [x] `runClientAudit` — cross-policy audit: gathers every document attached to a client and their policies, audits the account as a whole for account-level gaps, inconsistencies, and account-rounding opportunities
- [x] `getAnalysisStats` — counts by kind, gap findings in the last 30 days, average review score
- [x] `/m/documents/intelligence` — third "Audit a client" card, a stats bar, and score + extracted-data display on review analyses

---

## STATUS — Tiers 1-3 complete (2026-05-18)

The gap-analysis plan is fully worked. Prism Core kept its kernel and absorbed
the proven depth.

**Tiers 1-2 (the four priorities):** detail-page drill-down, CallIntel's
intelligence layer, carrier scorecard + appetite, PrismAMS-parity document
intelligence.

**Tier 3 (the Thin modules, all deepened):**
- Marketing — email templates, drip sequences, real Resend send + cron
- Intake forms — public token form builder, submission capture, convert-to-lead
- ACORD forms — six-form catalog, prefill from live client/policy/carrier data
- eSign — self-hosted signing ceremony with a public token-authed sign page
- Memberships — dues invoicing, annual billing run, payment tracking
- Automations — a workflow rule engine that actually fires (leapfrogs both
  PrismAMS and CallIntel, which store rules but never run them)
- Custom objects — Salesforce-style user-defined record types
- Dashboard & shell — PrismAMS-inspired visual polish: a time-aware greeting,
  icon stat cards, quick-navigate grid, category-grouped sidebar nav

Migrations 0055-0067; RLS on 140 tables. Future ideas (deferred): dark mode,
event-triggered automations, accounting-sync, deeper leads/pipeline enrichment.

## Headline

| Codebase | Scale | Verdict |
|---|---|---|
| PrismAMS | 90 tRPC routers, ~870 procedures | Mature. Deep across insurance, accounting, CRM, association, AI. |
| CallIntel | ~12 routers + rich `lib/` subsystems | Deep on telephony intelligence specifically. |
| Prism Core | 38 modules | Strong architecture, breadth over depth. 5 Deep / 22 Moderate / 11 Thin. |

**Prism Core's architecture is sound** — the customization kernel, RLS
multi-tenancy, billing, and the AI-assistant safety pattern all rate Deep.
The gap is feature depth inside the modules, plus one structural hole.

## The #1 structural gap: no detail pages

Every Prism Core module is a **flat cross-tenant list**. There is no
`Client → their Policies → a Policy → its Coverages` drill-down anywhere in the
app. PrismAMS has `getById` with full relation hydration on every core entity.
Without detail pages, Core reads like a database admin tool, not an AMS. This is
the highest-leverage fix and it gates the perceived quality of every other
module. It is a UI/page-pattern addition, not a kernel change.

## Where Core already wins

- **Claims** — Core is Deep (8 sub-pages: register, diary, reserves, payments,
  recoveries, parties, litigation). PrismAMS Claims is Thin (3 procedures).
- **Customization kernel** — Core treats custom fields / terminology / option
  sets / saved views as a first-class, audited, AI-drivable surface. PrismAMS
  has custom objects but not this unified self-service kernel.
- **Multi-tenancy** — Core's RLS (`prismcore_app` NOBYPASSRLS + tenant context)
  is clean and uniform.

## Port priority — tiered

### Tier 1 — structural unlock
| Item | Source | Notes |
|---|---|---|
| Per-record detail pages + drill-down | PrismAMS `getById` pattern | Touches every core module. Highest leverage. |

### Tier 2 — high-value, self-contained ports
| Item | Source | Core today | Gap |
|---|---|---|---|
| Telephony intelligence layer | CallIntel `lib/ai/` | telephony Deep structurally, no intelligence | caller-intelligence brief, client risk radar, revenue intelligence, compliance watchdog |
| Weekly digest + deep-dive reports | CallIntel `lib/digest/` | none | parallel-SQL gather + Claude narrative; KPI/leaderboard analytics |
| Carrier scorecard | PrismAMS `carrier-scorecard.ts` | carriers Moderate | loss ratio, premium volume, commission variance per carrier |
| Carrier appetite matching | PrismAMS `carrier-appetite.ts` | none | NAICS-prefix appetite rules, most-specific-wins |
| Document intelligence depth-up | PrismAMS `document-intelligence.ts` | review + compare (built) | `auditClient` cross-policy audit, `checkPolicy` scoring, extracted-data persistence, `stats` |
| AI utility router | PrismAMS `ai.ts` (13 procs) | 6 siloed assistants | coverageGaps, accountBrief, commsSummary, helpMeWrite, translate, extractLossRuns |
| Per-carrier VoIP depth | CallIntel normalizers | only Dialpad deep | GoTo (deep), Zoom (structured AI), RingCentral recordings/transcripts |

### Tier 3 — fill the Thin modules
| Module | Source | Gap |
|---|---|---|
| marketing | PrismAMS `marketing.ts`, `email-sequences.ts` | email send, templates, drip automation, segments |
| acord_forms | PrismAMS `acord.ts` | prefill from live data, PDF generation, field mappings |
| intake_forms | PrismAMS `intake-forms.ts` | public form builder + URL, AI extraction to lead/client |
| esign | PrismAMS `esign.ts` | self-hosted signing ceremony, field placement |
| memberships | PrismAMS `memberships.ts` | dues invoices/payments, benefit entitlement, dashboard |
| custom objects | PrismAMS `custom-objects.ts` | Salesforce-style user-defined objects |
| carrier-credentials, carrier-supplements | PrismAMS | encrypted portal logins, ACORD supplement bundles |
| workflow runtime engine | PrismAMS `workflow-rules.ts` | when/then rules that actually fire (both products store rules but neither fires them) |
| accounting-sync | PrismAMS `accounting-sync.ts` | QuickBooks / Xero bidirectional sync |
| leads / pipeline enrichment | PrismAMS `leads.ts` (~40 procs) | Apollo enrichment, email verification, cadence, saved lists |

## Notes

- **Vault** is Thin in Core but PrismVault is a separate shipped product — defer
  or integrate rather than rebuild.
- **Accounting** is Core's closest-to-parity module (Deep, 20 sub-pages); main
  PrismAMS edge is accounting-sync and trust-accounting reconciliation depth.
- **BookScan / cross-sell / specialty-markets** — Core has them as AI wrappers
  over minimal CRUD; functional but Thin-adjacent.
