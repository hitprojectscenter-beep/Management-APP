import "server-only";
import { getCurrentUserId } from "./server-session";
import { getPublicUserById, type PublicUser } from "./auth-service";

/**
 * Server-side guard: resolve the current session to an ACTIVE user (any role).
 * Returns the user, or null (caller responds 401). Use for endpoints that any
 * signed-in user may hit; pair with per-resource checks for authorization.
 * Never trust a client-sent user id — this is the authoritative resolution.
 */
export async function requireUser(): Promise<PublicUser | null> {
  const uid = await getCurrentUserId();
  if (!uid) return null;
  const user = await getPublicUserById(uid);
  if (!user || !user.isActive) return null;
  return user;
}
