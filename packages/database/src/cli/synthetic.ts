import { getServerEnvironment } from "@menghuan/config";
import { createSyntheticFlowSamples } from "@menghuan/domain";
import { createDatabaseClient } from "../client.js";
import { migrateStage3Database, migrateSyntheticYucDatabase } from "../migrations.js";
import { seedStage3Fixture } from "../seed.js";
import { SyntheticYucStore } from "../synthetic-yuc-store.js";

const env = getServerEnvironment();
if (env.MENGHUAN_SYNTHETIC_MODE !== "database" || !env.MENGHUAN_SYNTHETIC_DATABASE_URL)
  throw new Error("Explicit local synthetic database mode required");
const client = createDatabaseClient(env.MENGHUAN_SYNTHETIC_DATABASE_URL, {
  applicationName: "menghuan-stage5-synthetic-cli",
});
try {
  const [identity] =
    await client.sql`select current_database() as name, current_setting('server_version_num') as version`;
  if (
    !/^menghuan_stage5_test_[a-z0-9_]+$/.test(String(identity?.name)) ||
    identity?.version !== "170010"
  )
    throw new Error("Dedicated PostgreSQL 17.10 target required");
  const store = new SyntheticYucStore(client.sql);
  const samples = createSyntheticFlowSamples();
  const command = process.argv[2];
  if (command === "prepare") {
    await migrateStage3Database(client.db);
    await migrateSyntheticYucDatabase(client.sql);
    await seedStage3Fixture(client.db);
  } else if (command === "enable" || command === "disable") {
    await store.setEnabled(command === "enable");
  } else if (command === "import") {
    console.log(
      JSON.stringify({
        imported: await store.importCandidates(
          samples.map(({ kind, fixtureCreatedAt, record }) => ({ kind, fixtureCreatedAt, record })),
        ),
      }),
    );
  } else if (command === "adopt" || command === "restore") {
    for (const sample of samples) {
      const result = await store.adopt(
        sample.record.sourceRecordId,
        sample.page,
        sample.page.syntheticSource!.mappingReason,
      );
      if (result === "conflict")
        throw new Error("Manual revision conflict requires explicit review");
    }
  } else if (command === "withdraw") {
    for (const sample of samples) await store.withdraw(sample.record.sourceRecordId);
  } else if (command !== "status") {
    throw new Error("Use prepare, enable, disable, import, adopt, withdraw, restore or status");
  }
  console.log(
    JSON.stringify({
      sourceEnabled: await store.isEnabled(),
      candidates: (await store.listCandidates()).length,
      adopted: (await store.adoptedPages()).length,
    }),
  );
} catch {
  console.error(
    "Local synthetic operation failed; no credentials or raw database errors published.",
  );
  process.exitCode = 1;
} finally {
  await client.close();
}
