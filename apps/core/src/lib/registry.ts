import { registry } from "@prismcore/module-sdk";
import { moduleCatalog } from "@/modules/catalog";

let booted = false;

/**
 * Register the module catalog with the process-wide registry, once, and validate
 * it (no missing dependencies, no cycles). Every module the platform ships flows
 * through here — the kernel never references a module directly.
 */
export function getRegistry() {
  if (!booted) {
    registry.registerAll(moduleCatalog);
    registry.validate();
    booted = true;
  }
  return registry;
}
