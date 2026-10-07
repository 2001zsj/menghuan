import type { Stage3Sql } from "./client.js";
import type { TransactionSql } from "postgres";
export async function assertLocalDatabase(
  sql: Stage3Sql | TransactionSql,
  mode: "synthetic-test" | "real-local",
  expectedName?: string,
) {
  const [r] =
    await sql`select current_database() as name,current_setting('server_version_num') as version,host(inet_server_addr()) as host`;
  const pattern =
    mode === "real-local"
      ? /^menghuan_stage5_test_real_[a-z0-9_]+$/
      : /^menghuan_stage5_test_(?:mapping|real)_[a-z0-9_]+$/;
  if (
    !r ||
    r.version !== "170010" ||
    !pattern.test(r.name) ||
    !["127.0.0.1", "::1"].includes(r.host) ||
    (expectedName !== undefined && r.name !== expectedName)
  )
    throw new Error(
      "Dedicated loopback PostgreSQL 17.10 database identity mismatch; zero writes permitted",
    );
  return { name: String(r.name), version: String(r.version), host: String(r.host) };
}
