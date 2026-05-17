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

// 11. General ledger — chart of accounts + balanced journal entries.
const coaCount = await sql.query("SELECT count(*)::int AS n FROM chart_of_accounts WHERE tenant_id = $1", [demo]);
if (coaCount[0].n === 0) {
  const ACCOUNTS = [
    ["1000", "Operating Cash", "asset", "Current Asset"],
    ["1100", "Accounts Receivable", "asset", "Current Asset"],
    ["1200", "Premium Trust Account", "asset", "Trust"],
    ["1500", "Furniture & Equipment", "asset", "Fixed Asset"],
    ["2000", "Accounts Payable", "liability", "Current Liability"],
    ["2100", "Premiums Payable to Carriers", "liability", "Current Liability"],
    ["3000", "Owner's Equity", "equity", "Equity"],
    ["3900", "Retained Earnings", "equity", "Equity"],
    ["4000", "Commission Income", "revenue", "Operating Revenue"],
    ["4100", "Agency Fee Income", "revenue", "Operating Revenue"],
    ["5000", "Payroll Expense", "expense", "Operating Expense"],
    ["6000", "Rent Expense", "expense", "Operating Expense"],
    ["6100", "Office & Software Expense", "expense", "Operating Expense"],
    ["6200", "Errors & Omissions Insurance", "expense", "Operating Expense"],
  ];
  const acctId = {};
  for (const [num, name, type, subtype] of ACCOUNTS) {
    const r = await sql.query(
      "INSERT INTO chart_of_accounts (tenant_id, account_number, name, type, subtype) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [demo, num, name, type, subtype],
    );
    acctId[num] = r[0].id;
  }
  async function je(number, dt, memo, lines) {
    const e = await sql.query(
      "INSERT INTO journal_entries (tenant_id, entry_number, entry_date, memo, source, status) VALUES ($1,$2,$3,$4,'manual','posted') RETURNING id",
      [demo, number, dt, memo],
    );
    for (const [num, debit, credit, lm] of lines) {
      await sql.query(
        "INSERT INTO journal_entry_lines (tenant_id, journal_entry_id, account_id, debit_cents, credit_cents, line_memo) VALUES ($1,$2,$3,$4,$5,$6)",
        [demo, e[0].id, acctId[num], debit, credit, lm],
      );
    }
  }
  await je("JE-1001", "2026-02-05", "Carrier commission statement — February", [
    ["1000", 7312500, 0, "Deposit to operating account"],
    ["4000", 0, 7312500, "Commission income earned"],
  ]);
  await je("JE-1002", "2026-03-01", "March office rent", [
    ["6000", 380000, 0, "Office rent"],
    ["1000", 0, 380000, "Paid from operating account"],
  ]);
  await je("JE-1003", "2026-03-15", "Premium received into trust", [
    ["1200", 1240000, 0, "Premium received from insured"],
    ["2100", 0, 1240000, "Premium owed to carrier"],
  ]);
  console.log("✓ seeded 14 GL accounts, 3 journal entries");
} else {
  console.log("• chart of accounts already present — skipped");
}

