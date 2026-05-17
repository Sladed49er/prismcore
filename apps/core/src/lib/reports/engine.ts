import {
  type SQL,
  and,
  asc,
  desc,
  eq,
  ne,
  gt,
  lt,
  gte,
  lte,
  ilike,
  isNull,
  isNotNull,
  count,
  sum,
  avg,
  min,
  max,
} from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { withTenantContext } from "@prismcore/db";
import {
  getEntity,
  getField,
  joinPath,
  type FieldType,
  type ReportRelationship,
} from "@/lib/reports/model";
import type {
  ReportSpec,
  ReportFilter,
  ReportAggregate,
  FieldRef,
} from "@/lib/reports/spec";

/**
 * The report query engine.
 *
 * Compiles a ReportSpec into a single tenant-scoped Drizzle query — joins
 * along the model's declared to-one relationships, filters, optional
 * GROUP BY with aggregates, sort, limit — and runs it under
 * `withTenantContext`, so RLS isolates it to the tenant. The engine only
 * ever touches columns named in the model: a spec cannot express anything
 * unsafe, and no SQL is ever taken from the AI or the user.
 */

export interface ReportColumn {
  key: string;
  label: string;
  type: FieldType;
}

export interface ReportResult {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
}

const colKey = (r: FieldRef): string => `c_${r.entity}_${r.field}`;
const grpKey = (r: FieldRef): string => `g_${r.entity}_${r.field}`;
const aggKey = (a: ReportAggregate): string =>
  `a_${a.fn}_${a.entity}_${a.field || "rows"}`;

/** Build the aggregate SQL expression for one aggregate. */
function aggExpr(a: ReportAggregate): SQL {
  if (a.fn === "count") return count();
  const col = getField(a.entity, a.field).column;
  switch (a.fn) {
    case "sum":
      return sum(col);
    case "avg":
      return avg(col);
    case "min":
      return min(col) as SQL;
    case "max":
      return max(col) as SQL;
  }
}

/** Build one filter condition against its column. */
function filterCondition(f: ReportFilter): SQL | undefined {
  const field = getField(f.entity, f.field);
  const col = field.column;
  const numeric = field.type === "number" || field.type === "money";
  const val: string | number = numeric ? Number(f.value) : f.value;
  switch (f.op) {
    case "eq":
      return eq(col, val);
    case "ne":
      return ne(col, val);
    case "contains":
      return ilike(col, `%${f.value}%`);
    case "gt":
      return gt(col, val);
    case "lt":
      return lt(col, val);
    case "gte":
      return gte(col, val);
    case "lte":
      return lte(col, val);
    case "is_empty":
      return isNull(col);
    case "not_empty":
      return isNotNull(col);
  }
}

export async function runReport(
  tenantId: string,
  spec: ReportSpec,
): Promise<ReportResult> {
  const base = getEntity(spec.base);
  // "Aggregated" output whenever there are aggregates — with no groupBy that
  // is a single summary row (a scalar metric); with groupBy, one row per group.
  const grouped = spec.groupBy.length > 0 || spec.aggregates.length > 0;

  // ── Which entities does the report touch? Collect the joins to reach them.
  const refs: FieldRef[] = [
    ...spec.columns,
    ...spec.groupBy,
    ...spec.filters.map((f) => ({ entity: f.entity, field: f.field })),
    ...spec.aggregates
      .filter((a) => a.fn !== "count")
      .map((a) => ({ entity: a.entity, field: a.field })),
  ];
  const joins = new Map<string, ReportRelationship>();
  for (const ref of refs) {
    if (ref.entity === base.key) continue;
    for (const rel of joinPath(base.key, ref.entity)) {
      if (!joins.has(rel.target)) joins.set(rel.target, rel);
    }
  }

  // ── Build the select object + the output column metadata. ───────────────
  const selection: Record<string, AnyPgColumn | SQL> = {};
  const columns: ReportColumn[] = [];
  const sortable = new Map<string, AnyPgColumn | SQL>();

  if (grouped) {
    for (const ref of spec.groupBy) {
      const field = getField(ref.entity, ref.field);
      const key = grpKey(ref);
      selection[key] = field.column;
      sortable.set(key, field.column);
      columns.push({
        key,
        label: `${getEntity(ref.entity).label} · ${field.label}`,
        type: field.type,
      });
    }
    for (const a of spec.aggregates) {
      const key = aggKey(a);
      const expr = aggExpr(a);
      selection[key] = expr;
      sortable.set(key, expr);
      const label =
        a.fn === "count"
          ? "Count"
          : `${a.fn[0]!.toUpperCase()}${a.fn.slice(1)} of ${
              getField(a.entity, a.field).label
            }`;
      const type: FieldType =
        a.fn === "count"
          ? "number"
          : getField(a.entity, a.field).type === "money"
            ? "money"
            : "number";
      columns.push({ key, label, type });
    }
  } else {
    for (const ref of spec.columns) {
      const field = getField(ref.entity, ref.field);
      const key = colKey(ref);
      selection[key] = field.column;
      sortable.set(key, field.column);
      columns.push({
        key,
        label: `${getEntity(ref.entity).label} · ${field.label}`,
        type: field.type,
      });
    }
  }
  if (columns.length === 0) {
    return { columns: [], rows: [] };
  }

  // ── Run the query, tenant-scoped. ───────────────────────────────────────
  const rows = await withTenantContext(tenantId, async (tx) => {
    let q = tx.select(selection).from(base.table).$dynamic();

    for (const rel of joins.values()) {
      q = q.leftJoin(
        getEntity(rel.target).table as PgTable,
        eq(rel.localColumn, rel.foreignColumn),
      );
    }

    const conditions: SQL[] = [eq(base.tenantColumn, tenantId)];
    for (const f of spec.filters) {
      const cond = filterCondition(f);
      if (cond) conditions.push(cond);
    }
    q = q.where(and(...conditions));

    if (spec.groupBy.length > 0) {
      q = q.groupBy(...spec.groupBy.map((r) => getField(r.entity, r.field).column));
    }

    if (spec.sort && sortable.has(spec.sort.key)) {
      const expr = sortable.get(spec.sort.key)!;
      q = q.orderBy(spec.sort.dir === "desc" ? desc(expr) : asc(expr));
    }

    q = q.limit(Math.min(spec.limit ?? 1000, 5000));
    return q;
  });

  return { columns, rows: rows as Record<string, unknown>[] };
}
