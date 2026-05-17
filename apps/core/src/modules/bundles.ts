/**
 * Bundles — curated module sets per business type, ported from PrismAMS's vertical
 * presets. The onboarding questionnaire uses these as starting points so an agency
 * never has to assemble a workspace from 36 modules by hand.
 */

export interface Bundle {
  id: string;
  name: string;
  description: string;
  icon: string;
  moduleIds: string[];
}

/** A cross-cutting, optional module surfaced as a plain-language question. */
export interface AddOn {
  moduleId: string;
  question: string;
  description: string;
  icon: string;
}

export const bundles: Bundle[] = [
  {
    id: "insurance",
    name: "Insurance Agency",
    description:
      "The full agency management system — policies, renewals, carriers, claims, certificates, commissions, and accounting.",
    icon: "shield",
    moduleIds: [
      "clients", "policies", "documents", "tasks", "pipeline", "renewals",
      "carriers", "claims", "certificates", "acord_forms", "intake_forms",
      "commissions", "accounting", "trust_accounting", "esign", "reports",
      "marketing", "client_portal", "cross_sell", "vault", "ai_reports",
      "specialty_markets", "bookscan", "leads",
    ],
  },
  {
    id: "wealth",
    name: "Wealth & Financial Firm",
    description:
      "Households, a planning pipeline, document management, and bookkeeping for advisory firms.",
    icon: "trending-up",
    moduleIds: [
      "clients", "households", "documents", "tasks", "pipeline", "accounting",
      "esign", "reports", "ai_reports", "marketing", "client_portal", "vault",
      "contracts", "leads",
    ],
  },
  {
    id: "association",
    name: "Professional Association",
    description:
      "Member directory, dues, chapters, events, and a self-service member portal.",
    icon: "users",
    moduleIds: [
      "clients", "contracts", "documents", "tasks", "esign", "reports",
      "ai_reports", "marketing", "vault", "memberships", "chapters", "events",
      "communication_lists", "member_portal", "member_benefits",
    ],
  },
  {
    id: "crm",
    name: "General CRM",
    description:
      "A clean contact and pipeline CRM with documents, marketing, and reporting — no industry assumptions.",
    icon: "contact",
    moduleIds: [
      "clients", "documents", "tasks", "pipeline", "marketing", "esign",
      "reports", "ai_reports", "vault", "contracts", "leads", "intake_forms",
      "client_portal",
    ],
  },
];

export const addOns: AddOn[] = [
  {
    moduleId: "telephony",
    question: "Log your phone calls automatically",
    description: "PrismVoice — calls screen-pop, log, and summarize themselves.",
    icon: "phone",
  },
  {
    moduleId: "accounting",
    question: "Full bookkeeping",
    description: "General ledger, invoices, and payments inside Prism.",
    icon: "calculator",
  },
  {
    moduleId: "bookscan",
    question: "Analyze your existing book of business",
    description: "An AI scan of the clients and policies you bring with you.",
    icon: "scan-search",
  },
  {
    moduleId: "api_clearinghouse",
    question: "Connect outside software and carriers",
    description: "Open APIs to anything — no SDK fees, no per-call charges.",
    icon: "plug",
  },
];
