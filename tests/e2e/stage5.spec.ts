import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createSyntheticFlowSamples } from "../../packages/domain/src/sources/synthetic-flow";
import { createDatabaseClient } from "../../packages/database/src/client";
import { SyntheticYucStore } from "../../packages/database/src/synthetic-yuc-store";

test.skip(
  process.env.MENGHUAN_SYNTHETIC_MODE !== "database",
  "Stage5 demo requires explicit separate local database mode",
);
const url = process.env.MENGHUAN_SYNTHETIC_DATABASE_URL;
const samples = createSyntheticFlowSamples();
let client: ReturnType<typeof createDatabaseClient>;
let store: SyntheticYucStore;
const screenshotRoot = process.env.MENGHUAN_SCREENSHOT_DIR;
function prepare() {
  execFileSync(
    process.execPath,
    [
      resolve("node_modules/tsx/dist/cli.mjs"),
      resolve("packages/database/src/cli/synthetic.ts"),
      "prepare",
    ],
    { env: process.env, encoding: "utf8" },
  );
}

test.beforeAll(async () => {
  if (
    !url ||
    !["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname) ||
    !/^\/menghuan_stage5_test_[a-z0-9_]+$/.test(new URL(url).pathname)
  )
    throw new Error("Dedicated local target required");
  client = createDatabaseClient(url);
  store = new SyntheticYucStore(client.sql);
  prepare();
  await store.setEnabled(true);
  await store.importCandidates(
    samples.map(({ kind, fixtureCreatedAt, record }) => ({ kind, fixtureCreatedAt, record })),
  );
});
test.afterAll(async () => {
  await client?.close();
});
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort(),
  );
});

