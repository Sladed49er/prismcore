/** Carrier appointments schema — the agency's appointments with carriers. Tenant-scoped. */
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
import { carriers } from "./carriers";

export const carrierAppointmentStatus = pgEnum(
  "carrier_appointment_status",
  ["active", "pending", "terminated"],
);

export const carrierAppointments = pgTable(
  "carrier_appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    carrierId: uuid("carrier_id")
      .notNull()
      .references(() => carriers.id, { onDelete: "cascade" }),
    lineOfBusiness: text("line_of_business").notNull().default(""),
    appointmentNumber: text("appointment_number").notNull().default(""),
    effectiveDate: date("effective_date"),
    commissionRatePercent: text("commission_rate_percent")
      .notNull()
      .default(""),
    status: carrierAppointmentStatus("status").notNull().default("active"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("carrier_appointments_tenant_idx").on(t.tenantId),
    index("carrier_appointments_carrier_idx").on(t.carrierId),
  ],
);

export type CarrierAppointment = typeof carrierAppointments.$inferSelect;
export type NewCarrierAppointment =
  typeof carrierAppointments.$inferInsert;
