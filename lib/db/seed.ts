/**
 * Auth seed — run ONCE after the database is provisioned:
 *
 *   1. npm run db:push     # create tables from schema.ts
 *   2. npm run db:seed     # this file — seed the 6 users with hashed passwords
 *
 * It upserts the seeded team into the real `users` table, hashing each demo
 * password with bcrypt + PASSWORD_PEPPER (same scheme as lib/auth/password.ts).
 * Idempotent: re-running updates the existing rows (conflict on id).
 *
 * NOTE: bcrypt is inlined here rather than importing lib/auth/password.ts —
 * that module imports `server-only`, which throws under a plain tsx/node run
 * (the react-server export condition isn't set outside Next's server build).
 */

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import bcrypt from "bcryptjs";
import * as schema from "./schema";
import { mockUsers } from "./mock-data";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("✗ DATABASE_URL (or POSTGRES_URL) is not set — provision the DB first.");
  process.exit(1);
}

const pepper = process.env.PASSWORD_PEPPER || "";
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool, { schema });

async function main() {
  let count = 0;
  for (const u of mockUsers) {
    const passwordHash = u.password ? await bcrypt.hash(u.password + pepper, 12) : null;
    await db
      .insert(schema.users)
      .values({
        id: u.id,
        name: u.name,
        email: u.email.toLowerCase(),
        image: u.image,
        locale: u.locale,
        role: u.role,
        phone: u.phone ?? null,
        title: u.title ?? null,
        managerId: u.managerId ?? null,
        passwordHash,
        passwordChangedAt: new Date(),
        isActive: true,
        mustChangePassword: false,
      })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          name: u.name,
          email: u.email.toLowerCase(),
          image: u.image,
          locale: u.locale,
          role: u.role,
          phone: u.phone ?? null,
          title: u.title ?? null,
          managerId: u.managerId ?? null,
          passwordHash,
        },
      });
    count++;
    console.log(`  ✓ ${u.id}  ${u.name}  <${u.email}>`);
  }
  await pool.end();
  console.log(`\n✓ auth seed complete — ${count} users (passwords hashed with bcrypt+pepper).`);
}

main().catch((e) => {
  console.error("✗ seed failed:", e);
  process.exit(1);
});
