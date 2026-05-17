import { and, eq, sql } from "drizzle-orm";
import {
  adminDb,
  withTenantContext,
  clearinghouseCarriers,
  tenantCarrierConnections,
  type ClearinghouseCarrier,
} from "@prismcore/db";

interface CarrierSeed {
  slug: string;
  name: string;
  type: "carrier" | "mga";
  description: string;
  lines: string[];
  states: string[];
  appetite: string;
  apiStatus: "live" | "coming_soon";
}

/**
 * The starting carrier/MGA pool. A real spread of standard and specialty markets
 * so the marketplace demos the transcript scenario — "a company that writes
 * cannabis risks in Oregon" — out of the box.
 */
const SEED: CarrierSeed[] = [
  { slug: "cascade-mutual", name: "Cascade Mutual Insurance", type: "carrier", description: "Standard-market property and auto for Main Street businesses and families.", lines: ["property", "commercial auto", "homeowners"], states: ["nationwide"], appetite: "Standard risks with a clean loss history.", apiStatus: "live" },
  { slug: "greenleaf-specialty", name: "Greenleaf Specialty", type: "mga", description: "Cannabis and hemp operations — cultivators, dispensaries, processors, and product liability.", lines: ["cannabis", "product liability", "general liability"], states: ["CA", "CO", "OR", "WA", "MI", "NV"], appetite: "Licensed cannabis businesses in regulated states.", apiStatus: "live" },
  { slug: "haulguard-underwriters", name: "HaulGuard Underwriters", type: "mga", description: "Commercial trucking and motor carrier risks, from owner-operators to fleets.", lines: ["commercial auto", "trucking", "cargo"], states: ["nationwide"], appetite: "Long-haul and regional fleets, 1-100 power units.", apiStatus: "live" },
  { slug: "tidemark-flood", name: "TideMark Flood", type: "mga", description: "Private flood insurance — a faster, broader alternative to the NFIP.", lines: ["flood"], states: ["FL", "TX", "LA", "SC", "NC", "NJ"], appetite: "Coastal and high-hazard flood zones.", apiStatus: "live" },
  { slug: "buildright-contractors", name: "BuildRight Contractors", type: "mga", description: "Artisan and general contractors — liability and builders risk.", lines: ["general liability", "builders risk", "workers comp"], states: ["nationwide"], appetite: "Trade and general contractors under $5M revenue.", apiStatus: "live" },
  { slug: "cybershield-group", name: "CyberShield Group", type: "carrier", description: "Cyber liability and technology E&O for small and mid-size firms.", lines: ["cyber", "tech e&o", "data breach"], states: ["nationwide"], appetite: "Firms with basic security controls in place.", apiStatus: "live" },
  { slug: "summit-workers-comp", name: "Summit Workers Comp", type: "carrier", description: "Monoline workers compensation across most class codes.", lines: ["workers comp"], states: ["nationwide"], appetite: "Low-to-moderate hazard class codes.", apiStatus: "live" },
  { slug: "harbor-marine", name: "Harbor Marine Underwriters", type: "mga", description: "Recreational and commercial marine — hull, liability, and cargo.", lines: ["marine", "boat", "cargo"], states: ["nationwide"], appetite: "Pleasure craft and small commercial vessels.", apiStatus: "live" },
  { slug: "vineyard-estate", name: "Vineyard & Estate", type: "mga", description: "High-value homeowners, wineries, vineyards, and estate properties.", lines: ["homeowners", "property", "wineries"], states: ["CA", "OR", "WA", "NY"], appetite: "Homes $1M+ and agritourism operations.", apiStatus: "coming_soon" },
  { slug: "liberty-plains-crop", name: "Liberty Plains Crop", type: "mga", description: "Crop, livestock, and farm operations.", lines: ["crop", "agriculture", "farm"], states: ["IA", "NE", "KS", "IL", "MN", "ND"], appetite: "Row-crop and mixed farm operations.", apiStatus: "live" },
  { slug: "apex-es", name: "Apex Excess & Surplus", type: "mga", description: "Hard-to-place excess and surplus lines across nearly every class.", lines: ["excess & surplus", "general liability", "property"], states: ["nationwide"], appetite: "Declined, distressed, and unusual risks.", apiStatus: "live" },
  { slug: "mainstreet-bop", name: "MainStreet BOP", type: "carrier", description: "Business owners policies for retail, office, and small service firms.", lines: ["business owners policy", "general liability", "commercial property"], states: ["nationwide"], appetite: "Small commercial accounts under 25 employees.", apiStatus: "coming_soon" },
];

/**
 * Seed the carrier pool once. `clearinghouse_carriers` is a deliberately GLOBAL
 * table (shared across tenants), so it is not RLS-scoped and runs as the owner.
 */
export async function seedCarriers(): Promise<void> {
  const db = adminDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clearinghouseCarriers);
  if ((rows[0]?.count ?? 0) > 0) return;
  await db.insert(clearinghouseCarriers).values(SEED).onConflictDoNothing();
}

/** The global carrier pool — shared, not tenant-scoped. */
export async function listCarriers(): Promise<ClearinghouseCarrier[]> {
  return adminDb().select().from(clearinghouseCarriers);
}

/** Carrier ids the tenant has connected — RLS-scoped to that tenant. */
export async function listConnections(tenantId: string): Promise<string[]> {
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select({ carrierId: tenantCarrierConnections.carrierId })
      .from(tenantCarrierConnections)
      .where(eq(tenantCarrierConnections.tenantId, tenantId)),
  );
  return rows.map((r) => r.carrierId);
}

export async function connectCarrier(
  tenantId: string,
  carrierId: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .insert(tenantCarrierConnections)
      .values({ tenantId, carrierId })
      .onConflictDoNothing();
  });
}

export async function disconnectCarrier(
  tenantId: string,
  carrierId: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(tenantCarrierConnections)
      .where(
        and(
          eq(tenantCarrierConnections.tenantId, tenantId),
          eq(tenantCarrierConnections.carrierId, carrierId),
        ),
      );
  });
}