// 12. Accounts payable + trust demo data.
const vendorCount = await sql.query("SELECT count(*)::int AS n FROM vendors WHERE tenant_id = $1", [demo]);
if (vendorCount[0].n === 0) {
  const VENDORS = [
    ["Cascade Mutual Insurance", "carrier", "ap@cascademutual.example", "+1 800-555-0110", "Net 15", false],
    ["Westline Office Properties", "service", "billing@westlineprops.example", "+1 503-555-0301", "Net 30", false],
    ["Brightleaf IT Services", "service", "invoices@brightleafit.example", "+1 503-555-0322", "Net 30", true],
  ];
  const vid = [];
  for (const [name, type, email, phone, terms, is1099] of VENDORS) {
    const r = await sql.query(
      "INSERT INTO vendors (tenant_id, name, type, email, phone, payment_terms, is_1099) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [demo, name, type, email, phone, terms, is1099],
    );
    vid.push(r[0].id);
  }
  await sql.query(
    "INSERT INTO bills (tenant_id, vendor_id, bill_number, bill_date, due_date, amount_cents, amount_paid_cents, status, memo) VALUES ($1,$2,'BILL-3301','2026-04-01','2026-04-30',380000,380000,'paid','April office rent')",
    [demo, vid[1]],
  );
  await sql.query(
    "INSERT INTO bills (tenant_id, vendor_id, bill_number, bill_date, due_date, amount_cents, amount_paid_cents, status, memo) VALUES ($1,$2,'BILL-3318','2026-05-01','2026-05-31',124500,0,'pending','May IT support and software licenses')",
    [demo, vid[2]],
  );
  await sql.query(
    "INSERT INTO bills (tenant_id, vendor_id, bill_number, bill_date, due_date, amount_cents, amount_paid_cents, status, memo) VALUES ($1,$2,'BILL-3325','2026-05-05','2026-05-20',965000,0,'pending','Premium remittance — April production')",
    [demo, vid[0]],
  );
  const TRUST = [
    ["premium_received", 1240000, "Premium received from Becker Construction", "Becker Construction LLC", "WA", "2026-03-15"],
    ["premium_received", 487500, "Premium received from Maria Delgado", "Maria Delgado", "OR", "2026-04-02"],
    ["remitted", 1240000, "Remitted to Cascade Mutual", "Cascade Mutual Insurance", "WA", "2026-04-10"],
    ["fee", 73125, "Agency commission drawn to operating", "Cascade Mutual Insurance", "OR", "2026-04-12"],
  ];
  for (const [type, amt, desc, party, state, dt] of TRUST) {
    await sql.query(
      "INSERT INTO trust_ledger_entries (tenant_id, entry_type, amount_cents, description, party, state, entry_date) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [demo, type, amt, desc, party, state, dt],
    );
  }
  console.log("✓ seeded 3 vendors, 3 bills, 4 trust ledger entries");
} else {
  console.log("• AP / trust demo data already present — skipped");
}

// 13. Payroll demo data — employees + a posted pay run.
const empCount = await sql.query("SELECT count(*)::int AS n FROM payroll_employees WHERE tenant_id = $1", [demo]);
if (empCount[0].n === 0) {
  const EMPLOYEES = [
    ["Matt Slade", "matt@prismams.com", "Principal", "w2", 625000],
    ["Polina Yoshimura", "polina@prismams.com", "Operations", "w2", 480000],
    ["Kim Carver", "kim@example.com", "Account Manager", "w2", 340000],
  ];
  const empIds = [];
  for (const [name, email, title, type, pay] of EMPLOYEES) {
    const r = await sql.query(
      "INSERT INTO payroll_employees (tenant_id, name, email, title, employment_type, period_pay_cents) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      [demo, name, email, title, type, pay],
    );
    empIds.push(r[0].id);
  }
  const run = await sql.query(
    "INSERT INTO pay_runs (tenant_id, label, pay_date, status) VALUES ($1,'May 1-15, 2026','2026-05-15','posted') RETURNING id",
    [demo],
  );
  for (let i = 0; i < EMPLOYEES.length; i++) {
    const row = EMPLOYEES[i];
    const name = row[0];
    const pay = row[4];
    const tax = Math.round(pay * 0.2);
    await sql.query(
      "INSERT INTO pay_run_entries (tenant_id, pay_run_id, employee_id, employee_name, gross_cents, tax_cents, net_cents) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [demo, run[0].id, empIds[i], name, pay, tax, pay - tax],
    );
  }
  console.log("✓ seeded 3 employees, 1 pay run");
} else {
  console.log("• payroll demo data already present — skipped");
}