test("only adopted candidates appear; source information and timezone are interactive", async ({
  page,
}) => {
  for (const sample of samples) await store.withdraw(sample.record.sourceRecordId);
  await page.goto("/today");
  await expect(page.getByTestId("synthetic-banner")).toContainText("合成演示数据 · 非真实YUC资料");
  await expect(page.locator("main .mock-banner")).toHaveCount(0);
  await expect(page.getByTestId("synthetic-source-details")).toHaveCount(0);
  for (const sample of samples)
    await store.adopt(
      sample.record.sourceRecordId,
      sample.page,
      sample.page.syntheticSource!.mappingReason,
    );
  await page.reload();
  // Complete a real client interaction before asserting keyboard focus after reload.
  await page
    .locator("main")
    .getByTestId("timezone-control")
    .getByRole("button", { name: "日本", exact: true })
    .click();
  await expect(page.locator('[data-testid="today-reference-summary"]:visible')).toContainText(
    "日本时间",
  );
  await expect(
    page.locator(".desktop-preferences").getByRole("button", { name: "日本", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const first = page.locator('[data-testid="synthetic-source-details"]:visible').first();
  const firstSummary = first.locator(":scope > summary");
  await firstSummary.press("Enter");
  await expect(firstSummary).toBeFocused();
  await expect(first).toHaveAttribute("open", "");
  await expect(first).toContainText("自行编写的合成资料");
  await expect(first.getByRole("link")).toHaveAttribute(
    "href",
    "https://example.org/menghuan/synthetic",
  );
  await page.goto("/schedule");
  await page.getByRole("button", { name: "周一", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "合成·夜行电车第零站", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("heading", { name: "合成·夜行电车第零站", exact: true })
      .locator("..")
      .locator(".."),
  ).toContainText("25:15");
  if (screenshotRoot) {
    mkdirSync(screenshotRoot, { recursive: true });
    await page.screenshot({ path: resolve(screenshotRoot, "weekly-adopted.png"), fullPage: true });
  }
  for (const route of ["/", "/season"]) {
    await page.goto(route);
    await expect(page.locator("[data-testid='synthetic-banner']:visible")).toContainText(
      "非真实YUC资料",
    );
    await expect(
      page.getByRole("heading", { name: "合成·星灯备忘录", exact: true }).first(),
    ).toBeVisible();
  }
});

test("mobile first screen exposes a work and its primary time", async ({ page }) => {
  await store.setEnabled(true);
  for (const sample of samples)
    await store.adopt(
      sample.record.sourceRecordId,
      sample.page,
      sample.page.syntheticSource!.mappingReason,
    );
  await page.setViewportSize({ width: 390, height: 844 });
  const measurements = [];
  for (const route of ["/today", "/schedule"]) {
    await page.goto(route);
    const first = page.locator(".mh-broadcast-item:visible").first();
    for (const part of [
      first.getByRole("heading"),
      first.locator(".mh-broadcast-item__times > strong"),
    ]) {
      const box = await part.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(844);
      measurements.push({ route, text: await part.textContent(), box });
    }
  }
  if (screenshotRoot) {
    mkdirSync(screenshotRoot, { recursive: true });
    writeFileSync(
      resolve(screenshotRoot, "first-screen-layout.json"),
      JSON.stringify({ viewport: { width: 390, height: 844 }, measurements }, null, 2) + "\n",
    );
  }
});

test("desktop/mobile light/dark remain readable without overflow", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const theme of ["light", "dark"] as const) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/today");
    await page
      .getByTestId("theme-control")
      .first()
      .getByRole("button", { name: theme === "light" ? "浅色" : "深色", exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    if (screenshotRoot) {
      mkdirSync(screenshotRoot, { recursive: true });
      await page.screenshot({
        path: resolve(screenshotRoot, `desktop-${theme}.png`),
        fullPage: true,
      });
      await page.screenshot({ path: resolve(screenshotRoot, `desktop-first-screen-${theme}.png`) });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    if (screenshotRoot)
      await page.screenshot({ path: resolve(screenshotRoot, `mobile-first-screen-${theme}.png`) });
    await page
      .locator('[data-testid="synthetic-source-details"]:visible')
      .last()
      .locator(":scope > summary")
      .click();
    await expect(
      page.locator('[data-testid="synthetic-source-details"]:visible').last().locator(".."),
    ).toContainText("时间未知");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (screenshotRoot)
      await page
        .locator('[data-testid="synthetic-source-details"]:visible')
        .last()
        .locator("..")
        .screenshot({ path: resolve(screenshotRoot, `long-title-source-${theme}.png`) });
    if (screenshotRoot)
      await page.screenshot({
        path: resolve(screenshotRoot, `mobile-${theme}.png`),
        fullPage: true,
      });
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.goto("/schedule");
      await expect(
        page.locator(".mh-tabs").getByRole("button", { name: "周一", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      if (screenshotRoot)
        await page.screenshot({ path: resolve(screenshotRoot, `weekly-${width}-${theme}.png`) });
      const source = page.locator('[data-testid="synthetic-source-details"]:visible').first();
      await expect(source).not.toHaveAttribute("open", "");
      const summary = source.locator(":scope > summary");
      await summary.press("Enter");
      await expect(summary).toBeFocused();
      await expect(source).toHaveAttribute("open", "");
      if (screenshotRoot)
        await page.screenshot({
          path: resolve(screenshotRoot, `source-open-${width}-${theme}.png`),
        });
      if (screenshotRoot)
        await source
          .locator("..")
          .screenshot({ path: resolve(screenshotRoot, `source-card-${width}-${theme}.png`) });
      await source.locator("details > summary").click();
      await expect(source).toContainText("local-synthetic-");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test("touch users can switch weekdays and open source details", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    await context.route("**/*", (route) =>
      new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort(),
    );
    const page = await context.newPage();
    await page.goto("/schedule");
    await page.getByRole("button", { name: "周二", exact: true }).tap();
    await expect(page.getByRole("button", { name: "周二", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByRole("button", { name: "周一", exact: true }).tap();
    const source = page.locator('[data-testid="synthetic-source-details"]:visible').first();
    const summary = source.locator(":scope > summary");
    expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await summary.tap();
    await expect(source).toHaveAttribute("open", "");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (screenshotRoot)
      await page.screenshot({ path: resolve(screenshotRoot, "touch-source-open.png") });
  } finally {
    await context.close();
  }
});

test("source disable keeps adopted data; withdrawal is explicit; database failure never falls back to mock", async ({
  page,
}) => {
  await store.setEnabled(false);
  await page.goto("/today");
  await expect(page.getByTestId("synthetic-banner")).toContainText("来源已关闭");
  await expect(page.getByTestId("synthetic-source-details")).not.toHaveCount(0);
  if (screenshotRoot)
    await page.screenshot({ path: resolve(screenshotRoot, "source-disabled.png"), fullPage: true });
  for (const sample of samples) await store.withdraw(sample.record.sourceRecordId);
  await page.reload();
  await expect(page.getByTestId("synthetic-source-details")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "星灯备忘录", exact: true })).toBeVisible();
  await page.goto("/schedule");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "周日", exact: true }).click();
  await expect(page.getByText("这一天暂无演示放送", { exact: true })).toBeVisible();
  if (screenshotRoot) await page.screenshot({ path: resolve(screenshotRoot, "empty-day.png") });
  const empty = page.getByText("这一天暂无演示放送", { exact: true });
  const action = page.getByRole("button", { name: "查看周一放送", exact: true });
  for (const part of [empty, action]) {
    const box = await part.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  }
  await action.click();
  await expect(page.getByRole("heading", { name: "夜行电车第零站", exact: true })).toBeVisible();
  await client.sql.unsafe(
    readFileSync(
      resolve("packages/database/stage5-migrations/0001_yuc_synthetic.down.sql"),
      "utf8",
    ),
  );
  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "资料加载失败" })).toBeVisible();
  await expect(page.locator("section[role='alert']")).toContainText("现有资料未被清空");
  await expect(page.locator("body")).not.toContainText("postgresql://");
  if (screenshotRoot)
    await page.screenshot({ path: resolve(screenshotRoot, "database-error.png") });
  await expect(page.getByTestId("synthetic-source-details")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "月灯档案馆", exact: true })).toHaveCount(0);
  prepare();
  await store.setEnabled(true);
  await store.importCandidates(
    samples.map(({ kind, fixtureCreatedAt, record }) => ({ kind, fixtureCreatedAt, record })),
  );
  for (const sample of samples)
    await store.adopt(
      sample.record.sourceRecordId,
      sample.page,
      sample.page.syntheticSource!.mappingReason,
    );
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "重新加载" }).click(),
  ]);
  await expect(page.locator("[data-testid='synthetic-banner']:visible")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "资料加载失败" })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "合成·星灯备忘录", exact: true })).toBeVisible();
  if (screenshotRoot)
    await page.screenshot({ path: resolve(screenshotRoot, "database-recovered.png") });
});
