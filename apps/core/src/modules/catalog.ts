import {
  defineModule,
  type ModuleCategory,
  type ModuleDefinition,
} from "@prismcore/module-sdk";

/**
 * The Prism Core module catalog.
 *
 * Ported from PrismAMS's feature map (`src/lib/features.ts`) onto the module-SDK
 * contract, plus Call Center (CallIntel) and the API Clearinghouse. These are the
 * module *definitions* — id, deps, nav, pricing. Each module's PrismAMS service +
 * schema implementation pours in behind this contract module by module.
 */

interface CatalogRow {
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  /** kebab-case lucide icon name. */
  icon: string;
  dependsOn?: string[];
  /** Price in USD cents. 0 renders as "Included". */
  price: number;
  unit?: "per_user" | "per_tenant" | "usage";
  /** Entity keys exposed to the self-service customization engine. */
  customizable?: string[];
}

const CATALOG: CatalogRow[] = [
  // ── Core (vertical-agnostic) ───────────────────────────────────
  { id: "clients", name: "Clients & CRM", description: "Client and contact records — the center everything radiates from.", category: "core", icon: "users", price: 1500, customizable: ["client"] },
  { id: "documents", name: "Documents", description: "Document storage, comparison, and gap analysis.", category: "core", icon: "folder", price: 900, unit: "per_tenant", customizable: ["document"] },
  { id: "tasks", name: "Tasks", description: "Task management and team assignments.", category: "core", icon: "check-square", price: 500, customizable: ["task"] },
  { id: "esign", name: "eSign & PDF", description: "Electronic signatures and PDF tooling.", category: "core", icon: "pen", price: 800 },
  { id: "reports", name: "Reports", description: "Custom report builder across every module.", category: "core", icon: "bar-chart", price: 700 },
  { id: "ai_reports", name: "AI Reports", description: "Natural-language report builder.", category: "core", icon: "sparkles", dependsOn: ["reports"], price: 2500, unit: "per_tenant" },
  { id: "marketing", name: "Marketing", description: "Campaigns, templates, and nurture workflows.", category: "core", icon: "megaphone", dependsOn: ["clients"], price: 1200 },
  { id: "vault", name: "Password Vault", description: "Zero-knowledge credential management.", category: "core", icon: "lock", price: 400 },
  { id: "contracts", name: "Contracts", description: "Vendor contract tracking and renewals.", category: "core", icon: "file-check", price: 600 },
  { id: "leads", name: "PrismLeads", description: "Lead finder and email verification.", category: "core", icon: "crosshair", price: 1800 },
  { id: "migration", name: "Migration", description: "Data migration tools for moving off legacy systems.", category: "core", icon: "arrow-right-left", price: 0, unit: "per_tenant" },

  // ── Accounting (financial backbone) ────────────────────────────
  { id: "accounting", name: "Accounting", description: "General ledger, invoices, and payments.", category: "accounting", icon: "calculator", price: 14900, unit: "per_tenant" },

  // ── Insurance ──────────────────────────────────────────────────
  { id: "policies", name: "Policies", description: "Policy tracking and full lifecycle management.", category: "insurance", icon: "file-text", dependsOn: ["clients"], price: 2000, customizable: ["policy"] },
  { id: "pipeline", name: "Pipeline", description: "Sales pipeline and opportunity tracking.", category: "insurance", icon: "trending-up", dependsOn: ["clients"], price: 1000 },
  { id: "renewals", name: "Renewals", description: "Renewal tracking and proactive alerts.", category: "insurance", icon: "clock", dependsOn: ["policies"], price: 800 },
  { id: "carriers", name: "Carriers", description: "Carrier management and appetite scorecards.", category: "insurance", icon: "building", price: 700 },
  { id: "claims", name: "Claims", description: "Claims intake and tracking.", category: "insurance", icon: "alert-triangle", dependsOn: ["policies"], price: 900 },
  { id: "certificates", name: "Certificates", description: "Certificate of Insurance generation and tracking.", category: "insurance", icon: "award", dependsOn: ["policies"], price: 700 },
  { id: "acord_forms", name: "ACORD Forms", description: "ACORD form generation and supplemental applications.", category: "insurance", icon: "clipboard-list", dependsOn: ["clients"], price: 900 },
  { id: "intake_forms", name: "Intake Forms", description: "Public intake forms and prospect capture.", category: "insurance", icon: "clipboard-pen", price: 600 },
  { id: "commissions", name: "Commissions", description: "Commission tracking and reconciliation.", category: "insurance", icon: "dollar-sign", dependsOn: ["policies"], price: 1100 },
  { id: "trust_accounting", name: "Trust Accounting", description: "Fiduciary trust ledger for premium funds.", category: "insurance", icon: "landmark", dependsOn: ["accounting"], price: 4900, unit: "per_tenant" },
  { id: "client_portal", name: "Client Portal", description: "Insured-facing self-service portal.", category: "insurance", icon: "globe", dependsOn: ["clients"], price: 3900, unit: "per_tenant" },
  { id: "cross_sell", name: "Cross-Sell", description: "AI cross-sell intelligence by line of business.", category: "insurance", icon: "lightbulb", dependsOn: ["policies"], price: 2900, unit: "per_tenant" },
  { id: "specialty_markets", name: "Specialty Markets", description: "AI-powered niche carrier and MGA repository.", category: "insurance", icon: "compass", price: 1900, unit: "per_tenant" },
  { id: "bookscan", name: "BookScan", description: "AI book-of-business analyzer.", category: "insurance", icon: "scan-search", dependsOn: ["clients"], price: 3900, unit: "per_tenant" },

  // ── Wealth & Financial ─────────────────────────────────────────
  { id: "households", name: "Households", description: "Wealth-management households and members.", category: "wealth", icon: "users-round", dependsOn: ["clients"], price: 1500 },
  { id: "tax_practice", name: "Tax Practice", description: "Tax engagements, organizers, and timesheets.", category: "wealth", icon: "receipt", dependsOn: ["clients"], price: 2200 },

  // ── Association ────────────────────────────────────────────────
  { id: "memberships", name: "Memberships", description: "Member directory, dues, renewals, and tiers.", category: "association", icon: "id-card", dependsOn: ["clients"], price: 1800 },
  { id: "chapters", name: "Chapters", description: "Geographic and functional chapters.", category: "association", icon: "map", dependsOn: ["memberships"], price: 600 },
  { id: "events", name: "Events", description: "Conferences, workshops, registration, and CE tracking.", category: "association", icon: "calendar-days", price: 1400 },
  { id: "communication_lists", name: "Communication Lists", description: "Committees, distribution lists, and member groups.", category: "association", icon: "list-tree", dependsOn: ["clients"], price: 500 },
  { id: "member_portal", name: "Member Portal", description: "Self-service portal for dues, benefits, and events.", category: "association", icon: "globe", dependsOn: ["memberships"], price: 3900, unit: "per_tenant" },
  { id: "member_benefits", name: "Member Benefits", description: "Catalog of partner perks, discounts, and resources.", category: "association", icon: "gift", dependsOn: ["memberships"], price: 700 },

  // ── Communications ─────────────────────────────────────────────
  { id: "telephony", name: "PrismVoice", description: "The call center inside Prism — VoIP screen pop, AI call notes, and one-click provider connections.", category: "communications", icon: "phone", dependsOn: ["clients"], price: 3500 },

  // ── Integrations ───────────────────────────────────────────────
  { id: "api_clearinghouse", name: "API Clearinghouse", description: "Universal carrier and MGA integrations — no SDK fees, no per-call charges.", category: "integration", icon: "plug", price: 0, unit: "per_tenant" },
];

function build(row: CatalogRow, index: number): ModuleDefinition {
  return defineModule({
    id: row.id,
    name: row.name,
    description: row.description,
    version: "0.1.0",
    category: row.category,
    icon: row.icon,
    dependsOn: row.dependsOn,
    composable: true,
    routes: [`/m/${row.id}`],
    nav: [
      {
        label: row.name,
        href: `/m/${row.id}`,
        icon: row.icon,
        order: index,
      },
    ],
    customizableEntities: row.customizable?.map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      supportsCustomFields: true,
      supportsCustomForms: true,
      supportsWorkflows: true,
    })),
    pricing: {
      unit: row.unit ?? "per_user",
      priceCents: row.price,
    },
  });
}

/** Every module Prism Core ships, ready to register with the kernel. */
export const moduleCatalog: ModuleDefinition[] = CATALOG.map(build);
