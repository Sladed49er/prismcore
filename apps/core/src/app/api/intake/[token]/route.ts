import { NextResponse } from "next/server";
import { recordSubmission } from "@/lib/intake-forms";

/** Reads a posted form body — never cache. */
export const dynamic = "force-dynamic";

/**
 * Public intake-form submission.
 *
 *   POST /api/intake/<token>   body: { values: Record<string,string> }
 *
 * No user session — the form's token scopes it to its tenant. Only a
 * published form accepts submissions.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  let body: { values?: unknown };
  try {
    body = (await request.json()) as { values?: unknown };
  } catch {
    return NextResponse.json({ error: "expected JSON" }, { status: 400 });
  }
  const raw =
    typeof body.values === "object" && body.values !== null
      ? (body.values as Record<string, unknown>)
      : {};
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    values[k] = v == null ? "" : String(v);
  }

  const result = await recordSubmission(token, values);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
