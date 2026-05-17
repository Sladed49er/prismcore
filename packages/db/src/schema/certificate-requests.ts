/** Certificate requests schema — inbound requests for a COI. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const certificateRequestStatus = pgEnum(
  "certificate_request_status",
  ["open", "issued", "declined"],
);

export const certificateRequests = pgTable(
  "certificate_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    holderName: text("holder_name").notNull(),
    requestedBy: text("requested_by").notNull().default(""),
    policyReference: text("policy_reference").notNull().default(""),
    neededByDate: date("needed_by_date"),
    status: certificateRequestStatus("status").notNull().default("open"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("certificate_requests_tenant_idx").on(t.tenantId)],
);

export type CertificateRequest = typeof certificateRequests.$inferSelect;
export type NewCertificateRequest =
  typeof certificateRequests.$inferInsert;
