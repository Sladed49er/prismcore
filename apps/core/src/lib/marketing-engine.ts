import { and, desc, eq, lte, ne } from "drizzle-orm";
import {
  withTenantContext,
  adminDb,
  tenants,
  clients,
  marketingTemplates,
  marketingSequences,
  marketingEnrollments,
  marketingSends,
  type MarketingTemplate,
  type MarketingSequence,
  type SequenceStep,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";
import { sendEmail } from "@/lib/email";

/**
 * Marketing engine — templates, drip sequences, and real email send.
 *
 * Templates are reusable subject + HTML body. A campaign send blasts one
 * template to every client with an email. A sequence is an ordered set of
 * template steps with day delays; enrolling a client schedules the first
 * step, and `advanceDueSequences` (run by the marketing cron) walks each
 * enrollment forward. All RLS-scoped through `withTenantContext`.
 */

const DAY = 86_400_000;
/** A single send pass never mails more than this — a safety cap. */
const SEND_CAP = 300;

export type { MarketingTemplate, MarketingSequence };

/** Substitute the handful of merge tokens a template body may use. */
function render(text: string, client: { name: string }): string {
  const first = client.name.split(/\s+/)[0] ?? client.name;
  return text
    .replaceAll("{{name}}", client.name)
    .replaceAll("{{first_name}}", first);
}

// ── Templates ──────────────────────────────────────────────────────

export async function listTemplates(
  tenantId: string,
): Promise<MarketingTemplate[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(marketingTemplates)
      .where(eq(marketingTemplates.tenantId, tenantId))
      .orderBy(desc(marketingTemplates.createdAt)),
  );
}

export async function createTemplate(input: {
  tenantId: string;
  name: string;
  subject: string;
  body: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(marketingTemplates).values(input);
  });
}

export async function updateTemplate(input: {
  tenantId: string;
  id: string;
  name: string;
  subject: string;
  body: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(marketingTemplates)
      .set({
        name: input.name,
        subject: input.subject,
        body: input.body,
        updatedAt: new Date(),
      })
      .where(eq(marketingTemplates.id, input.id));
  });
}

export async function deleteTemplate(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(marketingTemplates)
      .where(eq(marketingTemplates.id, id));
  });
}

// ── Sequences ──────────────────────────────────────────────────────

export async function listSequences(
  tenantId: string,
): Promise<MarketingSequence[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(marketingSequences)
      .where(eq(marketingSequences.tenantId, tenantId))
      .orderBy(desc(marketingSequences.createdAt)),
  );
}

export async function createSequence(
  tenantId: string,
  name: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.insert(marketingSequences).values({ tenantId, name });
  });
}

export async function updateSequence(input: {
  tenantId: string;
  id: string;
  name: string;
  status: string;
  steps: SequenceStep[];
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(marketingSequences)
      .set({
        name: input.name,
        status: input.status,
        steps: input.steps,
        updatedAt: new Date(),
      })
      .where(eq(marketingSequences.id, input.id));
  });
}

export async function deleteSequence(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(marketingSequences)
      .where(eq(marketingSequences.id, id));
  });
}

// ── Enrollments ────────────────────────────────────────────────────

export interface EnrollmentRow {
  id: string;
  sequenceName: string;
  clientName: string;
  status: string;
  currentStep: number;
  nextSendAt: Date | null;
}

export async function listEnrollments(
  tenantId: string,
): Promise<EnrollmentRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: marketingEnrollments.id,
        sequenceName: marketingSequences.name,
        client: clients,
        status: marketingEnrollments.status,
        currentStep: marketingEnrollments.currentStep,
        nextSendAt: marketingEnrollments.nextSendAt,
      })
      .from(marketingEnrollments)
      .innerJoin(
        marketingSequences,
        eq(marketingSequences.id, marketingEnrollments.sequenceId),
      )
      .innerJoin(clients, eq(clients.id, marketingEnrollments.clientId))
      .where(eq(marketingEnrollments.tenantId, tenantId))
      .orderBy(desc(marketingEnrollments.createdAt));
    return rows.map((r) => ({
      id: r.id,
      sequenceName: r.sequenceName,
      clientName: clientDisplayName(r.client),
      status: r.status,
      currentStep: r.currentStep,
      nextSendAt: r.nextSendAt,
    }));
  });
}

/** Enroll a client into a sequence — schedules the first step. */
export async function enrollClient(
  tenantId: string,
  sequenceId: string,
  clientId: string,
): Promise<{ ok: boolean; message: string }> {
  return withTenantContext(tenantId, async (tx) => {
    const [seq] = await tx
      .select()
      .from(marketingSequences)
      .where(eq(marketingSequences.id, sequenceId));
    if (!seq) return { ok: false, message: "Sequence not found." };
    if (seq.steps.length === 0) {
      return { ok: false, message: "This sequence has no steps yet." };
    }
    const [existing] = await tx
      .select()
      .from(marketingEnrollments)
      .where(
        and(
          eq(marketingEnrollments.sequenceId, sequenceId),
          eq(marketingEnrollments.clientId, clientId),
          eq(marketingEnrollments.status, "active"),
        ),
      );
    if (existing) {
      return { ok: false, message: "That client is already enrolled." };
    }
    const firstDelay = seq.steps[0]!.delayDays;
    await tx.insert(marketingEnrollments).values({
      tenantId,
      sequenceId,
      clientId,
      nextSendAt: new Date(Date.now() + firstDelay * DAY),
    });
    return { ok: true, message: "Client enrolled." };
  });
}

export async function cancelEnrollment(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(marketingEnrollments)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(marketingEnrollments.id, id));
  });
}

