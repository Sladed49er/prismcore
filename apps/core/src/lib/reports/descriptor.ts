import {
  REPORT_ENTITIES,
  reachableEntities,
  type FieldType,
} from "@/lib/reports/model";

/**
 * A serializable view of the report model — the builder UI and the AI both
 * need to know the entities, their fields, and which entities are reachable
 * from a given base, but neither can receive the Drizzle columns the model
 * holds. `buildModelDescriptor()` flattens the model to plain data.
 */

export interface FieldDescriptor {
  key: string;
  label: string;
  type: FieldType;
}

export interface EntityDescriptor {
  key: string;
  label: string;
  fields: FieldDescriptor[];
}

export interface ModelDescriptor {
  entities: EntityDescriptor[];
  /** baseEntityKey → entity keys whose fields a report on that base may use. */
  reachable: Record<string, string[]>;
}

export function buildModelDescriptor(): ModelDescriptor {
  const entities: EntityDescriptor[] = Object.values(REPORT_ENTITIES).map(
    (e) => ({
      key: e.key,
      label: e.label,
      fields: e.fields.map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
      })),
    }),
  );

  const reachable: Record<string, string[]> = {};
  for (const key of Object.keys(REPORT_ENTITIES)) {
    reachable[key] = reachableEntities(key).map((e) => e.key);
  }

  return { entities, reachable };
}
