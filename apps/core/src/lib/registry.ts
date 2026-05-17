import { registry } from "@prismcore/module-sdk";
import { clientsModule } from "@/modules/clients";
import { documentsModule } from "@/modules/documents";
import { telephonyModule } from "@/modules/telephony";

let booted = false;

/**
 * Register the platform's modules with the process-wide registry, once.
 *
 * As real modules are poured in from PrismAMS (Days 7-10) this list grows — and
 * nothing else in the kernel changes. That is the whole point of the contract.
 */
export function getRegistry() {
  if (!booted) {
    registry.registerAll([clientsModule, documentsModule, telephonyModule]);
    registry.validate();
    booted = true;
  }
  return registry;
}
