import { currentUser } from "@clerk/nextjs/server";

/**
 * A display name for whoever is acting in the current request — used as the
 * actor on customization-log entries so a tenant can see who changed what.
 * Falls back gracefully; the log entry should never fail for want of a name.
 */
export async function currentActorName(): Promise<string> {
  try {
    const u = await currentUser();
    return (
      u?.fullName ||
      u?.primaryEmailAddress?.emailAddress ||
      u?.username ||
      "A teammate"
    );
  } catch {
    return "A teammate";
  }
}
