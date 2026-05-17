import { NextResponse, type NextRequest } from "next/server";
import { runAmsSyncBatch } from "@/lib/ams-sync";

/** AMS SOAP round-trips can be slow — give the batch room. */
export const maxDuration = 60;
/** This route reads `Date.now()` and the DB — never cache it. */
export const dynamic = "force-dynamic";

/**
 * AMS write-back worker — runs once a minute via Vercel Cron
 * (see `apps/core/vercel.json`).
 *
 * Drains the queue of calls waiting to be logged into their tenants' AMS.
 * Authenticated by `CRON_SECRET`: Vercel sends it as a Bearer token on the
 * scheduled invocation; a request without it is rejected, so the endpoint
 * cannot be driven externally.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAmsSyncBatch();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/ams-sync] batch failed:", error);
    return NextResponse.json(
      { ok: false, error: "ams-sync batch failed" },
      { status: 500 },
    );
  }
}
