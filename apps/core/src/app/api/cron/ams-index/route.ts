import { NextResponse, type NextRequest } from "next/server";
import { runAllPhoneIndexSync } from "@/lib/ams";

/** A full client sync per HawkSoft tenant can take a while. */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * AMS phone-index worker — runs daily via Vercel Cron
 * (see `apps/core/vercel.json`).
 *
 * Refreshes the local phone index for every HawkSoft tenant, so caller
 * screen-pop matching stays current. CRON_SECRET-guarded like the other crons.
 * (AMS360 and Applied Epic search in real time; EZLynx indexes from its
 * applicant webhooks — none of those need this sweep.)
 */
export async function GET(req: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAllPhoneIndexSync();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/ams-index] run failed:", error);
    return NextResponse.json(
      { ok: false, error: "ams-index sync failed" },
      { status: 500 },
    );
  }
}
