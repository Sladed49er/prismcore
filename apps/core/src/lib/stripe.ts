import Stripe from "stripe";

/**
 * The Stripe client — created once, lazily, from `STRIPE_SECRET_KEY`.
 *
 * Test-mode and live-mode are just different keys; the same code runs against
 * either. Server-only — the secret key must never reach the client bundle.
 */
let client: Stripe | undefined;

export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key);
  }
  return client;
}
