import { NextResponse, type NextRequest } from "next/server";
import { runMonitorSweep } from "@/lib/seo-monitoring";

/** Deep crawls run minutes — the sweep self-budgets under this ceiling. */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * PrismOptimize monitoring worker — runs daily via Vercel Cron
 * (see `apps/core/vercel.json`), but each monitored site is only re-audited
 * and emailed when its last run is ~a week old, so members get a weekly
 * report and a cut-short sweep catches up the next day.
 * CRON_SECRET-guarded like the other crons.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runMonitorSweep();
  return NextResponse.json(result);
}
