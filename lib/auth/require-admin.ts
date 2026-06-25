import "server-only";
import { getCurrentUserId } from "./server-session";
import { getPublicUserById, type PublicUser } from "./auth-service";

/**
 * Server-side admin guard: resolve the current session and require an active
 * admin. Returns the admin user, or null (caller responds 403). This is the
 * authoritative check — never trust a client-sent role.
 */
export async function requireAdmin(): Promise<PublicUser | null> {
  const uid = await getCurrentUserId();
  if (!uid) return null;
  const user = await getPublicUserById(uid);
  if (!user || !user.isActive || user.role !== "admin") return null;
  return user;
}
