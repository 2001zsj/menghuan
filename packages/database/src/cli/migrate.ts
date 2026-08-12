import { requireDatabaseUrl } from "@menghuan/config";
import { createDatabaseClient } from "../client.js";
import { migrateStage3Database } from "../migrations.js";

async function main(): Promise<void> {
  const databaseUrl = requireDatabaseUrl();
  const client = createDatabaseClient(databaseUrl, {
    maxConnections: 1,
    applicationName: "menghuan-stage3-migrate",
  });
  try {
    await migrateStage3Database(client.db);
    process.stdout.write(`${JSON.stringify({ status: "ok", action: "migrate", stage: "3" })}\n`);
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "未知迁移错误";
  process.stderr.write(`${JSON.stringify({ status: "error", action: "migrate", message })}\n`);
  process.exitCode = 1;
});
