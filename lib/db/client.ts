/**
 * PostgreSQL / Drizzle client (server-only).
 *
 * Lazy singleton: the connection Pool is created on first use, not at import
 * time, so the app still builds and runs (mock mode) when no database is
 * configured. The moment DATABASE_URL is present the auth module talks to a
 * real Postgres.
 *
 * Connection string is read from DATABASE_URL, falling back to the names
 * Vercel Postgres / Neon inject (POSTGRES_URL). Use a POOLED url on
 * serverless (pgBouncer) — every cold start opens a new lambda.
 *
 * Security notes:
 *   • The URL is a secret — only ever from env, never hard-coded.
 *   • SSL is required against managed Postgres (Neon/Vercel/Supabase).
 *   • Drizzle uses parameterized queries throughout — no string-built SQL,
 *     so the auth paths are not exposed to SQL injection.
 */

import "server-only";
import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

let _pool: Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;

/** The configured connection string, or null when the app runs in mock mode. */
export function getDatabaseUrl(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    null
  );
}

/** True when a database is configured (auth module is live vs. mock mode). */
export function isDatabaseConfigured(): boolean {
  return !!getDatabaseUrl();
}

/** Get the Drizzle client. Throws a clear error if no DB is configured. */
export function getDb(): NodePgDatabase<typeof schema> {
  if (_db) return _db;
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — the PostgreSQL auth module needs a connection string.",
    );
  }
  _pool = new Pool({
    connectionString: url,
    // Managed Postgres requires TLS. `rejectUnauthorized:false` accepts the
    // provider's chain (Neon/Vercel terminate TLS at the pooler); the channel
    // is still encrypted in transit.
    ssl: { rejectUnauthorized: false },
    max: 5, // keep small — serverless fan-out multiplies connections
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  _db = drizzle(_pool, { schema });
  return _db;
}

export { schema };