// ── Sends ──────────────────────────────────────────────────────────

export async function listSends(
  tenantId: string,
  limit = 50,
): Promise<(typeof marketingSends.$inferSelect)[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(marketingSends)
      .where(eq(marketingSends.tenantId, tenantId))
      .orderBy(desc(marketingSends.sentAt))
      .limit(limit),
  );
}

export interface SendResult {
  ok: boolean;
  message: string;
  sent: number;
}

/**
 * Send one template to every client with an email address — a campaign blast.
 * Each delivery is logged in `marketing_sends`.
 */
export async function sendCampaign(
  tenantId: string,
  campaignId: string,
  templateId: string,
): Promise<SendResult> {
  const { template, recipients } = await withTenantContext(
    tenantId,
    async (tx) => {
      const [tpl] = await tx
        .select()
        .from(marketingTemplates)
        .where(eq(marketingTemplates.id, templateId));
      const clientRows = await tx
        .select()
        .from(clients)
        .where(eq(clients.tenantId, tenantId));
      return { template: tpl ?? null, recipients: clientRows };
    },
  );
  if (!template) return { ok: false, message: "Template not found.", sent: 0 };

  const targets = recipients
    .filter((c) => c.email && c.email.includes("@"))
    .slice(0, SEND_CAP);
  if (targets.length === 0) {
    return { ok: false, message: "No clients have an email address.", sent: 0 };
  }

  let sent = 0;
  const logRows: (typeof marketingSends.$inferInsert)[] = [];
  for (const c of targets) {
    const name = clientDisplayName(c);
    const result = await sendEmail({
      to: c.email!,
      subject: render(template.subject, { name }),
      html: render(template.body, { name }),
    });
    if (result.sent) sent++;
    logRows.push({
      tenantId,
      clientId: c.id,
      toEmail: c.email!,
      subject: render(template.subject, { name }),
      source: "campaign",
      sourceId: campaignId,
      status: result.sent ? "sent" : "failed",
    });
  }
  await withTenantContext(tenantId, async (tx) => {
    await tx.insert(marketingSends).values(logRows);
  });
  return {
    ok: true,
    message: `Sent ${sent} of ${targets.length} email${targets.length === 1 ? "" : "s"}.`,
    sent,
  };
}

/**
 * Advance every enrollment whose next step is due — send the step's template,
 * then schedule the following step or complete the enrollment. Run per tenant
 * by the marketing cron.
 */
export async function advanceDueSequences(
  tenantId: string,
): Promise<{ advanced: number; sent: number }> {
  const now = new Date();
  const work = await withTenantContext(tenantId, async (tx) => {
    const due = await tx
      .select({
        enrollment: marketingEnrollments,
        sequence: marketingSequences,
        client: clients,
      })
      .from(marketingEnrollments)
      .innerJoin(
        marketingSequences,
        eq(marketingSequences.id, marketingEnrollments.sequenceId),
      )
      .innerJoin(clients, eq(clients.id, marketingEnrollments.clientId))
      .where(
        and(
          eq(marketingEnrollments.tenantId, tenantId),
          eq(marketingEnrollments.status, "active"),
          lte(marketingEnrollments.nextSendAt, now),
        ),
      )
      .limit(SEND_CAP);
    const templates = await tx
      .select()
      .from(marketingTemplates)
      .where(eq(marketingTemplates.tenantId, tenantId));
    return { due, templates };
  });

  const tplById = new Map(work.templates.map((t) => [t.id, t]));
  let advanced = 0;
  let sent = 0;
  const sendLog: (typeof marketingSends.$inferInsert)[] = [];

  for (const row of work.due) {
    const steps = row.sequence.steps;
    const step = steps[row.enrollment.currentStep];
    const name = clientDisplayName(row.client);
    const email = row.client.email;

    if (step && email && email.includes("@")) {
      const tpl = tplById.get(step.templateId);
      if (tpl) {
        const result = await sendEmail({
          to: email,
          subject: render(tpl.subject, { name }),
          html: render(tpl.body, { name }),
        });
        if (result.sent) sent++;
        sendLog.push({
          tenantId,
          clientId: row.client.id,
          toEmail: email,
          subject: render(tpl.subject, { name }),
          source: "sequence",
          sourceId: row.sequence.id,
          status: result.sent ? "sent" : "failed",
        });
      }
    }

    const nextStepIdx = row.enrollment.currentStep + 1;
    const nextStep = steps[nextStepIdx];
    await withTenantContext(tenantId, async (tx) => {
      if (nextStep) {
        await tx
          .update(marketingEnrollments)
          .set({
            currentStep: nextStepIdx,
            nextSendAt: new Date(Date.now() + nextStep.delayDays * DAY),
            updatedAt: new Date(),
          })
          .where(eq(marketingEnrollments.id, row.enrollment.id));
      } else {
        await tx
          .update(marketingEnrollments)
          .set({
            status: "completed",
            nextSendAt: null,
            updatedAt: new Date(),
          })
          .where(eq(marketingEnrollments.id, row.enrollment.id));
      }
    });
    advanced++;
  }

  if (sendLog.length > 0) {
    await withTenantContext(tenantId, async (tx) => {
      await tx.insert(marketingSends).values(sendLog);
    });
  }
  return { advanced, sent };
}

/** Every active tenant id — for the cron to walk. Platform-level, RLS-bypass. */
export async function allTenantIds(): Promise<string[]> {
  const rows = await adminDb()
    .select({ id: tenants.id })
    .from(tenants)
    .where(ne(tenants.status, "archived"));
  return rows.map((r) => r.id);
}
