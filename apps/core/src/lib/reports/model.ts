import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import {
  clients,
  policies,
  invoices,
  claims,
  calls,
  producers,
  commissions,
  renewals,
  opportunities,
  tasks,
  vendors,
  bills,
} from "@prismcore/db";

/**
 * The report model — the semantic layer the report builder queries.
 *
 * Each entity declares the fields that can be reported on and its to-one
 * relationships to other entities. A report picks a BASE entity and may pull
 * fields from any entity reachable from the base by a chain of to-one
 * relationships; the engine resolves the join path. This declared model is
 * the safety boundary: the AI and the builder can only ever reference fields
 * and joins that exist here — never arbitrary SQL.
 *
 * Adding an entity is just another block here — no engine changes.
 */

export type FieldType = "text" | "number" | "money" | "date" | "boolean";

export interface ReportField {
  key: string;
  label: string;
  type: FieldType;
  column: AnyPgColumn;
}

/** A to-one relationship: `<entity>` belongs to `<target>`. */
export interface ReportRelationship {
  key: string;
  label: string;
  /** Entity key of the related (parent) entity. */
  target: string;
  localColumn: AnyPgColumn;
  foreignColumn: AnyPgColumn;
}

export interface ReportEntity {
  key: string;
  label: string;
  table: PgTable;
  tenantColumn: AnyPgColumn;
  fields: ReportField[];
  relationships: ReportRelationship[];
}

