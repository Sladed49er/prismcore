import { defineModule } from "@prismcore/module-sdk";

/**
 * Call Center — VoIP integration, screen pop, AI call logging. This is CallIntel,
 * folded into Prism as a module. Depends on Clients for screen-pop lookups.
 */
export const telephonyModule = defineModule({
  id: "telephony",
  name: "Call Center",
  description:
    "VoIP integration, screen pop, and AI call logging — CallIntel, inside Prism.",
  version: "0.1.0",
  category: "communications",
  icon: "phone",
  composable: true,
  dependsOn: ["clients"],
  routes: ["/calls"],
  nav: [{ label: "Calls", href: "/calls", icon: "phone", order: 40 }],
  permissions: [
    { key: "calls.read", label: "View call activity" },
    { key: "calls.manage", label: "Manage VoIP connections" },
  ],
  pricing: { unit: "per_user", priceCents: 3500, blurb: "Per seat / month" },
});
