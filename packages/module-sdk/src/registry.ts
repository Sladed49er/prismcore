import type { ModuleDefinition, NavEntry } from "./types";

/**
 * The module registry. Modules self-register here; the kernel queries it to build
 * navigation, gate routes, drive the composer, and resolve load order.
 *
 * Nothing here is tenant-aware — the registry is the *catalog* of every module the
 * platform ships. Which modules a given tenant has enabled lives in `tenant_modules`;
 * pass that set of ids to `resolveForTenant` / `navFor`.
 */
export class ModuleRegistry {
  private readonly modules = new Map<string, ModuleDefinition>();

  /** Register one module. Throws on a duplicate id. */
  register(module: ModuleDefinition): void {
    if (this.modules.has(module.id)) {
      throw new Error(`Module "${module.id}" is already registered.`);
    }
    this.modules.set(module.id, module);
  }

  /** Register many modules in order. */
  registerAll(modules: readonly ModuleDefinition[]): void {
    for (const m of modules) this.register(m);
  }

  get(id: string): ModuleDefinition | undefined {
    return this.modules.get(id);
  }

  has(id: string): boolean {
    return this.modules.has(id);
  }

  /** Every registered module. */
  all(): ModuleDefinition[] {
    return [...this.modules.values()];
  }

  /** Modules the composer onboarding may offer. */
  composable(): ModuleDefinition[] {
    return this.all().filter((m) => m.composable === true);
  }

  /**
   * Assert the registry is internally consistent: every `dependsOn` target exists
   * and there are no dependency cycles. Call once at boot.
   */
  validate(): void {
    for (const m of this.all()) {
      for (const dep of m.dependsOn ?? []) {
        if (!this.modules.has(dep)) {
          throw new Error(
            `Module "${m.id}" depends on unknown module "${dep}".`,
          );
        }
      }
    }
    this.resolveOrder(); // throws on cycles
  }

  /**
   * Topologically sort modules so each module's dependencies come before it.
   * Pass `ids` to order a subset (e.g. a tenant's enabled modules); dependencies
   * are pulled in automatically. Throws on unknown ids or cycles.
   */
  resolveOrder(ids?: readonly string[]): ModuleDefinition[] {
    const targets = ids ?? this.all().map((m) => m.id);
    const ordered: ModuleDefinition[] = [];
    const done = new Set<string>();
    const onStack = new Set<string>();

    const visit = (id: string): void => {
      if (done.has(id)) return;
      if (onStack.has(id)) {
        throw new Error(`Circular module dependency detected at "${id}".`);
      }
      const mod = this.modules.get(id);
      if (!mod) throw new Error(`Unknown module "${id}".`);
      onStack.add(id);
      for (const dep of mod.dependsOn ?? []) visit(dep);
      onStack.delete(id);
      done.add(id);
      ordered.push(mod);
    };

    for (const id of targets) visit(id);
    return ordered;
  }

  /**
   * Expand a tenant's enabled module ids to include dependencies, in load order.
   */
  resolveForTenant(enabledIds: readonly string[]): ModuleDefinition[] {
    return this.resolveOrder(enabledIds);
  }

  /** Build the shell navigation tree for a tenant's enabled modules. */
  navFor(enabledIds: readonly string[]): NavEntry[] {
    const entries: NavEntry[] = [];
    for (const m of this.resolveForTenant(enabledIds)) {
      for (const n of m.nav ?? []) entries.push(n);
    }
    return entries.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /** Find the module that owns a given pathname, if any. */
  moduleForRoute(pathname: string): ModuleDefinition | undefined {
    return this.all().find((m) =>
      (m.routes ?? []).some(
        (r) => pathname === r || pathname.startsWith(`${r}/`),
      ),
    );
  }
}

/** The process-wide module registry. */
export const registry = new ModuleRegistry();