export const REPORT_ENTITIES: Record<string, ReportEntity> = {
  clients: {
    key: "clients",
    label: "Clients",
    table: clients,
    tenantColumn: clients.tenantId,
    fields: [
      { key: "type", label: "Type", type: "text", column: clients.type },
      { key: "firstName", label: "First name", type: "text", column: clients.firstName },
      { key: "lastName", label: "Last name", type: "text", column: clients.lastName },
      { key: "businessName", label: "Business name", type: "text", column: clients.businessName },
      { key: "email", label: "Email", type: "text", column: clients.email },
      { key: "phone", label: "Phone", type: "text", column: clients.phone },
      { key: "city", label: "City", type: "text", column: clients.city },
      { key: "state", label: "State", type: "text", column: clients.state },
      { key: "status", label: "Status", type: "text", column: clients.status },
      { key: "createdAt", label: "Created", type: "date", column: clients.createdAt },
    ],
    relationships: [],
  },
  policies: {
    key: "policies",
    label: "Policies",
    table: policies,
    tenantColumn: policies.tenantId,
    fields: [
      { key: "policyNumber", label: "Policy number", type: "text", column: policies.policyNumber },
      { key: "lineOfBusiness", label: "Line of business", type: "text", column: policies.lineOfBusiness },
      { key: "carrier", label: "Carrier", type: "text", column: policies.carrier },
      { key: "status", label: "Status", type: "text", column: policies.status },
      { key: "effectiveDate", label: "Effective date", type: "date", column: policies.effectiveDate },
      { key: "expirationDate", label: "Expiration date", type: "date", column: policies.expirationDate },
      { key: "premiumCents", label: "Premium", type: "money", column: policies.premiumCents },
      { key: "createdAt", label: "Created", type: "date", column: policies.createdAt },
    ],
    relationships: [
      { key: "client", label: "Client", target: "clients", localColumn: policies.clientId, foreignColumn: clients.id },
    ],
  },
  invoices: {
    key: "invoices",
    label: "Invoices",
    table: invoices,
    tenantColumn: invoices.tenantId,
    fields: [
      { key: "invoiceNumber", label: "Invoice number", type: "text", column: invoices.invoiceNumber },
      { key: "description", label: "Description", type: "text", column: invoices.description },
      { key: "amountCents", label: "Amount", type: "money", column: invoices.amountCents },
      { key: "status", label: "Status", type: "text", column: invoices.status },
      { key: "dueDate", label: "Due date", type: "date", column: invoices.dueDate },
      { key: "createdAt", label: "Created", type: "date", column: invoices.createdAt },
    ],
    relationships: [
      { key: "client", label: "Client", target: "clients", localColumn: invoices.clientId, foreignColumn: clients.id },
    ],
  },
  claims: {
    key: "claims",
    label: "Claims",
    table: claims,
    tenantColumn: claims.tenantId,
    fields: [
      { key: "claimNumber", label: "Claim number", type: "text", column: claims.claimNumber },
      { key: "dateOfLoss", label: "Date of loss", type: "date", column: claims.dateOfLoss },
      { key: "description", label: "Description", type: "text", column: claims.description },
      { key: "status", label: "Status", type: "text", column: claims.status },
      { key: "reserveCents", label: "Reserve", type: "money", column: claims.reserveCents },
      { key: "createdAt", label: "Created", type: "date", column: claims.createdAt },
    ],
    relationships: [
      { key: "policy", label: "Policy", target: "policies", localColumn: claims.policyId, foreignColumn: policies.id },
    ],
  },
  commissions: {
    key: "commissions",
    label: "Commissions",
    table: commissions,
    tenantColumn: commissions.tenantId,
    fields: [
      { key: "amountCents", label: "Amount", type: "money", column: commissions.amountCents },
      { key: "ratePercent", label: "Rate %", type: "text", column: commissions.ratePercent },
      { key: "status", label: "Status", type: "text", column: commissions.status },
      { key: "receivedDate", label: "Received date", type: "date", column: commissions.receivedDate },
      { key: "createdAt", label: "Created", type: "date", column: commissions.createdAt },
    ],
    relationships: [
      { key: "policy", label: "Policy", target: "policies", localColumn: commissions.policyId, foreignColumn: policies.id },
    ],
  },
  renewals: {
    key: "renewals",
    label: "Renewals",
    table: renewals,
    tenantColumn: renewals.tenantId,
    fields: [
      { key: "stage", label: "Stage", type: "text", column: renewals.stage },
      { key: "dueDate", label: "Due date", type: "date", column: renewals.dueDate },
      { key: "notes", label: "Notes", type: "text", column: renewals.notes },
      { key: "createdAt", label: "Created", type: "date", column: renewals.createdAt },
    ],
    relationships: [
      { key: "policy", label: "Policy", target: "policies", localColumn: renewals.policyId, foreignColumn: policies.id },
    ],
  },
  opportunities: {
    key: "opportunities",
    label: "Opportunities",
    table: opportunities,
    tenantColumn: opportunities.tenantId,
    fields: [
      { key: "name", label: "Name", type: "text", column: opportunities.name },
      { key: "stage", label: "Stage", type: "text", column: opportunities.stage },
      { key: "valueCents", label: "Value", type: "money", column: opportunities.valueCents },
      { key: "notes", label: "Notes", type: "text", column: opportunities.notes },
      { key: "expectedCloseDate", label: "Expected close", type: "date", column: opportunities.expectedCloseDate },
      { key: "createdAt", label: "Created", type: "date", column: opportunities.createdAt },
    ],
    relationships: [
      { key: "client", label: "Client", target: "clients", localColumn: opportunities.clientId, foreignColumn: clients.id },
    ],
  },
  tasks: {
    key: "tasks",
    label: "Tasks",
    table: tasks,
    tenantColumn: tasks.tenantId,
    fields: [
      { key: "title", label: "Title", type: "text", column: tasks.title },
      { key: "description", label: "Description", type: "text", column: tasks.description },
      { key: "status", label: "Status", type: "text", column: tasks.status },
      { key: "priority", label: "Priority", type: "text", column: tasks.priority },
      { key: "dueDate", label: "Due date", type: "date", column: tasks.dueDate },
      { key: "assignee", label: "Assignee", type: "text", column: tasks.assignee },
      { key: "createdAt", label: "Created", type: "date", column: tasks.createdAt },
    ],
    relationships: [],
  },
  vendors: {
    key: "vendors",
    label: "Vendors",
    table: vendors,
    tenantColumn: vendors.tenantId,
    fields: [
      { key: "name", label: "Name", type: "text", column: vendors.name },
      { key: "type", label: "Type", type: "text", column: vendors.type },
      { key: "email", label: "Email", type: "text", column: vendors.email },
      { key: "phone", label: "Phone", type: "text", column: vendors.phone },
      { key: "paymentTerms", label: "Payment terms", type: "text", column: vendors.paymentTerms },
      { key: "is1099", label: "1099", type: "boolean", column: vendors.is1099 },
      { key: "createdAt", label: "Created", type: "date", column: vendors.createdAt },
    ],
    relationships: [],
  },
  bills: {
    key: "bills",
    label: "Bills",
    table: bills,
    tenantColumn: bills.tenantId,
    fields: [
      { key: "billNumber", label: "Bill number", type: "text", column: bills.billNumber },
      { key: "billDate", label: "Bill date", type: "date", column: bills.billDate },
      { key: "dueDate", label: "Due date", type: "date", column: bills.dueDate },
      { key: "amountCents", label: "Amount", type: "money", column: bills.amountCents },
      { key: "amountPaidCents", label: "Amount paid", type: "money", column: bills.amountPaidCents },
      { key: "status", label: "Status", type: "text", column: bills.status },
      { key: "memo", label: "Memo", type: "text", column: bills.memo },
      { key: "createdAt", label: "Created", type: "date", column: bills.createdAt },
    ],
    relationships: [
      { key: "vendor", label: "Vendor", target: "vendors", localColumn: bills.vendorId, foreignColumn: vendors.id },
    ],
  },
  calls: {
    key: "calls",
    label: "Calls",
    table: calls,
    tenantColumn: calls.tenantId,
    fields: [
      { key: "direction", label: "Direction", type: "text", column: calls.direction },
      { key: "fromNumber", label: "From number", type: "text", column: calls.fromNumber },
      { key: "contactName", label: "Contact", type: "text", column: calls.contactName },
      { key: "status", label: "Status", type: "text", column: calls.status },
      { key: "durationSeconds", label: "Duration (sec)", type: "number", column: calls.durationSeconds },
      { key: "disposition", label: "Disposition", type: "text", column: calls.disposition },
      { key: "provider", label: "Provider", type: "text", column: calls.provider },
      { key: "occurredAt", label: "Occurred", type: "date", column: calls.occurredAt },
    ],
    relationships: [],
  },
};

