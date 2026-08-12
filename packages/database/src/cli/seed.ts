import { requireDatabaseUrl } from "@menghuan/config";
import { createDatabaseClient } from "../client.js";
import { seedStage3Fixture } from "../seed.js";

async function main(): Promise<void> {
  const databaseUrl = requireDatabaseUrl();
  const client = createDatabaseClient(databaseUrl, {
    maxConnections: 1,
    applicationName: "menghuan-stage3-seed",
  });
  try {
    await seedStage3Fixture(client.db);
    process.stdout.write(`${JSON.stringify({ status: "ok", action: "seed", stage: "3" })}\n`);
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "未知种子错误";
  process.stderr.write(`${JSON.stringify({ status: "error", action: "seed", message })}\n`);
  process.exitCode = 1;
});
