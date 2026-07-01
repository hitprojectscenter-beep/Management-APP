import "server-only";
import { eq, asc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { hashPassword, generateTempPassword } from "./password";
import { recordOldPasswordHash } from "./password-history";
import { revokeAllUserSessions } from "./server-session";
import { toPublicUser, type PublicUser } from "./auth-service";
import type { UserRole } from "@/lib/db/types";

/** Admin user-management against the DB. All callers must pass requireAdmin() first. */

export async function listUsers(): Promise<PublicUser[]> {
  const rows = await getDb().select().from(users).orderBy(asc(users.createdAt));
  return rows.map(toPublicUser);
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
  managerId?: string | null;
  title?: string | null;
  phone?: string | null;
}

/** Create a user with a generated temporary password (force-change on first
 *  login). Returns the temp password ONCE so the admin can hand it over. */
export async function createUser(
  input: CreateUserInput,
): Promise<{ user: PublicUser; tempPassword: string } | { error: "email_exists" }> {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  // Case-insensitive uniqueness — never allow two accounts that differ only by case.
  const existing = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  if (existing[0]) return { error: "email_exists" };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const rows = await db
    .insert(users)
    .values({
      name: input.name.trim(),
      email,
      role: input.role,
      managerId: input.managerId || null,
      title: input.title || null,
      phone: input.phone || null,
      image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(input.name.trim())}`,
      passwordHash,
      passwordChangedAt: new Date(),
      mustChangePassword: true,
      isActive: true,
    })
    .returning();
  return { user: toPublicUser(rows[0]), tempPassword };
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  managerId?: string | null;
  title?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<PublicUser | { error: "email_exists" } | null> {
  const db = getDb();
  const set: Partial<typeof users.$inferInsert> = {};
  if (input.name !== undefined) set.name = input.name.trim();
  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    // Email must stay unique (case-insensitive) — reject if another user holds it.
    const clash = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
    if (clash[0] && clash[0].id !== id) return { error: "email_exists" };
    set.email = email;
  }
  if (input.role !== undefined) set.role = input.role;
  if (input.managerId !== undefined) set.managerId = input.managerId || null;
  if (input.title !== undefined) set.title = input.title || null;
  if (input.phone !== undefined) set.phone = input.phone || null;
  if (input.isActive !== undefined) set.isActive = input.isActive;
  if (Object.keys(set).length === 0) return null;

  const rows = await db.update(users).set(set).where(eq(users.id, id)).returning();
  // Disabling an account revokes its live sessions immediately.
  if (input.isActive === false) {
    try { await revokeAllUserSessions(id); } catch { /* best-effort */ }
  }
  return rows[0] ? toPublicUser(rows[0]) : null;
}

/** Reset a user's password to a fresh temp value, force change on next login,
 *  clear any lockout, and revoke their sessions. Returns the temp password. */
export async function resetUserPassword(id: string): Promise<{ tempPassword: string } | null> {
  const db = getDb();
  const before = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, id)).limit(1);
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const rows = await db
    .update(users)
    .set({ passwordHash, passwordChangedAt: new Date(), mustChangePassword: true, failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, id))
    .returning({ id: users.id });
  if (!rows[0]) return null;
  await recordOldPasswordHash(id, before[0]?.hash); // remember the replaced password
  try { await revokeAllUserSessions(id); } catch { /* best-effort */ }
  return { tempPassword };
}

/** Clear a brute-force lockout: reset the failed-attempt counter and unlock now.
 *  Does NOT touch the password. Returns the updated public user (or null). */
export async function unlockUser(id: string): Promise<PublicUser | null> {
  const rows = await getDb()
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, id))
    .returning();
  return rows[0] ? toPublicUser(rows[0]) : null;
}

export async function deleteUser(id: string): Promise<boolean> {
  const rows = await getDb().delete(users).where(eq(users.id, id)).returning({ id: users.id });
  if (rows[0]) { try { await revokeAllUserSessions(id); } catch { /* ignore */ } }
  return !!rows[0];
}