/** Get an entity definition, or throw if the key is unknown. */
export function getEntity(key: string): ReportEntity {
  const entity = REPORT_ENTITIES[key];
  if (!entity) throw new Error(`Unknown report entity: ${key}`);
  return entity;
}

/** Get a field on an entity, or throw. */
export function getField(entityKey: string, fieldKey: string): ReportField {
  const field = getEntity(entityKey).fields.find((f) => f.key === fieldKey);
  if (!field) {
    throw new Error(`Unknown field ${entityKey}.${fieldKey}`);
  }
  return field;
}

/**
 * The join path from `base` to `target`, as a list of relationships to
 * follow. Empty when `target === base`. Throws if `target` is not reachable
 * by to-one relationships (the report builder offers only reachable entities).
 */
export function joinPath(
  base: string,
  target: string,
): ReportRelationship[] {
  if (base === target) return [];
  const seen = new Set<string>();
  const walk = (from: string): ReportRelationship[] | null => {
    if (seen.has(from)) return null;
    seen.add(from);
    for (const rel of getEntity(from).relationships) {
      if (rel.target === target) return [rel];
      const rest = walk(rel.target);
      if (rest) return [rel, ...rest];
    }
    return null;
  };
  const path = walk(base);
  if (!path) {
    throw new Error(`No join path from ${base} to ${target}`);
  }
  return path;
}

/** Every entity reachable from `base` (including itself) — what a report on
 *  `base` may pull fields from. */
export function reachableEntities(base: string): ReportEntity[] {
  const out: ReportEntity[] = [getEntity(base)];
  const seen = new Set<string>([base]);
  const queue = [base];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const rel of getEntity(cur).relationships) {
      if (!seen.has(rel.target)) {
        seen.add(rel.target);
        out.push(getEntity(rel.target));
        queue.push(rel.target);
      }
    }
  }
  return out;
}
