import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createObservedSyntheticFlowSamples } from "../../packages/domain/src/sources/observed-synthetic-flow";
import { createDatabaseClient } from "../../packages/database/src/client";
import { SyntheticYucStore } from "../../packages/database/src/synthetic-yuc-store";
test.skip(
  process.env.MENGHUAN_SYNTHETIC_MODE !== "database",
  "Dedicated local database mode required",
);
const samples = createObservedSyntheticFlowSamples();
let client: ReturnType<typeof createDatabaseClient>;
let store: SyntheticYucStore;
test.beforeAll(async () => {
  const url = process.env.MENGHUAN_SYNTHETIC_DATABASE_URL;
  if (
    !url ||
    new URL(url).hostname !== "127.0.0.1" ||
    !/^\/menghuan_stage5_test_[a-z0-9_]+$/.test(new URL(url).pathname)
  )
    throw new Error("Dedicated local target required");
  execFileSync(
    process.execPath,
    [
      resolve("node_modules/tsx/dist/cli.mjs"),
      resolve("packages/database/src/cli/synthetic.ts"),
      "prepare",
    ],
    { env: process.env },
  );
  client = createDatabaseClient(url);
  store = new SyntheticYucStore(client.sql);
  await store.setEnabled(true);
  await store.importCandidates(
    samples.map(({ kind, fixtureCreatedAt, record }) => ({ kind, fixtureCreatedAt, record })),
  );
});
test.afterAll(async () => {
  await client?.close();
});
test("anonymous-shape pipeline is hidden until adopted; desktop/mobile show synthetic source and unknown time; withdrawal removes it", async ({
  page,
}) => {
  await page.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue() : r.abort(),
  );
  const pageErrors: string[] = [];
  page.on("pageerror", () => pageErrors.push("page-error"));
  await page.goto("/");
  await expect(page.locator("main")).not.toBeEmpty();
  await expect(page.locator("[data-nextjs-dialog], .vite-error-overlay")).toHaveCount(0);
  const sample = samples[0]!;
  await store.withdraw(sample.record.sourceRecordId);
  await page.goto("/library");
  await expect(page.getByText(sample.page.anime.title, { exact: true })).toHaveCount(0);
  await store.adopt(
    sample.record.sourceRecordId,
    sample.page,
    sample.page.syntheticSource!.mappingReason,
  );
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/library");
    await expect(page.getByText(sample.page.anime.title, { exact: true }).first()).toBeVisible();
    await page.goto("/anime/" + sample.page.anime.slug);
    await expect(
      page.getByRole("heading", { level: 1, name: sample.page.anime.title }),
    ).toBeVisible();
    await expect(page.getByText(/25:15/).first()).toBeVisible();
    const banner = page.locator('[data-testid="synthetic-banner"]:visible');
    await expect(banner).toHaveCount(1);
    await expect(banner).toContainText("非真实YUC资料");
    const source = page.locator('[data-testid="synthetic-source-details"]:visible');
    await source.locator("summary").first().click();
    await expect(source).toContainText("非YUC采集");
    await expect(
      page.locator(".detail-facts dd:visible").filter({ hasText: /^时间未知$/ }),
    ).toBeVisible();
    if (process.env.MENGHUAN_SCREENSHOT_DIR) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await expect(
        page.getByRole("heading", { level: 1, name: sample.page.anime.title }),
      ).toBeInViewport();
      await expect(
        page.locator(".detail-facts dd:visible").filter({ hasText: /^1\/2\(金\) 25:15$/ }),
      ).toBeInViewport();
      mkdirSync(process.env.MENGHUAN_SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({
        path: resolve(process.env.MENGHUAN_SCREENSHOT_DIR, `observed-shape-${viewport.width}.png`),
        fullPage: true,
      });
    }
  }
  await store.setEnabled(false);
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: sample.page.anime.title }),
  ).toBeVisible();
  await store.withdraw(sample.record.sourceRecordId);
  await page.goto("/library");
  await expect(page.getByText(sample.page.anime.title, { exact: true })).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
