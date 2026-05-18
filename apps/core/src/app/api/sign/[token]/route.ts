import { NextResponse } from "next/server";
import { submitSignature, declineSignature } from "@/lib/esign";

/** Reads a posted signing body — never cache. */
export const dynamic = "force-dynamic";

/**
 * Public eSign ceremony submission.
 *
 *   POST /api/sign/<token>
 *     { action: "sign", signedName, values }   — complete the ceremony
 *     { action: "decline", reason }            — decline
 *
 * No user session — the request token scopes it to its tenant.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  let body: {
    action?: unknown;
    signedName?: unknown;
    values?: unknown;
    reason?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "expected JSON" }, { status: 400 });
  }

  if (body.action === "decline") {
    const result = await declineSignature(
      token,
      typeof body.reason === "string" ? body.reason : "",
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  const raw =
    typeof body.values === "object" && body.values !== null
      ? (body.values as Record<string, unknown>)
      : {};
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    values[k] = v == null ? "" : String(v);
  }
  const result = await submitSignature(
    token,
    values,
    typeof body.signedName === "string" ? body.signedName : "",
  );
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
