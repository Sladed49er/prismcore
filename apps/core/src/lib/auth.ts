import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

/**
 * Platform administrators — full access across every tenant, including the
 * cross-tenant /admin area. Identified by email address.
 */
export const PLATFORM_ADMINS = [
  "matt@prismams.com",
  "polina@prismams.com",
  "matt@slade.guru",
  "matt@everysolutionit.com",
  "matt.slade@netstarinc.com",
];

export interface Viewer {
  id: string;
  email: string | null;
  name: string;
  isAdmin: boolean;
}

/** The signed-in user for the current request, or null when signed out. */
export async function getViewer(): Promise<Viewer | null> {
  const user = await currentUser();
  if (!user) return null;

  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null;

  return {
    id: user.id,
    email,
    name: user.fullName ?? user.firstName ?? email ?? "User",
    isAdmin: email
      ? PLATFORM_ADMINS.includes(email.toLowerCase())
      : false,
  };
}

/** Guard a platform-admin-only route — renders 404 for everyone else. */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound();
  return viewer;
}

/** Non-throwing admin check, for softer fallbacks (e.g. demo workspace). */
export async function isPlatformAdmin(): Promise<boolean> {
  return (await getViewer())?.isAdmin ?? false;
}
