import { expect, it } from "vitest";
import type { Stage3Sql } from "./client.js";
import { assertLocalDatabase } from "./local-identity.js";
it("actual database identity, not URL text, must match before any write", async () => {
  let requests = 0;
  const sql = (async () => {
    requests++;
    return [{ name: "neondb", version: "170010", host: "127.0.0.1" }];
  }) as unknown as Stage3Sql;
  await expect(
    assertLocalDatabase(sql, "real-local", "menghuan_stage5_test_real_a"),
  ).rejects.toThrow("identity");
  expect(requests).toBe(1);
});
it("wrong version or non-loopback identity is rejected", async () => {
  for (const identity of [
    { name: "menghuan_stage5_test_mapping_a", version: "170009", host: "127.0.0.1" },
    { name: "menghuan_stage5_test_mapping_a", version: "170010", host: "192.0.2.1" },
  ]) {
    const sql = (async () => [identity]) as unknown as Stage3Sql;
    await expect(assertLocalDatabase(sql, "synthetic-test")).rejects.toThrow("identity");
  }
});
