"use server";

import { headers } from "next/headers";
import { runSeoAudit, type AuditReport } from "@/lib/seo-audit";

/**
 * Public PrismSEO audit — no sign-in. Rate-limited per IP so the free tool
 * (and its Claude pass) can't be farmed. Best-effort in-memory limiter: per
 * serverless instance, which is fine for a lead-gen tool — the hard backstop
 * is the audit's own fetch timeout and token cap.
 */

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

const hits = new Map<string, number[]>();

function allow(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Cap the map so a wide scan can't grow memory unbounded.
  if (hits.size > 10_000) hits.clear();
  return true;
}

export async function publicAudit(url: string): Promise<AuditReport> {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (!allow(ip)) {
    return {
      url,
      fetched: false,
      error:
        "Rate limit reached — 5 free audits per hour. Come back shortly, or reach out for the full SEO Engine.",
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