// 14. Bank reconciliations.
const reconCount = await sql.query("SELECT count(*)::int AS n FROM bank_reconciliations WHERE tenant_id = $1", [demo]);
if (reconCount[0].n === 0) {
  await sql.query(
    "INSERT INTO bank_reconciliations (tenant_id, account_name, statement_date, statement_balance_cents, reconciled_balance_cents, status, notes) VALUES ($1,'Operating Cash — Chase 4471','2026-04-30',4185020,4185020,'completed','April reconciled — ties out to the penny.')",
    [demo],
  );
  await sql.query(
    "INSERT INTO bank_reconciliations (tenant_id, account_name, statement_date, statement_balance_cents, reconciled_balance_cents, status, notes) VALUES ($1,'Premium Trust — Chase 4488','2026-04-30',414375,401200,'in_progress','Two deposits not yet cleared.')",
    [demo],
  );
  console.log("✓ seeded 2 bank reconciliations");
} else {
  console.log("• bank reconciliations already present — skipped");
}

// 15. Budgets, fixed assets, estimates demo data.
const budgetCount = await sql.query("SELECT count(*)::int AS n FROM budgets WHERE tenant_id = $1", [demo]);
if (budgetCount[0].n === 0) {
  const accts = await sql.query(
    "SELECT id, account_number FROM chart_of_accounts WHERE tenant_id = $1",
    [demo],
  );
  const byNum = {};
  for (const a of accts) byNum[a.account_number] = a.id;
  const b = await sql.query(
    "INSERT INTO budgets (tenant_id, name, fiscal_year, status) VALUES ($1,'Operating Budget','2026','active') RETURNING id",
    [demo],
  );
  for (const [num, amt] of [
    ["5000", 2880000],
    ["6000", 4560000],
    ["6100", 1800000],
    ["6200", 960000],
  ]) {
    if (byNum[num]) {
      await sql.query(
        "INSERT INTO budget_lines (tenant_id, budget_id, account_id, annual_amount_cents) VALUES ($1,$2,$3,$4)",
        [demo, b[0].id, byNum[num], amt],
      );
    }
  }
  console.log("✓ seeded 1 budget + 4 lines");
} else {
  console.log("• budgets already present — skipped");
}

const assetCount = await sql.query("SELECT count(*)::int AS n FROM fixed_assets WHERE tenant_id = $1", [demo]);
if (assetCount[0].n === 0) {
  for (const [name, cat, cost, salvage, life, acq] of [
    ["Office workstations (6)", "Computer equipment", 1080000, 108000, 5, "2025-03-01"],
    ["Conference room AV", "Office equipment", 420000, 40000, 7, "2025-09-15"],
    ["Company vehicle", "Vehicle", 3850000, 800000, 5, "2024-06-01"],
  ]) {
    await sql.query(
      "INSERT INTO fixed_assets (tenant_id, name, category, acquisition_cost_cents, salvage_value_cents, useful_life_years, method, acquired_date) VALUES ($1,$2,$3,$4,$5,$6,'straight_line',$7)",
      [demo, name, cat, cost, salvage, life, acq],
    );
  }
  console.log("✓ seeded 3 fixed assets");
} else {
  console.log("• fixed assets already present — skipped");
}

const estCount = await sql.query("SELECT count(*)::int AS n FROM estimates WHERE tenant_id = $1", [demo]);
if (estCount[0].n === 0) {
  const cls = await sql.query(
    "SELECT id FROM clients WHERE tenant_id = $1 ORDER BY created_at LIMIT 2",
    [demo],
  );
  if (cls.length === 2) {
    await sql.query(
      "INSERT INTO estimates (tenant_id, client_id, estimate_number, description, amount_cents, status, valid_until) VALUES ($1,$2,'EST-2026-044','Commercial package — proposed program',1850000,'sent','2026-06-30')",
      [demo, cls[0].id],
    );
    await sql.query(
      "INSERT INTO estimates (tenant_id, client_id, estimate_number, description, amount_cents, status, valid_until) VALUES ($1,$2,'EST-2026-051','Workers comp and GL bundle',640000,'accepted','2026-07-15')",
      [demo, cls[1].id],
    );
  }
  console.log("✓ seeded 2 estimates");
} else {
  console.log("• estimates already present — skipped");
}

