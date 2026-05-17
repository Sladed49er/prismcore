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
  "clients", "policies", "documents", "tasks", "renewals", "carriers",
  "claims", "certificates", "commissions", "accounting", "pipeline",
  "acord_forms", "intake_forms", "esign", "reports", "telephony",
  "api_clearinghouse",
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

// 6. Clients + policies — only when the demo has no clients yet.
const clientCount = await sql.query("SELECT count(*)::int AS n FROM clients WHERE tenant_id = $1", [demo]);
if (clientCount[0].n === 0) {
  const CLIENTS = [
    ["person", "Maria", "Delgado", null, "maria.delgado@example.com", "+1 503-555-0142", "Portland", "OR", "active"],
    ["business", null, null, "Becker Construction LLC", "ap@beckerconstruction.example", "+1 206-555-0188", "Seattle", "WA", "active"],
    ["person", "Janet", "Wu", null, "janet.wu@example.com", "+1 360-555-0119", "Vancouver", "WA", "active"],
    ["business", null, null, "Cascade Cannabis Co.", "ops@cascadecannabis.example", "+1 503-555-0177", "Bend", "OR", "prospect"],
    ["person", "Greg", "Mathers", null, "greg.mathers@example.com", "+1 509-555-0150", "Spokane", "WA", "prospect"],
  ];
  const clientIds = [];
  for (const [type, fn, ln, bn, email, phone, city, state, status] of CLIENTS) {
    const r = await sql.query(
      "INSERT INTO clients (tenant_id, type, first_name, last_name, business_name, email, phone, city, state, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id",
      [demo, type, fn, ln, bn, email, phone, city, state, status],
    );
    clientIds.push(r[0].id);
  }
  const POLICIES = [
    [0, "CAU-104882", "Commercial Auto", "HaulGuard Underwriters", "active", "2026-01-15", "2027-01-15", 487500],
    [1, "GL-229104", "General Liability", "Cascade Mutual Insurance", "active", "2026-03-01", "2027-03-01", 312000],
    [1, "BR-229105", "Builders Risk", "Cascade Mutual Insurance", "active", "2026-03-01", "2027-03-01", 158000],
    [2, "HO-771203", "Homeowners", "Cascade Mutual Insurance", "active", "2025-11-20", "2026-11-20", 214000],
    [3, "GL-300447", "General Liability", "Greenleaf Specialty", "quoted", "2026-06-01", "2027-06-01", 680000],
  ];
  for (const [ci, num, lob, carrier, status, eff, exp, premium] of POLICIES) {
    await sql.query(
      "INSERT INTO policies (tenant_id, client_id, policy_number, line_of_business, carrier, status, effective_date, expiration_date, premium_cents) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [demo, clientIds[ci], num, lob, carrier, status, eff, exp, premium],
    );
  }
  console.log("✓ seeded 5 clients, 5 policies");
} else {
  console.log("• clients already present — skipped clients/policies");
}

// 7. Renewals — only when the demo has none.
const renewalCount = await sql.query("SELECT count(*)::int AS n FROM renewals WHERE tenant_id = $1", [demo]);
if (renewalCount[0].n === 0) {
  const pols = await sql.query(
    "SELECT id FROM policies WHERE tenant_id = $1 ORDER BY policy_number LIMIT 2",
    [demo],
  );
  if (pols.length === 2) {
    await sql.query(
      "INSERT INTO renewals (tenant_id, policy_id, stage, due_date, notes) VALUES ($1,$2,'in_progress','2026-11-20','Renewal review underway — loss history clean, premium tracking flat.')",
      [demo, pols[0].id],
    );
    await sql.query(
      "INSERT INTO renewals (tenant_id, policy_id, stage, due_date, notes) VALUES ($1,$2,'quoted','2027-01-15','Renewal quote sent to the insured; awaiting sign-off.')",
      [demo, pols[1].id],
    );
    console.log("✓ seeded 2 renewals");
  }
} else {
  console.log("• renewals already present — skipped");
}

