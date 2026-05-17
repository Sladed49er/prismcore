import type { ModuleDefinition } from "./types";

/**
 * Identity helper for authoring a module. Exists so module files read declaratively
 * and so we get a single place to add validation/normalization later.
 */
export function defineModule(def: ModuleDefinition): ModuleDefinition {
  return def;
}
