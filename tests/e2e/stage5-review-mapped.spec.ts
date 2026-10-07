import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  createReviewFixtures,
  createReviewDiscoveryFixture,
} from "../../packages/domain/src/fixtures/review-mapped";
import { createDatabaseClient } from "../../packages/database/src/client";
import { ReviewMappedStore, reviewDigest } from "../../packages/database/src/review-mapped-store";

test.skip(
  process.env.MENGHUAN_REVIEW_MODE !== "synthetic-test",
  "Explicit separate review test mode required",
);
const f = createReviewFixtures();
let client: ReturnType<typeof createDatabaseClient>, store: ReviewMappedStore;
const mappings: string[] = [];
const screenshotRoot = process.env.MENGHUAN_SCREENSHOT_DIR;
test.beforeAll(async () => {
  const url = process.env.MENGHUAN_REVIEW_DATABASE_URL;
  if (
    !url ||
    new URL(url).hostname !== "127.0.0.1" ||
    !/^\/menghuan_stage5_test_(?:mapping|real)_[a-z0-9_]+$/.test(new URL(url).pathname)
  )
    throw new Error("Separate mapping database required");
  client = createDatabaseClient(url);
  store = new ReviewMappedStore(client.sql);
  execFileSync(
    process.execPath,
    [
      resolve("node_modules/tsx/dist/cli.mjs"),
      resolve("packages/database/src/cli/review.ts"),
      "init",
      "--synthetic-test",
    ],
    { env: process.env },
  );
  for (const w of f.works) await store.createTestWork(w);
  for (const o of f.observations) await store.saveObservation(f.sessionId, o);
});
test.afterAll(async () => {
  await client?.close();
});
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue() : r.abort(),
  );
});
async function adopt(observation: (typeof f.observations)[number], workId: string) {
  const mappingId = randomUUID();
  mappings.push(mappingId);
  const w = (await store.listWorks(f.sessionId)).find((w) => w.id === workId)!;
  await store.map({
    decisionId: mappingId,
    sessionId: f.sessionId,
    observationId: observation.observationId,
    expectedCandidateVersion: 1,
    expectedDigest: reviewDigest(observation),
    internalAnimeId: workId,
    expectedEntityVersion: w.version,
    projectMappingKey: randomUUID(),
    reason: "Explicit authored synthetic identity review",
    evidence: "E2E synthetic work worksheet identity",
    supersedes: null,
  });
  await store.adopt({
    adoptionId: randomUUID(),
    mappingId,
    sessionId: f.sessionId,
    expectedCandidateVersion: 1,
    expectedDigest: reviewDigest(observation),
    expectedEntityVersion: w.version,
    fields: ["title", "date", "time", "timezone", "year", "quarter", "status"],
    reason: "Explicit per-field synthetic review",
    resolvesConflicts: true,
  });
}
test("unadopted hidden; explicit adopted library/detail and separate calendar scenario enter existing pages", async ({
  page,
}) => {
  await page.goto("/library");
  await expect(page.getByText(f.observations[0]!.fields.title, { exact: true })).toHaveCount(0);
  await adopt(f.observations[0]!, f.works[0]!.id);
  await adopt(f.observations[1]!, f.works[1]!.id);
  const calendar = createReviewDiscoveryFixture();
  await store.createTestWork(calendar.work);
  await store.saveObservation(f.sessionId, calendar.observation);
  await adopt(calendar.observation, calendar.work.id);
  await page.reload();
  await expect(page.getByText(f.observations[0]!.fields.title, { exact: true })).toBeVisible();
  await page.goto("/today");
  await expect(
    page.getByRole("heading", { name: calendar.observation.fields.title, exact: true }),
  ).toBeVisible();
  await page.goto("/schedule");
  await page.getByRole("button", { name: "周一", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: calendar.observation.fields.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: f.observations[1]!.fields.title, exact: true }),
  ).toHaveCount(0);
});
test("desktop/mobile light/dark, keyboard/touch source disclosure, original time and unknown states", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1366, 390])
    for (const theme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.addInitScript(
        (theme) =>
          localStorage.setItem(
            "menghuan:ui-preferences:v1",
            JSON.stringify({ version: 1, theme, timezone: "Asia/Shanghai" }),
          ),
        theme,
      );
      await page.goto("/anime/review-work-1");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const heading = page.getByRole("heading", {
        level: 1,
        name: f.observations[0]!.fields.title,
      });
      await expect(heading).toBeInViewport();
      const primary = page.locator(".detail-facts dd").filter({ hasText: /北京时间/ });
      await expect(primary).toBeInViewport();
      await expect(page.locator(".detail-facts")).toContainText("25:15");
      await expect(page.getByRole("heading", { name: "STAFF", exact: true })).toHaveCount(0);
      const source = page.getByTestId("review-source-details");
      const summary = source.locator("summary");
      if (width === 1366) {
        await summary.focus();
        await summary.press("Enter");
      } else {
        await summary.click();
      }
      await expect(source).toHaveAttribute("open", "");
      await expect(source).toContainText("合成审核演示，非真实 YUC 资料");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (screenshotRoot) {
        mkdirSync(screenshotRoot, { recursive: true });
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        await page.screenshot({
          path: resolve(screenshotRoot, `review-${width}-${theme}.png`),
          fullPage: true,
        });
      }
    }
  await page.goto("/anime/review-work-2");
  await expect(page.locator(".detail-facts")).toContainText("时间未知");
  await expect(page.locator(".detail-facts")).toContainText("季度待定");
  if (screenshotRoot)
    await page.screenshot({ path: resolve(screenshotRoot, "review-unknown.png"), fullPage: true });
  expect(errors).toEqual([]);
});
test("disabled source preserves pages and database read failure offers recovery, not successful fallback", async ({
  page,
}) => {
  await store.setEnabled(f.sessionId, false);
  await page.goto("/anime/review-work-1");
  const source = page.getByTestId("review-source-details");
  await source.locator("summary").click();
  await expect(source).toContainText("来源已关闭，已采用资料保留");
  await client.sql.unsafe(
    "ALTER TABLE stage5_review_works RENAME TO stage5_review_works_fault_test",
  );
  try {
    await page.goto("/library");
    await expect(page.getByRole("heading", { name: "资料加载失败" })).toBeVisible();
    await expect(page.getByText(f.observations[0]!.fields.title, { exact: true })).toHaveCount(0);
    if (screenshotRoot)
      await page.screenshot({
        path: resolve(screenshotRoot, "review-read-error.png"),
        fullPage: true,
      });
  } finally {
    await client.sql.unsafe(
      "ALTER TABLE stage5_review_works_fault_test RENAME TO stage5_review_works",
    );
  }
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await expect(page.getByText(f.observations[0]!.fields.title, { exact: true })).toBeVisible();
});
test("withdrawal while disabled removes only this decision and pages agree with database", async ({
  page,
}) => {
  await store.withdraw(f.sessionId, mappings[0]!, "Explicit E2E wrong mapping withdrawal");
  await page.goto("/library");
  await expect(page.getByText(f.observations[0]!.fields.title, { exact: true })).toHaveCount(0);
  await expect(page.getByText(f.observations[1]!.fields.title, { exact: true })).toBeVisible();
  expect((await store.adoptedPages()).some((p) => p.anime.id === f.works[0]!.id)).toBe(false);
  if (screenshotRoot)
    await page.screenshot({
      path: resolve(screenshotRoot, "review-withdrawn-library.png"),
      fullPage: true,
    });
});
