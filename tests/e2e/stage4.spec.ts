import { expect, test, type Page } from "@playwright/test";

function watchRuntimeFailures(page: Page) {
  const consoleErrors: string[] = [];
  const badResponses: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && response.url().startsWith("http://127.0.0.1:3100")) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  return { consoleErrors, badResponses };
}

test("Stage 4 home enters controlled today flow on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const runtime = watchRuntimeFailures(page);
  await page.goto("/");

  await expect(page.getByText("Stage 4 Fixture", { exact: true })).toBeVisible();
  await expect(page.getByText(/不代表现实当天信息|不代表现实中的今天/).first()).toBeVisible();
  await page.getByRole("link", { name: "查看今日更新", exact: true }).click();
  await expect(page).toHaveURL(/\/today$/);

  const summary = page.getByTestId("today-reference-summary");
  await expect(summary).toContainText("北京时间");
  await expect(summary).toContainText("2026年7月27日");
  await expect(page.getByRole("heading", { name: "月灯档案馆" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "星灯备忘录" })).toBeVisible();
  await expect(page.getByTestId("broadcast-time-cross-day")).toContainText("暂定");

  await page
    .locator("main")
    .getByTestId("timezone-control")
    .getByRole("button", { name: "日本" })
    .click();
  await expect(summary).toContainText("2026年7月28日");
  await expect(page.getByRole("heading", { name: "星灯备忘录" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "月灯档案馆" })).toHaveCount(0);

  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.badResponses).toEqual([]);
});

test("weekly schedule preserves cross-day and late-night source expressions", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/schedule");

  const monday = page.getByRole("button", { name: "周一", exact: true });
  const tuesday = page.getByRole("button", { name: "周二", exact: true });
  await expect(monday).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("broadcast-time-cross-day")).toContainText("23:30");

  const lateNight = page.getByTestId("broadcast-time-late-night");
  await expect(lateNight).toContainText("25:15");
  await expect(lateNight).toContainText("深夜表达");
  await expect(lateNight).toContainText("周一");

  await page
    .locator("main")
    .getByTestId("timezone-control")
    .getByRole("button", { name: "日本" })
    .click();
  await tuesday.click();
  await expect(page.getByTestId("broadcast-time-cross-day")).toContainText("00:30");
  await expect(page.getByTestId("broadcast-time-cross-day")).toContainText("7月28日");
});

test("unknown broadcast remains unknown and never becomes midnight", async ({ page }) => {
  await page.goto("/schedule");
  const unknown = page.getByTestId("broadcast-time-unknown");
  await expect(unknown).toContainText("雨幕图书室");
  await expect(unknown).toContainText("时间未知");
  await expect(unknown).toContainText("来源：周五");
  await expect(unknown).not.toContainText("00:00");
});

test("season discovery switches between current, history, and future fixtures", async ({
  page,
}) => {
  await page.goto("/season");
  await expect(page.getByRole("heading", { level: 2, name: /2026年夏季/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "月灯档案馆" })).toBeVisible();

  await page.getByRole("button", { name: "历史季度" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /2026年春季/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "玻璃潮汐" })).toBeVisible();

  await page.getByRole("button", { name: "未来新番" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /2026年秋季/ })).toBeVisible();
  const futureResults = page.getByRole("region", { name: "2026年秋季 · 受控Fixture" });
  await expect(futureResults.getByRole("heading", { name: "静默轨道" })).toBeVisible();
  await expect(futureResults.getByRole("heading", { name: "风写的注脚" })).toBeVisible();
  await expect(page.getByText("时间未知", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("时间暂定", { exact: true }).first()).toBeVisible();
});

test("Stage 4 discovery remains usable at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const runtime = watchRuntimeFailures(page);
  await page.goto("/");
  await page.getByRole("link", { name: "查看今日更新", exact: true }).click();
  await expect(page.getByRole("heading", { name: "今日更新", level: 1 })).toBeVisible();
  await expect(page.getByTestId("today-reference-summary")).toContainText("2026年7月27日");
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.badResponses).toEqual([]);
});

test("critical Stage 4 regression routes and favicon respond successfully", async ({ request }) => {
  const routes = [
    "/",
    "/today",
    "/schedule",
    "/season",
    "/library",
    "/favorites",
    "/anime/cyan-compass",
    "/health",
    "/api/health",
  ];
  for (const route of routes) {
    const response = await request.get(route);
    expect(response.status(), route).toBeLessThan(400);
  }

  const favicon = await request.get("/favicon.ico");
  expect(favicon.status()).toBe(200);
  expect(favicon.headers()["content-type"]).toMatch(/image\/(x-icon|vnd\.microsoft\.icon)/);
  expect((await favicon.body()).byteLength).toBeGreaterThan(0);
});
