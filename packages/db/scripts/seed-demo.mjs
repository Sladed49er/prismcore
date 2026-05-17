/**
 * Seed the demo tenant ("Demo Agency") with realistic data across every pillar,
 * so the June-3 demo workspace looks alive instead of empty. Idempotent — custom
 * fields / connections use ON CONFLICT; calls + tickets seed only when absent.
 *
 * Runs as the owner role (bypasses RLS — this is platform seeding).
 * Run:  node --env-file=packages/db/.env packages/db/scripts/seed-demo.mjs
 */
import { neon } from "@neondatabase/serverless";

const ownerUrl = process.env.DATABASE_URL;
if (!ownerUrl) {
  console.error("DATABASE_URL not set — run with: node --env-file=packages/db/.env ...");
  process.exit(1);
}
const sql = neon(ownerUrl);

const demoRows = await sql.query("SELECT id FROM tenants WHERE slug = 'demo' LIMIT 1");
if (!demoRows[0]) {
  console.error("Demo tenant not found — open /dashboard once so it gets created, then re-run.");
  process.exit(1);
}
const demo = demoRows[0].id;

// Clear the RLS-verification artifact so the demo call log is clean.
await sql.query("DELETE FROM calls WHERE provider = 'rls-verify'");

// 1. Module set (idempotent).
const MODULES = [
  "clients", "policies", "documents", "tasks", "renewals",
  "carriers", "accounting", "reports", "telephony", "api_clearinghouse",
];
for (const moduleId of MODULES) {
  await sql.query(
    "INSERT INTO tenant_modules (tenant_id, module_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [demo, moduleId],
  );
}

// 2. Custom fields on the Client record.
const FIELDS = [
  ["clients", "client", "preferred_contact_time", "Preferred contact time", "text", false],
  ["clients", "client", "referral_source", "Referral source", "select", false],
];
for (const [moduleId, entityKey, fieldKey, label, fieldType, required] of FIELDS) {
  await sql.query(
    "INSERT INTO tenant_custom_fields (tenant_id, module_id, entity_key, field_key, label, field_type, required) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",
    [demo, moduleId, entityKey, fieldKey, label, fieldType, required],
  );
}

// 3. Connected carriers from the clearinghouse.
for (const slug of ["cascade-mutual", "greenleaf-specialty", "haulguard-underwriters"]) {
  const carrier = await sql.query("SELECT id FROM clearinghouse_carriers WHERE slug = $1", [slug]);
  if (carrier[0]) {
    await sql.query(
      "INSERT INTO tenant_carrier_connections (tenant_id, carrier_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [demo, carrier[0].id],
    );
  }
}

// 4. Connected VoIP provider.
await sql.query(
  "INSERT INTO tenant_voip_connections (tenant_id, provider_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
  [demo, "ringcentral"],
);

// 5. Calls + tickets — only when the demo has none yet.
const existing = await sql.query("SELECT count(*)::int AS n FROM tickets WHERE tenant_id = $1", [demo]);
if (existing[0].n === 0) {
  const CALLS = [
    ["inbound", "+1 503-555-0142", "Maria Delgado", "completed", 214, "Wants to add a vehicle to her auto policy; asked for an updated quote by Friday.", "Quote requested", 2],
    ["inbound", "+1 206-555-0188", "Tom Becker", "completed", 330, "Asking why his homeowners renewal premium went up this year.", "Policy question", 1],
    ["inbound", "+1 415-555-0173", null, "completed", 488, "New prospect asking whether the agency writes general liability for a cannabis dispensary.", "New lead", 1],
    ["outbound", "+1 360-555-0119", "Janet Wu", "completed", 126, "Returned a call about her open auto glass claim — claim approved, check mailed.", "Claim follow-up", 0],
    ["inbound", "+1 509-555-0150", null, "missed", 0, null, null, 0],
  ];
  for (const [direction, from, contact, status, dur, summary, disp, daysAgo] of CALLS) {
    await sql.query(
      "INSERT INTO calls (tenant_id, direction, from_number, contact_name, status, duration_seconds, ai_summary, disposition, provider, occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ringcentral', now() - ($9 || ' days')::interval)",
      [demo, direction, from, contact, status, dur, summary, disp, String(daysAgo)],
    );
  }

  const t1 = await sql.query(
    "INSERT INTO tickets (tenant_id, title, description, category, status, priority, created_by_name, created_at) VALUES ($1,$2,$3,$4,'resolved','normal','Demo Agency', now() - interval '6 days') RETURNING id",
    [demo, "Update our agency phone number on the website", "Our main line changed to (503) 555-0142 — please update the site footer and the contact page.", "Change request"],
  );
  const t2 = await sql.query(
    "INSERT INTO tickets (tenant_id, title, description, category, status, priority, created_by_name, created_at) VALUES ($1,$2,$3,$4,'in_progress','high','Demo Agency', now() - interval '2 days') RETURNING id",
    [demo, "Add a flood insurance quote form", "We would like an intake form prospects can fill out to request flood quotes.", "Feature request"],
  );
  await sql.query(
    "INSERT INTO tickets (tenant_id, title, description, category, status, priority, created_by_name) VALUES ($1,$2,$3,$4,'open','low','Demo Agency')",
    [demo, "How do I export the commission report?", "Looking for a way to export commissions to CSV for our bookkeeper.", "Question"],
  );

  const COMMENTS = [
    [t1[0].id, "Demo Agency", false, "The number changed effective Monday — thanks for the quick turnaround."],
    [t1[0].id, "Prism Team", true, "Done — the new number is live on the footer and the contact page."],
    [t2[0].id, "Prism Team", true, "Started on this — the flood intake form will be ready this week."],
  ];
  for (const [ticketId, author, fromAdmin, body] of COMMENTS) {
    await sql.query(
      "INSERT INTO ticket_comments (ticket_id, tenant_id, body, author_name, from_admin) VALUES ($1,$2,$3,$4,$5)",
      [ticketId, demo, body, author, fromAdmin],
    );
  }
  console.log("✓ seeded 5 calls, 3 tickets, 3 comments");
} else {
  console.log("• tickets already present — skipped calls/tickets");
}

console.log("✓ demo tenant seeded: modules, custom fields, 3 carrier connections, VoIP");