// 16. Checks, fiscal periods, surplus lines, quarterly taxes demo data.
const checkCount = await sql.query("SELECT count(*)::int AS n FROM check_register WHERE tenant_id = $1", [demo]);
if (checkCount[0].n === 0) {
  await sql.query(
    "INSERT INTO check_register (tenant_id, check_number, payee, amount_cents, check_date, memo, status) VALUES ($1,'1042','Travelers Insurance',1850000,'2026-04-12','April premium remittance','cleared'),($1,'1043','Acme Office Supply',23400,'2026-04-18','Printer toner','cleared'),($1,'1044','Westfield Property Mgmt',420000,'2026-05-01','May office rent','printed')",
    [demo],
  );
  console.log("✓ seeded 3 checks");
} else {
  console.log("• checks already present — skipped");
}

const periodCount = await sql.query("SELECT count(*)::int AS n FROM accounting_periods WHERE tenant_id = $1", [demo]);
if (periodCount[0].n === 0) {
  await sql.query(
    "INSERT INTO accounting_periods (tenant_id, name, start_date, end_date, status) VALUES ($1,'2026-Q1','2026-01-01','2026-03-31','closed'),($1,'2026-Q2','2026-04-01','2026-06-30','open')",
    [demo],
  );
  console.log("✓ seeded 2 fiscal periods");
} else {
  console.log("• fiscal periods already present — skipped");
}

const slCount = await sql.query("SELECT count(*)::int AS n FROM surplus_lines_tax WHERE tenant_id = $1", [demo]);
if (slCount[0].n === 0) {
  await sql.query(
    "INSERT INTO surplus_lines_tax (tenant_id, policy_reference, state, premium_cents, tax_rate_percent, tax_cents, stamping_fee_cents, filing_fee_cents, due_date, status) VALUES ($1,'SL-2026-008 — Coastal Cannery','CA',4200000,'3',126000,8400,2500,'2026-06-15','filed'),($1,'SL-2026-012 — Harbor Logistics','TX',2750000,'4.85',133375,0,3000,'2026-07-01','pending')",
    [demo],
  );
  console.log("✓ seeded 2 surplus-lines filings");
} else {
  console.log("• surplus-lines tax already present — skipped");
}

const qtCount = await sql.query("SELECT count(*)::int AS n FROM quarterly_tax_payments WHERE tenant_id = $1", [demo]);
if (qtCount[0].n === 0) {
  await sql.query(
    "INSERT INTO quarterly_tax_payments (tenant_id, tax_type, year, quarter, estimated_cents, paid_cents, due_date, status) VALUES ($1,'Federal estimated','2026','Q1',850000,850000,'2026-04-15','paid'),($1,'Federal estimated','2026','Q2',850000,0,'2026-06-15','scheduled'),($1,'State estimated','2026','Q2',210000,0,'2026-06-15','scheduled')",
    [demo],
  );
  console.log("✓ seeded 3 quarterly tax payments");
} else {
  console.log("• quarterly taxes already present — skipped");
}

