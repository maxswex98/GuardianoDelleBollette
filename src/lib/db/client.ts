import postgres from "postgres";
import { env } from "@/lib/config";

declare global {
  // eslint-disable-next-line no-var
  var __billGuardianSql: postgres.Sql | undefined;
}

export const sql =
  globalThis.__billGuardianSql ??
  postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 15
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__billGuardianSql = sql;
}
