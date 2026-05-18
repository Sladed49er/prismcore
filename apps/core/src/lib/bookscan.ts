import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  bookscanReports,
  type BookScanReport,
  type BookScanFinding,
  type BookScanComposition,
} from "@prismcore/db";

/**
 * BookScan data layer — saved AI book-of-business analyses. RLS-scoped through
 * `withTenantContext`. The analysis itself lives in `bookscan-assistant.ts`.
 */

export type { BookScanReport, BookScanFinding, BookScanComposition };

export async function listBookScanReports(
  tenantId: string,
): Promise<BookScanReport[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(bookscanReports)
      .where(eq(bookscanReports.tenantId, tenantId))
      .orderBy(desc(bookscanReports.createdAt)),
  );
}

export async function saveBookScanReport(input: {
  tenantId: string;
  generatedBy: string;
  totalClients: number;
  totalPolicies: number;
  totalPremiumCents: number;
  summary: string;
  findings: BookScanFinding[];
  composition: BookScanComposition;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(bookscanReports).values(input);
  });
}

export async function deleteBookScanReport(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(bookscanReports).where(eq(bookscanReports.id, id));
  });
}