// 17. Policy servicing — coverages, endorsements, cancellations, installments.
const covCount = await sql.query("SELECT count(*)::int AS n FROM policy_coverages WHERE tenant_id = $1", [demo]);
if (covCount[0].n === 0) {
  const pols = await sql.query(
    "SELECT id FROM policies WHERE tenant_id = $1 ORDER BY created_at LIMIT 2",
    [demo],
  );
  if (pols.length >= 1) {
    const p0 = pols[0].id;
    await sql.query(
      "INSERT INTO policy_coverages (tenant_id, policy_id, coverage_type, limit_text, deductible_cents, premium_cents, notes) VALUES ($1,$2,'General Liability','$1M / $2M',100000,480000,'Per-occurrence and aggregate'),($1,$2,'Property','$750,000 blanket',250000,310000,'Replacement cost valuation')",
      [demo, p0],
    );
    await sql.query(
      "INSERT INTO policy_endorsements (tenant_id, policy_id, endorsement_number, effective_date, description, premium_change_cents, status) VALUES ($1,$2,'END-001','2026-03-15','Added scheduled equipment',45000,'issued')",
      [demo, p0],
    );
    await sql.query(
      "INSERT INTO premium_installments (tenant_id, policy_id, installment_number, due_date, amount_cents, paid_cents, status) VALUES ($1,$2,1,'2026-01-15',79000,79000,'paid'),($1,$2,2,'2026-04-15',79000,0,'scheduled'),($1,$2,3,'2026-07-15',79000,0,'scheduled')",
      [demo, p0],
    );
    if (pols.length >= 2) {
      await sql.query(
        "INSERT INTO policy_cancellations (tenant_id, policy_id, request_date, effective_date, reason, cancellation_type, return_premium_cents, status) VALUES ($1,$2,'2026-04-02','2026-04-30','Insured rewrote with another carrier','pro_rata',120000,'processed')",
        [demo, pols[1].id],
      );
    }
  }
  console.log("✓ seeded policy coverages, endorsement, cancellation, installments");
} else {
  console.log("• policy servicing demo data already present — skipped");
}

// 18. Policy servicing extras — schedules, audits, activities, documents.
const schedCount = await sql.query("SELECT count(*)::int AS n FROM insured_schedule_items WHERE tenant_id = $1", [demo]);
if (schedCount[0].n === 0) {
  const pols = await sql.query(
    "SELECT id FROM policies WHERE tenant_id = $1 ORDER BY created_at LIMIT 1",
    [demo],
  );
  if (pols.length >= 1) {
    const p0 = pols[0].id;
    await sql.query(
      "INSERT INTO insured_schedule_items (tenant_id, policy_id, item_type, description, identifier, value_cents, notes) VALUES ($1,$2,'vehicle','2024 Ford Transit 250','1FTBR1Y89PKA12345',4200000,'Delivery van'),($1,$2,'equipment','Commercial espresso machine','SN-88421',1850000,'')",
      [demo, p0],
    );
    await sql.query(
      "INSERT INTO premium_audits (tenant_id, policy_id, audit_type, period_start, period_end, estimated_premium_cents, audited_premium_cents, status, notes) VALUES ($1,$2,'Workers Comp','2025-01-01','2025-12-31',1200000,1345000,'completed','Payroll exceeded estimate')",
      [demo, p0],
    );
    await sql.query(
      "INSERT INTO service_activities (tenant_id, policy_id, activity_type, subject, detail, assigned_to, due_date, status) VALUES ($1,$2,'change_request','Add new driver to auto policy','Insured hired a delivery driver','Polina','2026-05-25','open'),($1,$2,'coverage_review','Annual coverage review','','Matt','2026-06-10','in_progress')",
      [demo, p0],
    );
    await sql.query(
      "INSERT INTO policy_documents (tenant_id, policy_id, document_type, title, reference, issued_date, notes) VALUES ($1,$2,'dec_page','2026 Declarations Page','DOC-2026-0142','2026-01-05',''),($1,$2,'id_card','Auto ID Cards','DOC-2026-0143','2026-01-05','')",
      [demo, p0],
    );
  }
  console.log("✓ seeded schedule items, audit, activities, documents");
} else {
  console.log("• policy servicing extras already present — skipped");
}

