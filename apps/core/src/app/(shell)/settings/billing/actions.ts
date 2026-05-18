"use server";

import { headers } from "next/headers";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createCheckoutSession, createPortalSession } from "@/lib/billing";

/** The deployment's base URL, from the request headers. */
async function baseUrl(): Promise<string> {
  const h = await headers();
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? "core.prismams.com";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** Begin a base-plan subscription checkout; returns the Stripe Checkout URL. */
export async function startCheckout(): Promise<string> {
  const tenant = await getCurrentTenant();
  const base = await baseUrl();
  return createCheckoutSession({
    tenantId: tenant.id,
    tenantName: tenant.name,
    successUrl: `${base}/settings/billing?checkout=success`,
    cancelUrl: `${base}/settings/billing?checkout=cancelled`,
  });
}

/** Open the Stripe customer portal; returns the portal URL. */
export async function openPortal(): Promise<string> {
  const tenant = await getCurrentTenant();
  const base = await baseUrl();
  return createPortalSession({
    tenantId: tenant.id,
    returnUrl: `${base}/settings/billing`,
  });
}
