import { defineModule } from "@prismcore/module-sdk";

/**
 * Clients & CRM — the client record. In Prism Core this is just one module among
 * many, not the core. The kernel is the core.
 */
export const clientsModule = defineModule({
  id: "clients",
  name: "Clients & CRM",
  description:
    "The client record — contacts, households, the center everything radiates from.",
  version: "0.1.0",
  category: "core",
  icon: "users",
  composable: true,
  routes: ["/clients"],
  nav: [{ label: "Clients", href: "/clients", icon: "users", order: 10 }],
  permissions: [
    { key: "clients.read", label: "View clients" },
    { key: "clients.write", label: "Create and edit clients" },
  ],
  customizableEntities: [
    {
      key: "client",
      label: "Client",
      supportsCustomFields: true,
      supportsCustomForms: true,
      supportsWorkflows: true,
    },
  ],
  pricing: { unit: "per_user", priceCents: 1500, blurb: "Per user / month" },
});
