import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { clients, policies, invoices, claims, calls } from "@prismcore/db";

/**
 * The report model — the semantic layer the report builder queries.
 *
 * Each entity declares the fields that can be reported on and its to-one
 * relationships to other entities. A report picks a BASE entity and may pull
 * fields from any entity reachable from the base by a chain of to-one
 * relationships; the engine resolves the join path. This declared model is
 * the safety boundary: the AI and the builder can only ever reference fields
 * and joins that exist here — never arbitrary SQL.
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
      {
        key: "client",
        label: "Client",
        target: "clients",
        localColumn: policies.clientId,
        foreignColumn: clients.id,
      },
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
      {
        key: "client",
        label: "Client",
        target: "clients",
        localColumn: invoices.clientId,
        foreignColumn: clients.id,
      },
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
      {
        key: "policy",
        label: "Policy",
        target: "policies",
        localColumn: claims.policyId,
        foreignColumn: policies.id,
      },
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
