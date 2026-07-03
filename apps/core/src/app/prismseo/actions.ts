"use server";

import { runSeoAudit, type AuditReport } from "@/lib/seo-audit";
import { getPrismOptimizeMembership } from "@/lib/prismoptimize-membership";

/**
 * PrismOptimize audit — members only. Membership is checked server-side on
 * every call (the page also gates the UI, but the action is the real door).
 * Until paid memberships launch, members are the gift list in
 * `PRISMOPTIMIZE_MEMBER_EMAILS`.
 */

export async function publicAudit(url: string): Promise<AuditReport> {
  const membership = await getPrismOptimizeMembership();
  if (!membership.entitled) {
    return {
      url,
      fetched: false,
      error: membership.signedIn
        ? "PrismOptimize memberships are opening soon — your account isn't active yet."
        : "PrismOptimize is members-only — sign in to run audits.",
      checks: [],
      suggestions: [],
    };
  }

  try {
    return await runSeoAudit(url);
  } catch (error) {
    return {
      url,
      fetched: false,
      error: error instanceof Error ? error.message : "Audit failed.",
      checks: [],
      suggestions: [],
    };
  }
}
