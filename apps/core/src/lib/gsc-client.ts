import { createSign } from "crypto";

/**
 * Minimal Google Search Console client authenticated as the
 * `seo-rankings@prism-seo-rankings` service account, which is a verified
 * owner of the tenant sites it tracks (ownership granted via the Site
 * Verification API — a token file served from each site's repo).
 *
 * Env: `GSC_SERVICE_ACCOUNT_KEY` — the service-account JSON key, base64.
 */

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function loadKey(): ServiceAccountKey {
  const raw = process.env.GSC_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("GSC_SERVICE_ACCOUNT_KEY is not set.");
  return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
}

const b64url = (buf: Buffer | string): string =>
  Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function accessToken(scopes: string[]): Promise<string> {
  const key = loadKey();
  const now = Math.floor(Date.now() / 1000);
  const input =
    b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) +
    "." +
    b64url(
      JSON.stringify({
        iss: key.client_email,
        scope: scopes.join(" "),
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    );
  const signature = createSign("RSA-SHA256")
    .update(input)
    .sign(key.private_key);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${input}.${b64url(signature)}`,
  });
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error("Google token exchange failed.");
  }
  return body.access_token;
}

export interface QueryStats {
  position: number;
  clicks: number;
  impressions: number;
}

/**
 * Search performance by query for the last 7 complete days (GSC data lags
 * ~2 days). Keys are lowercased query strings.
 */
export async function searchAnalyticsByQuery(
  siteUrl: string,
): Promise<Map<string, QueryStats>> {
  const token = await accessToken([
    "https://www.googleapis.com/auth/webmasters.readonly",
  ]);
  const property = new URL(siteUrl).origin + "/";
  const end = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
  const day = (d: Date) => d.toISOString().slice(0, 10);

  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: day(start),
        endDate: day(end),
        dimensions: ["query"],
        rowLimit: 5000,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Search Console query failed (${response.status}).`);
  }
  const body = (await response.json()) as {
    rows?: { keys: string[]; position: number; clicks: number; impressions: number }[];
  };
  const map = new Map<string, QueryStats>();
  for (const row of body.rows ?? []) {
    map.set(row.keys[0]!.toLowerCase(), {
      position: row.position,
      clicks: row.clicks,
      impressions: row.impressions,
    });
  }
  return map;
}