// 19. Claims lifecycle — diary, reserves, payments, recoveries.
const cnoteCount = await sql.query("SELECT count(*)::int AS n FROM claim_notes WHERE tenant_id = $1", [demo]);
if (cnoteCount[0].n === 0) {
  const cls = await sql.query(
    "SELECT id FROM claims WHERE tenant_id = $1 ORDER BY created_at LIMIT 1",
    [demo],
  );
  if (cls.length >= 1) {
    const c0 = cls[0].id;
    await sql.query(
      "INSERT INTO claim_notes (tenant_id, claim_id, note_date, author, category, body) VALUES ($1,$2,'2026-04-10','Polina','investigation','Adjuster assigned; recorded statement scheduled.'),($1,$2,'2026-04-14','Matt','coverage','Coverage confirmed under property section, no exclusions apply.')",
      [demo, c0],
    );
    await sql.query(
      "INSERT INTO claim_reserve_entries (tenant_id, claim_id, entry_date, reserve_type, change_cents, reason) VALUES ($1,$2,'2026-04-10','indemnity',5000000,'Initial reserve'),($1,$2,'2026-04-20','expense',750000,'Independent adjuster fees'),($1,$2,'2026-05-01','indemnity',-1000000,'Reserve reduced after inspection')",
      [demo, c0],
    );
    await sql.query(
      "INSERT INTO claim_payments (tenant_id, claim_id, payment_date, payee, payment_type, amount_cents, check_number, status) VALUES ($1,$2,'2026-05-05','Coastal Restoration LLC','indemnity',2800000,'2051','cleared'),($1,$2,'2026-05-06','Allied Adjusters','expense',680000,'2052','issued')",
      [demo, c0],
    );
    await sql.query(
      "INSERT INTO claim_recoveries (tenant_id, claim_id, recovery_type, description, expected_cents, recovered_cents, status) VALUES ($1,$2,'subrogation','Third-party contractor liability',1500000,0,'pursuing')",
      [demo, c0],
    );
  }
  console.log("✓ seeded claim notes, reserves, payments, recovery");
} else {
  console.log("• claims lifecycle demo data already present — skipped");
}

// 20. Claim parties and litigation.
const cpartyCount = await sql.query("SELECT count(*)::int AS n FROM claim_parties WHERE tenant_id = $1", [demo]);
if (cpartyCount[0].n === 0) {
  const cls = await sql.query(
    "SELECT id FROM claims WHERE tenant_id = $1 ORDER BY created_at LIMIT 1",
    [demo],
  );
  if (cls.length >= 1) {
    const c0 = cls[0].id;
    await sql.query(
      "INSERT INTO claim_parties (tenant_id, claim_id, role, name, organization, phone, email, notes) VALUES ($1,$2,'adjuster','Dana Whitfield','Allied Adjusters','555-0142','dana@alliedadj.com','Field adjuster'),($1,$2,'attorney','R. Patel, Esq.','Patel & Cole LLP','555-0188','rpatel@patelcole.com','Defense counsel'),($1,$2,'witness','Jordan Bell','','555-0200','','On-site at time of loss')",
      [demo, c0],
    );
    await sql.query(
      "INSERT INTO claim_litigation (tenant_id, claim_id, case_caption, court, docket_number, defense_attorney, filed_date, trial_date, status, notes) VALUES ($1,$2,'Bell v. Coastal Cannery','Santa Cruz County Superior Court','SC-2026-04417','R. Patel, Esq.','2026-04-28','2026-11-10','discovery','Depositions scheduled for September')",
      [demo, c0],
    );
  }
  console.log("✓ seeded claim parties + litigation");
} else {
  console.log("• claim parties/litigation demo data already present — skipped");
}

