/**
 * Row-Level Security setup for Prism Core. Idempotent — safe to re-run.
 *
 *  - First run: creates `prismcore_app` (a LOGIN role, NOBYPASSRLS), and writes
 *    DATABASE_URL_APP into the local env files.
 *  - Re-runs: the role and its password are left untouched (DATABASE_URL_APP is
 *    read from the env). This means adding a new module is just: add its table
 *    to TENANT_TABLES below and re-run.
 *  - Always: enables RLS + a `tenant_isolation` policy (USING + WITH CHECK on
 *    `app.current_tenant_id`) on every tenant-scoped table, and grants the app
 *    role DML. Then self-verifies.
 *
 * The owner role (adminDb) is not subject to RLS — migrations and cross-tenant
 * platform admin run as the owner; all tenant-facing runtime access runs as
 * prismcore_app.
 *
 * Run:  node --env-file=packages/db/.env packages/db/scripts/setup-rls.mjs
 */
import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import ws from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const ownerUrl = process.env.DATABASE_URL;
if (!ownerUrl) {
  console.error("DATABASE_URL is not set — run with: node --env-file=packages/db/.env ...");
  process.exit(1);
}

/** Every table that carries tenant_id. Add a module's tenant table here and
 *  re-run. `tenants` (root) and `clearinghouse_carriers` (a deliberately global
 *  pool) are intentionally excluded. */
const TENANT_TABLES = [
  "tenant_modules",
  "users",
  "tenant_custom_fields",
  "tenant_carrier_connections",
  "tenant_voip_connections",
  "calls",
  "tickets",
  "ticket_comments",
  "clients",
  "policies",
  "renewals",
  "carriers",
  "claims",
  "certificates",
  "commissions",
  "documents",
  "tasks",
  "invoices",
  "opportunities",
  "acord_forms",
  "intake_submissions",
  "signature_requests",
  "chart_of_accounts",
  "journal_entries",
  "journal_entry_lines",
  "vendors",
  "bills",
  "trust_ledger_entries",
  "payroll_employees",
  "pay_runs",
  "pay_run_entries",
  "bank_reconciliations",
  "budgets",
  "budget_lines",
  "fixed_assets",
  "estimates",
  "check_register",
  "accounting_periods",
  "surplus_lines_tax",
  "quarterly_tax_payments",
  "policy_coverages",
  "policy_endorsements",
  "policy_cancellations",
  "premium_installments",
  "insured_schedule_items",
  "premium_audits",
  "service_activities",
  "policy_documents",
  "claim_notes",
  "claim_reserve_entries",
  "claim_payments",
  "claim_recoveries",
  "claim_parties",
  "claim_litigation",
  "producers",
  "commission_splits",
  "commission_statements",
  "producer_payouts",
  "contingency_income",
  "remarketing_quotes",
  "renewal_offers",
  "retention_records",
  "client_contacts",
  "client_activities",
  "client_locations",
  "leads",
  "lead_sources",
  "marketing_campaigns",
];

const owner = neon(ownerUrl);

const roleRows = await owner.query(
  "SELECT 1 FROM pg_roles WHERE rolname = 'prismcore_app'",
);
const roleExists = roleRows.length > 0;

let appUrl;
if (roleExists) {
  appUrl = process.env.DATABASE_URL_APP;
  if (!appUrl) {
    console.error("prismcore_app exists but DATABASE_URL_APP is not in the env — cannot continue.");
    process.exit(1);
  }
  console.log("• prismcore_app already exists — role and password left untouched");
} else {
  const password = randomBytes(18).toString("hex");
  await owner.query(
    `CREATE ROLE prismcore_app LOGIN PASSWORD '${password}' NOBYPASSRLS;`,
  );
  appUrl = ownerUrl.replace(/\/\/[^@/]+@/, `//prismcore_app:${password}@`);
  console.log("✓ created role prismcore_app");
}

await owner.query("GRANT USAGE ON SCHEMA public TO prismcore_app;");
for (const table of TENANT_TABLES) {
  await owner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
  await owner.query(`DROP POLICY IF EXISTS tenant_isolation ON ${table};`);
  await owner.query(
    `CREATE POLICY tenant_isolation ON ${table} ` +
      `USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid) ` +
      `WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);`,
  );
  await owner.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO prismcore_app;`,
  );
}
console.log(`✓ RLS tenant_isolation applied to ${TENANT_TABLES.length} tables`);

// --- verify the policy actually isolates --------------------------------
const demo = await owner.query("SELECT id FROM tenants WHERE slug = 'demo' LIMIT 1");
const demoId = demo[0]?.id ?? null;

const appPool = new Pool({ connectionString: appUrl });
const noCtx = await appPool.query("SELECT count(*)::int AS n FROM tenant_modules");
let withCtx = "n/a";
if (demoId) {
  const client = await appPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [demoId]);
    const r = await client.query("SELECT count(*)::int AS n FROM tenant_modules");
    await client.query("COMMIT");
    withCtx = r.rows[0].n;
  } finally {
    client.release();
  }
}
await appPool.end();

console.log(`  RLS — app role, NO tenant context : ${noCtx.rows[0].n} rows visible  (expect 0)`);
console.log(`  RLS — app role, demo tenant set   : ${withCtx} rows visible  (expect > 0)`);

// --- write DATABASE_URL_APP into local env files (first run only) -------
if (!roleExists) {
  function upsertEnv(path) {
    if (!existsSync(path)) return false;
    const kept = readFileSync(path, "utf8")
      .split("\n")
      .filter((l) => l.trim() !== "" && !l.startsWith("DATABASE_URL_APP="));
    kept.push(`DATABASE_URL_APP=${appUrl}`);
    writeFileSync(path, kept.join("\n") + "\n");
    return true;
  }
  const wrote = ["apps/core/.env.local", "packages/db/.env"].filter(upsertEnv);
  console.log(`✓ DATABASE_URL_APP written to: ${wrote.join(", ")}`);
  console.log(`DATABASE_URL_APP=${appUrl}`);
}
