/**
 * Database access for Prism Core.
 *
 * Two connections, defense-in-depth (the proven PrismAMS pattern):
 *   - `adminDb()` connects as a BYPASSRLS role. Migrations, bootstrap, platform-admin.
 *   - `appDb()`   connects as a NOBYPASSRLS role. All tenant-scoped runtime access,
 *                 always through `withTenantContext()` so RLS policies apply.
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import * as schema from "./schema";

// Neon's pooled/session driver needs a WebSocket. Node 22+ has a global one;
// older runtimes (and some Vercel functions) do not — fall back to `ws`.
if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

type Schema = typeof schema;
export type Database = NeonDatabase<Schema>;

let adminInstance: Database | undefined;
let appInstance: Database | undefined;

function connect(connectionString: string): Database {
  return drizzle(new Pool({ connectionString }), { schema });
}

/** Admin connection — BYPASSRLS. Migrations, bootstrap, platform-admin only. */
export function adminDb(): Database {
  if (!adminInstance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    adminInstance = connect(url);
  }
  return adminInstance;
}

/** App connection — RLS-bound (NOBYPASSRLS role). Use via `withTenantContext`. */
export function appDb(): Database {
  if (!appInstance) {
    const url = process.env.DATABASE_URL_APP ?? process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL (or DATABASE_URL_APP) is not set");
    appInstance = connect(url);
  }
  return appInstance;
}

/**
 * Run `fn` inside a transaction with the tenant GUC set, so every query is scoped
 * to `tenantId` by PostgreSQL RLS policies. This is the only correct way to read
 * or write tenant-scoped data at runtime.
 */
export async function withTenantContext<T>(
  tenantId: string,
  fn: (tx: Database) => Promise<T>,
): Promise<T> {
  return appDb().transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.current_tenant_id', ${tenantId}, true)`,
    );
    return fn(tx as unknown as Database);
  });
}

export * from "./schema";
export * as schema from "./schema";
