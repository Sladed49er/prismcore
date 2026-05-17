import { asc, eq } from "drizzle-orm";
import { withTenantContext, users, type User } from "@prismcore/db";

export type { User };

/** The users belonging to one tenant — RLS-isolated via withTenantContext. */
export async function listTenantUsers(tenantId: string): Promise<User[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .orderBy(asc(users.email)),
  );
}
