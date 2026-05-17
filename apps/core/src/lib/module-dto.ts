import type { ModuleDefinition } from "@prismcore/module-sdk";
import type { ComposableModule } from "@/lib/tenant";

/**
 * Map a `ModuleDefinition` to a serializable summary safe to pass into client
 * components. `ModuleDefinition` carries functions (lifecycle hooks, lazy router)
 * that cannot cross the server/client boundary — this strips them.
 */
export function toComposableModule(def: ModuleDefinition): ComposableModule {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    category: def.category,
    icon: def.icon,
    dependsOn: def.dependsOn ?? [],
    priceCents: def.pricing?.priceCents ?? null,
    priceUnit: def.pricing?.unit ?? null,
  };
}
