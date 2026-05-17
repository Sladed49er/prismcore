/**
 * Provision the real (non-demo) tenants — idempotent.
 *
 *  - PrismAMS      — Netstar's own workspace, full module suite, empty.
 *  - Mitchell Reed — starts on telephony only (CallIntel replacement);
 *                    more modules added later via /admin/modules.
 *  - Schmitten     — same: telephony only to start.
 *
 * These carry NO sample data — unlike the `demo` tenant. Run:
 *   node --env-file=packages/db/.env packages/db/scripts/provision-tenants.mjs
 */
import { neon, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set — run with: node --env-file=packages/db/.env ...",
  );
  process.exit(1);
}
const sql = neon(url);

/** The full built suite — what PrismAMS runs. */
const FULL_SUITE = [
  "clients",
  "policies",
  "documents",
  "tasks",
  "renewals",
  "carriers",
  "claims",
  "certificates",
  "commissions",
  "accounting",
  "pipeline",
  "acord_forms",
  "intake_forms",
  "esign",
  "reports",
  "telephony",
  "api_clearinghouse",
];

const TENANTS = [
  { name: "PrismAMS", slug: "prismams", tier: "enterprise", modules: FULL_SUITE },
  {
    name: "Mitchell Reed",
    slug: "mitchell-reed",
    tier: "professional",
    modules: ["telephony"],
  },
  {
    name: "Schmitten",
    slug: "schmitten",
    tier: "professional",
    modules: ["telephony"],
  },
];

for (const t of TENANTS) {
  const existing = await sql.query(
    "SELECT id FROM tenants WHERE slug = $1",
    [t.slug],
  );
  let id = existing[0]?.id;
  if (id) {
    console.log(`• tenant "${t.name}" already exists (${id})`);
  } else {
    const ins = await sql.query(
      "INSERT INTO tenants (name, slug, status, tier) VALUES ($1,$2,'active',$3) RETURNING id",
      [t.name, t.slug, t.tier],
    );
    id = ins[0].id;
    console.log(`✓ created tenant "${t.name}" (${id})`);
  }

  for (const moduleId of t.modules) {
    await sql.query(
      "INSERT INTO tenant_modules (tenant_id, module_id, enabled) VALUES ($1,$2,true) ON CONFLICT (tenant_id, module_id) DO NOTHING",
      [id, moduleId],
    );
  }
  console.log(`  ${t.modules.length} module(s) ensured for "${t.name}"`);
}

console.log("✓ tenant provisioning complete");
