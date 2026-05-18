/**
 * Contract documents schema — documents attached to a vendor contract
 * (the agreement itself, amendments, COIs, related files). Tenant-scoped.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { vendorContracts } from "./contracts";

export const contractDocuments = pgTable(
  "contract_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => vendorContracts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** agreement · amendment · invoice · coi · other. */
    docType: text("doc_type").notNull().default("agreement"),
    url: text("url").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("contract_documents_tenant_idx").on(t.tenantId),
    index("contract_documents_contract_idx").on(t.contractId),
  ],
);

export type ContractDocument = typeof contractDocuments.$inferSelect;
export type NewContractDocument = typeof contractDocuments.$inferInsert;
