/**
 * Row-Level Security setup for Prism Core. Idempotent — safe to re-run.
 *
 *  - Creates (or re-keys) `prismcore_app`, a LOGIN role with NOBYPASSRLS.
 *  - Enables RLS + a `tenant_isolation` policy on every tenant-scoped table:
 *    rows are visible/writable only when `app.current_tenant_id` matches.
 *  - Grants the app role DML on those tables.
 *  - Writes DATABASE_URL_APP (the app-role connection string) into the local
 *    env files, and prints it so it can be set on the Vercel project.
 *
 * The owner role (neondb_owner / adminDb) is NOT the table owner's subject to
 * RLS — it bypasses it, which is correct: migrations and cross-tenant platform
 * admin run as the owner; all tenant-facing runtime access runs as prismcore_app.
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

/** Every table that carries tenant_id. `tenants` (root) and `clearinghouse_carriers`
 *  (a deliberately global pool) are intentionally excluded. */
const TENANT_TABLES = [
  "tenant_modules",
  "users",
  "tenant_custom_fields",
  "tenant_carrier_connections",
  "tenant_voip_connections",
  "calls",
  "tickets",
  "ticket_comments",
];

const password = randomBytes(18).toString("hex");
const owner = neon(ownerUrl);

const statements = [
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'prismcore_app') THEN
       CREATE ROLE prismcore_app LOGIN PASSWORD '${password}' NOBYPASSRLS;
     ELSE
       ALTER ROLE prismcore_app WITH LOGIN PASSWORD '${password}' NOBYPASSRLS;
     END IF;
   END $$;`,
  `GRANT USAGE ON SCHEMA public TO prismcore_app;`,
];
for (const table of TENANT_TABLES) {
  statements.push(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
  statements.push(`DROP POLICY IF EXISTS tenant_isolation ON ${table};`);
  statements.push(
    `CREATE POLICY tenant_isolation ON ${table} ` +
      `USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid) ` +
      `WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);`,
  );
  statements.push(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO prismcore_app;`,
  );
}

for (const stmt of statements) {
  await owner.query(stmt);
}
console.log(`✓ prismcore_app role + RLS tenant_isolation on ${TENANT_TABLES.length} tables`);

const appUrl = ownerUrl.replace(/\/\/[^@/]+@/, `//prismcore_app:${password}@`);

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

// --- write DATABASE_URL_APP into local env files ------------------------
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
