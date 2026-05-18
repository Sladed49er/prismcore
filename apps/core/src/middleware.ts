import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/** Routes reachable without signing in. Everything else requires authentication. */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // VoIP providers POST call events here — no user session.
  "/api/voip(.*)",
  // Vercel Cron hits this — authenticated by CRON_SECRET, not a user session.
  "/api/cron(.*)",
  // Stripe posts webhook events here — authenticated by the Stripe signature.
  "/api/stripe(.*)",
  // Insured-facing client portal — authenticated by a per-client access token.
  "/portal(.*)",
  // Member-facing association portal — authenticated by a per-member token.
  "/member-portal(.*)",
  // Public intake forms — reached by a per-form token, no user session.
  "/intake(.*)",
  "/api/intake(.*)",
  // Public eSign ceremony — reached by a per-request token, no user session.
  "/sign(.*)",
  "/api/sign(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Run on everything except Next internals and static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes.
    "/(api|trpc)(.*)",
  ],
};