// 21. Commissions — producers, splits, carrier statements, payouts.
const prodCount = await sql.query("SELECT count(*)::int AS n FROM producers WHERE tenant_id = $1", [demo]);
if (prodCount[0].n === 0) {
  const p1 = await sql.query(
    "INSERT INTO producers (tenant_id, name, code, email, default_rate_percent, status) VALUES ($1,'Matt Slade','MS01','matt@prismams.com','12','active') RETURNING id",
    [demo],
  );
  const p2 = await sql.query(
    "INSERT INTO producers (tenant_id, name, code, email, default_rate_percent, status) VALUES ($1,'Polina Slade','PS01','polina@prismams.com','10','active') RETURNING id",
    [demo],
  );
  await sql.query(
    "INSERT INTO commission_statements (tenant_id, carrier_name, statement_date, period_label, expected_cents, reported_cents, status, notes) VALUES ($1,'Travelers','2026-04-30','April 2026',1240000,1240000,'reconciled',''),($1,'Liberty Mutual','2026-04-30','April 2026',880000,842000,'disputed','Short-paid two policies')",
    [demo],
  );
  await sql.query(
    "INSERT INTO producer_payouts (tenant_id, producer_id, payout_date, period_label, amount_cents, method, status) VALUES ($1,$2,'2026-04-15','March 2026',420000,'ACH','paid'),($1,$2,'2026-05-15','April 2026',385000,'ACH','scheduled')",
    [demo, p1[0].id],
  );
  const cms = await sql.query(
    "SELECT id, amount_cents FROM commissions WHERE tenant_id = $1 ORDER BY created_at LIMIT 1",
    [demo],
  );
  if (cms.length >= 1) {
    await sql.query(
      "INSERT INTO commission_splits (tenant_id, commission_id, producer_id, share_percent, amount_cents) VALUES ($1,$2,$3,'60',$4),($1,$2,$5,'40',$6)",
      [
        demo,
        cms[0].id,
        p1[0].id,
        Math.round(cms[0].amount_cents * 0.6),
        p2[0].id,
        Math.round(cms[0].amount_cents * 0.4),
      ],
    );
  }
  console.log("✓ seeded 2 producers, 2 statements, 2 payouts, splits");
} else {
  console.log("• commissions demo data already present — skipped");
}

// 22. Contingency & bonus income.
const contCount = await sql.query("SELECT count(*)::int AS n FROM contingency_income WHERE tenant_id = $1", [demo]);
if (contCount[0].n === 0) {
  await sql.query(
    "INSERT INTO contingency_income (tenant_id, carrier_name, year, income_type, expected_cents, received_cents, status, notes) VALUES ($1,'Travelers','2025','profit_share',3200000,3200000,'received','Loss ratio under target'),($1,'Liberty Mutual','2025','contingency',1450000,0,'projected','Awaiting year-end statement'),($1,'Nationwide','2025','growth',680000,680000,'closed','New-business growth bonus')",
    [demo],
  );
  console.log("✓ seeded 3 contingency income records");
} else {
  console.log("• contingency income already present — skipped");
}

// 23. Renewals — remarketing quotes, offers, retention records.
const rmCount = await sql.query("SELECT count(*)::int AS n FROM remarketing_quotes WHERE tenant_id = $1", [demo]);
if (rmCount[0].n === 0) {
  const rns = await sql.query(
    "SELECT id FROM renewals WHERE tenant_id = $1 ORDER BY created_at LIMIT 1",
    [demo],
  );
  if (rns.length >= 1) {
    const r0 = rns[0].id;
    await sql.query(
      "INSERT INTO remarketing_quotes (tenant_id, renewal_id, carrier_name, quoted_premium_cents, coverage_summary, status, notes) VALUES ($1,$2,'Travelers',1320000,'Same limits, $1k deductible','received',''),($1,$2,'The Hartford',1185000,'Equivalent program','selected','Best price'),($1,$2,'Nationwide',0,'','declined','Declined to quote')",
      [demo, r0],
    );
    await sql.query(
      "INSERT INTO renewal_offers (tenant_id, renewal_id, carrier_name, offer_date, premium_cents, prior_premium_cents, term_summary, expires_date, status) VALUES ($1,$2,'The Hartford','2026-05-10',1185000,1240000,'12-month term, no coverage changes','2026-06-01','presented')",
      [demo, r0],
    );
    await sql.query(
      "INSERT INTO retention_records (tenant_id, renewal_id, outcome, reason_code, prior_premium_cents, new_premium_cents, recorded_date, notes) VALUES ($1,$2,'rewritten','price',1240000,1185000,'2026-05-12','Rewrote with The Hartford for a lower rate')",
      [demo, r0],
    );
  }
  console.log("✓ seeded remarketing quotes, offer, retention record");
} else {
  console.log("• renewals demo data already present — skipped");
}

