import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(neon(url), { schema });
}

export type Db = ReturnType<typeof createDb>;

let db: Db | null = null;

/** Created on first use so `next build` works without database env vars. */
export function getDb(): Db {
  db ??= createDb();
  return db;
}
