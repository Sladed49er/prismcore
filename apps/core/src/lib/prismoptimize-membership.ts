import { currentUser } from "@clerk/nextjs/server";

/**
 * PrismOptimize membership.
 *
 * The audit tool is members-only. Until paid memberships launch, membership
 * is a gift list in the `PRISMOPTIMIZE_MEMBER_EMAILS` env var — comma-
 * separated entries that are either full email addresses
 * ("tony.cheng@netstarinc.com") or whole domains ("@netstarinc.com").
 * Matching is against every verified address on the Clerk user, so it works
 * whether someone signed up with email/password or with Google.
 */

export interface PrismOptimizeMembership {
  signedIn: boolean;
  email: string;
  entitled: boolean;
}

export async function getPrismOptimizeMembership(): Promise<PrismOptimizeMembership> {
  const user = await currentUser().catch(() => null);
  if (!user) return { signedIn: false, email: "", entitled: false };

  const emails = user.emailAddresses.map((e) => e.emailAddress.toLowerCase());
  const allowlist = (process.env.PRISMOPTIMIZE_MEMBER_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  const entitled = emails.some((email) =>
    allowlist.some((entry) =>
      entry.startsWith("@") ? email.endsWith(entry) : email === entry,
    ),
  );

  return {
    signedIn: true,
    email:
      user.primaryEmailAddress?.emailAddress.toLowerCase() ?? emails[0] ?? "",
    entitled,
  };
}