// 24. Clients CRM — contacts, activities, locations.
const ccCount = await sql.query("SELECT count(*)::int AS n FROM client_contacts WHERE tenant_id = $1", [demo]);
if (ccCount[0].n === 0) {
  const cls = await sql.query(
    "SELECT id FROM clients WHERE tenant_id = $1 ORDER BY created_at LIMIT 1",
    [demo],
  );
  if (cls.length >= 1) {
    const c0 = cls[0].id;
    await sql.query(
      "INSERT INTO client_contacts (tenant_id, client_id, name, title, email, phone, role, notes) VALUES ($1,$2,'Sandra Lee','Operations Manager','sandra@coastalcannery.com','555-0310','primary',''),($1,$2,'Tom Reyes','Controller','tom@coastalcannery.com','555-0311','billing','Handles invoices')",
      [demo, c0],
    );
    await sql.query(
      "INSERT INTO client_activities (tenant_id, client_id, activity_type, subject, detail, activity_date, author) VALUES ($1,$2,'meeting','Annual coverage review','Walked through the program and discussed adding cyber.','2026-04-22','Matt'),($1,$2,'call','Follow-up on cyber quote','Left voicemail.','2026-05-06','Polina')",
      [demo, c0],
    );
    await sql.query(
      "INSERT INTO client_locations (tenant_id, client_id, label, location_type, address_line, city, state, postal_code) VALUES ($1,$2,'Headquarters','physical','120 Harbor Way','Santa Cruz','CA','95060'),($1,$2,'Billing office','billing','PO Box 4471','Santa Cruz','CA','95061')",
      [demo, c0],
    );
  }
  console.log("✓ seeded client contacts, activities, locations");
} else {
  console.log("• clients CRM demo data already present — skipped");
}

// 25. Pipeline & marketing — lead sources, leads, campaigns.
const leadCount = await sql.query("SELECT count(*)::int AS n FROM leads WHERE tenant_id = $1", [demo]);
if (leadCount[0].n === 0) {
  await sql.query(
    "INSERT INTO lead_sources (tenant_id, name, source_type, description, is_active) VALUES ($1,'Client referral','referral','Word-of-mouth from existing clients',true),($1,'Website contact form','web','Inbound from prismams.com',true),($1,'Chamber of Commerce','partner','Local chamber partnership',true)",
    [demo],
  );
  await sql.query(
    "INSERT INTO leads (tenant_id, name, company, email, phone, source, line_of_business, estimated_value_cents, status, notes) VALUES ($1,'Greg Mason','Mason Freight','greg@masonfreight.com','555-0420','Client referral','Commercial Auto',850000,'qualified','Fleet of 12 trucks'),($1,'Dana Kerr','Kerr Bakery','dana@kerrbakery.com','555-0421','Website contact form','BOP',240000,'working','')",
    [demo],
  );
  await sql.query(
    "INSERT INTO marketing_campaigns (tenant_id, name, channel, start_date, end_date, budget_cents, status, notes) VALUES ($1,'Spring small-business push','Email','2026-03-01','2026-05-31',300000,'active','Targeting local retail'),($1,'Q3 referral drive','Direct mail','2026-07-01','2026-09-30',500000,'planned','')",
    [demo],
  );
  console.log("✓ seeded 3 lead sources, 2 leads, 2 campaigns");
} else {
  console.log("• pipeline/marketing demo data already present — skipped");
}

console.log("✓ demo tenant seeded: modules, custom fields, 3 carrier connections, VoIP");