// 8. Carriers — the agency's appointed markets.
const carrierCount = await sql.query("SELECT count(*)::int AS n FROM carriers WHERE tenant_id = $1", [demo]);
if (carrierCount[0].n === 0) {
  const AGENCY_CARRIERS = [
    ["Cascade Mutual Insurance", "10923", "Standard P&C — property, commercial auto, homeowners", "Dana Reyes", "dreyes@cascademutual.example", "+1 800-555-0110", "active"],
    ["HaulGuard Underwriters", "31887", "Commercial trucking and motor carrier fleets", "Marcus Hill", "underwriting@haulguard.example", "+1 800-555-0144", "active"],
    ["Greenleaf Specialty", "44021", "Cannabis and hemp operations, product liability", "Priya Anand", "newbusiness@greenleafspecialty.example", "+1 800-555-0188", "prospective"],
  ];
  for (const [name, naic, appetite, cname, cemail, cphone, status] of AGENCY_CARRIERS) {
    await sql.query(
      "INSERT INTO carriers (tenant_id, name, naic_code, appetite, contact_name, contact_email, contact_phone, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [demo, name, naic, appetite, cname, cemail, cphone, status],
    );
  }
  console.log("✓ seeded 3 carriers");
} else {
  console.log("• carriers already present — skipped");
}

// 9. Insurance-core demo data — claims, certificates, commissions, documents, tasks.
const taskSeedCount = await sql.query("SELECT count(*)::int AS n FROM tasks WHERE tenant_id = $1", [demo]);
if (taskSeedCount[0].n === 0) {
  const pols = await sql.query(
    "SELECT id FROM policies WHERE tenant_id = $1 ORDER BY policy_number LIMIT 2",
    [demo],
  );
  if (pols.length === 2) {
    const [p0, p1] = [pols[0].id, pols[1].id];
    await sql.query(
      "INSERT INTO claims (tenant_id, policy_id, claim_number, date_of_loss, description, status, reserve_cents) VALUES ($1,$2,'CLM-50231','2026-04-12','Rear-end collision; third-party vehicle damage.','investigating',850000)",
      [demo, p0],
    );
    await sql.query(
      "INSERT INTO claims (tenant_id, policy_id, claim_number, date_of_loss, description, status, reserve_cents) VALUES ($1,$2,'CLM-50244','2026-02-28','Water damage from a burst supply line.','paid',1240000)",
      [demo, p1],
    );
    await sql.query(
      "INSERT INTO certificates (tenant_id, policy_id, cert_number, holder_name, issued_date, status) VALUES ($1,$2,'COI-2026-118','City of Portland — Permits Office','2026-03-05','issued')",
      [demo, p0],
    );
    await sql.query(
      "INSERT INTO certificates (tenant_id, policy_id, cert_number, holder_name, issued_date, status) VALUES ($1,$2,'COI-2026-141','Prime Property Management LLC',NULL,'draft')",
      [demo, p1],
    );
    await sql.query(
      "INSERT INTO commissions (tenant_id, policy_id, amount_cents, rate_percent, status, received_date) VALUES ($1,$2,73125,'15','received','2026-02-05')",
      [demo, p0],
    );
    await sql.query(
      "INSERT INTO commissions (tenant_id, policy_id, amount_cents, rate_percent, status, received_date) VALUES ($1,$2,46800,'15','pending',NULL)",
      [demo, p1],
    );
  }
  for (const [name, category, notes] of [
    ["Becker Construction — signed BOR", "Signed agreement", "Broker-of-record letter on file."],
    ["ACORD 125 — Cascade Cannabis Co.", "ACORD form", "Commercial application submitted to Greenleaf Specialty."],
    ["Renewal proposal — Wu homeowners", "Correspondence", "Sent to the insured ahead of the November renewal."],
  ]) {
    await sql.query(
      "INSERT INTO documents (tenant_id, name, category, notes) VALUES ($1,$2,$3,$4)",
      [demo, name, category, notes],
    );
  }
  for (const [title, status, priority, due, assignee] of [
    ["Follow up on the Cascade Cannabis GL quote", "in_progress", "high", "2026-05-30", "Matt"],
    ["Order MVRs for the HaulGuard fleet renewal", "open", "normal", "2026-06-10", "Polina"],
    ["Send the COI to Prime Property Management", "open", "high", "2026-05-22", "Matt"],
    ["Reconcile the April commission statement", "done", "normal", null, "Polina"],
  ]) {
    await sql.query(
      "INSERT INTO tasks (tenant_id, title, status, priority, due_date, assignee) VALUES ($1,$2,$3,$4,$5,$6)",
      [demo, title, status, priority, due, assignee],
    );
  }
  console.log("✓ seeded claims, certificates, commissions, documents, tasks");
} else {
  console.log("• insurance-core demo data already present — skipped");
}

