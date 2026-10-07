import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import {
  createRealReviewClient,
  RealReviewStore,
} from "../../packages/database/src/real-review-store";
import {
  REAL_PATH_TEST_SESSION,
  REAL_PATH_TEST_WORK,
} from "../../packages/domain/src/fixtures/real-path";
test.skip(
  process.env.MENGHUAN_REAL_REVIEW_MODE !== "local-evaluation",
  "Explicit synthetic-content real-path test environment required",
);
let client: ReturnType<typeof createRealReviewClient>, store: RealReviewStore, mappingId: string;
const screenshots = process.env.MENGHUAN_SCREENSHOT_DIR;
const cli = (...args: string[]) =>
  execFileSync(
    process.execPath,
    [
      resolve("node_modules/tsx/dist/cli.mjs"),
      resolve("packages/database/src/cli/real-review.ts"),
      ...args,
      "--local-evaluation",
      "--synthetic-path-test",
    ],
    { env: process.env },
  );
test.beforeAll(async () => {
  const url = process.env.MENGHUAN_REAL_REVIEW_DATABASE_URL!;
  if (process.env.MENGHUAN_REAL_REVIEW_SESSION_ID !== REAL_PATH_TEST_SESSION)
    throw new Error("Only self-authored real-path session in canonical E2E");
  cli("init");
  cli("on");
  cli("fixture-load");
  client = createRealReviewClient(url);
  store = new RealReviewStore(client.sql, new URL(url).pathname.slice(1), REAL_PATH_TEST_SESSION);
});
test.afterAll(async () => {
  await client?.close();
});
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue() : r.abort(),
  );
});
test("saved candidates are not visible; explicit entity, mapping and selected adoption render only approved fields", async ({
  page,
}) => {
  await page.goto("/library");
  await expect(page.getByText("合成作品1", { exact: true })).toHaveCount(0);
  const candidate = (await store.listObservations(REAL_PATH_TEST_SESSION)).find(
    (c) => c.observation.ordinal === 1,
  )!;
  cli(
    "entity",
    candidate.observation.observationId,
    REAL_PATH_TEST_WORK,
    "Codex engineering review: authored complete entry, snapshot-local only",
  );
  mappingId = randomUUID();
  cli(
    "map",
    mappingId,
    candidate.observation.observationId,
    "1",
    candidate.digest,
    REAL_PATH_TEST_WORK,
    "1",
    randomUUID(),
    "Codex authored-content identity review",
    "Complete synthetic entry boundary; not external official identity",
  );
  expect(await store.adoptedPages()).toEqual([]);
  cli(
    "adopt",
    randomUUID(),
    mappingId,
    "1",
    candidate.digest,
    "1",
    "title,date,time,status",
    "Codex explicit raw date/time field review",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "合成作品1", exact: true, level: 3 }),
  ).toBeVisible();
  await page.goto(`/anime/${REAL_PATH_TEST_WORK}`);
  await expect(page.getByRole("heading", { name: "合成作品1", exact: true })).toBeVisible();
  await expect(page.getByText("时间未知", { exact: true })).toBeVisible();
  await expect(page.getByText("类型未核验", { exact: true })).toBeVisible();
});
test("desktop/mobile light/dark equivalent states show clear synthetic nature and preserve original 25:15", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1366, 390])
    for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript(
        (t) =>
          localStorage.setItem(
            "menghuan:ui-preferences:v1",
            JSON.stringify({ theme: t, timezone: "Asia/Shanghai" }),
          ),
        theme,
      );
      await page.goto(`/anime/${REAL_PATH_TEST_WORK}`);
      await expect(page.getByText("合成路径测试", { exact: true })).toBeVisible();
      await expect(
        page.getByText("真实路径合成测试，非真实 YUC 资料", { exact: true }),
      ).toBeVisible();
      const source = page.getByTestId("review-source-details"),
        summary = source.locator("summary");
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(source.getByText(/原始表达：.*25:15/)).toBeVisible();
      await expect(source.getByText(/没有请求 YUC/)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (screenshots) {
        mkdirSync(screenshots, { recursive: true });
        await page.screenshot({
          path: resolve(screenshots, `synthetic-equivalent-${width}-${theme}.png`),
          fullPage: true,
        });
      }
    }
  expect(errors).toEqual([]);
});
test("actual touch context opens disclosure and mobile navigation without external requests", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    const page = await context.newPage();
    await page.route("**/*", (r) =>
      new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue() : r.abort(),
    );
    await page.goto(`http://127.0.0.1:3100/anime/${REAL_PATH_TEST_WORK}`);
    expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0);
    await page.getByTestId("review-source-details").locator("summary").tap();
    await expect(page.getByText(/自行编写内容验证真实候选代码路径/)).toBeVisible();
    await page.getByRole("button", { name: "打开导航菜单" }).tap();
    await expect(page.getByRole("dialog")).toBeVisible();
  } finally {
    await context.close();
  }
});
test("source off preserves locally adopted page; explicit withdrawal removes it and candidate/history purge is separate", async ({
  page,
}) => {
  cli("off");
  await page.goto(`/anime/${REAL_PATH_TEST_WORK}`);
  await expect(page.getByRole("heading", { name: "合成作品1", exact: true })).toBeVisible();
  await page.getByTestId("review-source-details").locator("summary").click();
  await expect(page.getByTestId("review-source-details").getByText(/来源已关闭/)).toBeVisible();
  cli("withdraw", mappingId, "Codex engineering review: end synthetic-path display");
  await page.goto("/library");
  await expect(page.getByText("合成作品1", { exact: true })).toHaveCount(0);
  expect(await store.listObservations(REAL_PATH_TEST_SESSION)).toHaveLength(3);
});
