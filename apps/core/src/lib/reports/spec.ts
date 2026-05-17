/**
 * The ReportSpec — the structured, declarative definition of a report.
 *
 * This is what the builder UI and the AI both produce; trusted engine code
 * executes it. Because every reference is a model key (entity + field), not
 * SQL, a spec can never reach a table, column, or tenant outside the model.
 */

/** A field on an entity in the report model. */
export interface FieldRef {
  entity: string;
  field: string;
}

export type FilterOp =
  | "eq"
  | "ne"
  | "contains"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "is_empty"
  | "not_empty";

export interface ReportFilter {
  entity: string;
  field: string;
  op: FilterOp;
  /** Compared value; ignored for is_empty / not_empty. */
  value: string;
}

export type AggFn = "count" | "sum" | "avg" | "min" | "max";

export interface ReportAggregate {
  fn: AggFn;
  /** Field to aggregate; ignored for `count` (counts rows). */
  entity: string;
  field: string;
}

export interface ReportSpec {
  /** Base entity — the grain of the report. */
  base: string;
  /** Columns for a detail (ungrouped) report. */
  columns: FieldRef[];
  filters: ReportFilter[];
  /** When non-empty the report is grouped: output = groupBy + aggregates. */
  groupBy: FieldRef[];
  aggregates: ReportAggregate[];
  /** Output column key to sort by, with direction. */
  sort?: { key: string; dir: "asc" | "desc" };
  limit?: number;
}

/** A blank spec for a base entity. */
export function emptySpec(base: string): ReportSpec {
  return { base, columns: [], filters: [], groupBy: [], aggregates: [] };
}