// 10. Accounting / pipeline / ACORD / intake / eSign demo data.
const invoiceSeedCount = await sql.query("SELECT count(*)::int AS n FROM invoices WHERE tenant_id = $1", [demo]);
if (invoiceSeedCount[0].n === 0) {
  const cls = await sql.query(
    "SELECT id FROM clients WHERE tenant_id = $1 ORDER BY created_at LIMIT 3",
    [demo],
  );
  if (cls.length >= 2) {
    const c0 = cls[0].id;
    const c1 = cls[1].id;
    const c2 = cls[2]?.id ?? cls[1].id;
    await sql.query(
      "INSERT INTO invoices (tenant_id, client_id, invoice_number, description, amount_cents, status, due_date) VALUES ($1,$2,'INV-2026-0188','Agency fee — Q2 2026',45000,'sent','2026-06-15')",
      [demo, c0],
    );
    await sql.query(
      "INSERT INTO invoices (tenant_id, client_id, invoice_number, description, amount_cents, status, due_date) VALUES ($1,$2,'INV-2026-0189','Policy endorsement processing',12500,'paid','2026-05-01')",
      [demo, c1],
    );
    await sql.query(
      "INSERT INTO opportunities (tenant_id, client_id, name, stage, value_cents, notes, expected_close_date) VALUES ($1,$2,'Commercial package — new business','quoted',680000,'Quote out with Greenleaf; decision expected mid-June.','2026-06-15')",
      [demo, c2],
    );
    await sql.query(
      "INSERT INTO opportunities (tenant_id, client_id, name, stage, value_cents, notes, expected_close_date) VALUES ($1,$2,'Umbrella cross-sell','contacted',95000,'Suggested at the renewal review.','2026-07-01')",
      [demo, c1],
    );
    await sql.query(
      "INSERT INTO acord_forms (tenant_id, client_id, form_type, status, notes) VALUES ($1,$2,'ACORD 125 — Commercial Application','submitted','Submitted to Greenleaf Specialty.')",
      [demo, c2],
    );
    await sql.query(
      "INSERT INTO acord_forms (tenant_id, client_id, form_type, status, notes) VALUES ($1,$2,'ACORD 130 — Workers Compensation','draft','Awaiting payroll figures from the client.')",
      [demo, c1],
    );
  }
  for (const [name, email, phone, interest, status] of [
    ["Alex Romero", "alex.romero@example.com", "+1 503-555-0211", "General liability for a new food truck", "new"],
    ["Priya Shah", "priya.shah@example.com", "+1 206-555-0233", "Homeowners and auto bundle quote", "contacted"],
    ["Devon Clarke", "", "+1 360-555-0244", "Workers comp for a six-person crew", "converted"],
  ]) {
    await sql.query(
      "INSERT INTO intake_submissions (tenant_id, name, email, phone, interest, status) VALUES ($1,$2,$3,$4,$5,$6)",
      [demo, name, email, phone, interest, status],
    );
  }
  for (const [doc, signer, email, status, sent] of [
    ["Broker-of-record letter — Becker Construction", "Tom Becker", "tom@beckerconstruction.example", "signed", "2026-04-18"],
    ["Renewal acceptance — Wu homeowners", "Janet Wu", "janet.wu@example.com", "sent", "2026-05-10"],
    ["Service agreement — Cascade Cannabis Co.", "Cascade Operations", "ops@cascadecannabis.example", "draft", null],
  ]) {
    await sql.query(
      "INSERT INTO signature_requests (tenant_id, document_name, signer_name, signer_email, status, sent_date) VALUES ($1,$2,$3,$4,$5,$6)",
      [demo, doc, signer, email, status, sent],
    );
  }
  console.log("✓ seeded invoices, opportunities, ACORD forms, intake, eSign");
} else {
  console.log("• accounting/pipeline/etc. demo data already present — skipped");
}

console.log("✓ demo tenant seeded: modules, custom fields, 3 carrier connections, VoIP");
