import { defineModule } from "@prismcore/module-sdk";

/** Documents — storage, comparison, gap analysis, Acrobat-style processing. */
export const documentsModule = defineModule({
  id: "documents",
  name: "Documents",
  description:
    "Document storage, comparison, gap analysis, and Acrobat-style processing.",
  version: "0.1.0",
  category: "core",
  icon: "file-text",
  composable: true,
  routes: ["/documents"],
  nav: [
    { label: "Documents", href: "/documents", icon: "file-text", order: 30 },
  ],
  permissions: [
    { key: "documents.read", label: "View documents" },
    { key: "documents.write", label: "Upload and edit documents" },
  ],
  customizableEntities: [
    { key: "document", label: "Document", supportsCustomFields: true },
  ],
  pricing: { unit: "per_tenant", priceCents: 9900, blurb: "Per agency / month" },
});
