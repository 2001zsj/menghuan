import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

test.skip(
  process.env.MENGHUAN_PREVIEW_REVIEW_MODE !== "synthetic-readonly",
  "Explicit isolated Preview suite only",
);
for (const width of [1280, 390]) {
  for (const theme of ["light", "dark"]) {
    test(`synthetic read-only Preview ${width} ${theme} preserves time and source explanation`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", (route) =>
        new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort(),
      );
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/schedule");
      await page
        .getByTestId("theme-control")
        .first()
        .getByRole("button", { name: theme === "light" ? "浅色" : "深色", exact: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.getByRole("button", { name: "周一", exact: true }).click();
      const label = page.getByRole("complementary", { name: "演示资料说明" });
      await expect(label).toContainText("非真实YUC资料");
      await expect(label).toContainText("来源已关闭");
      const work = page.getByRole("heading", { name: "合成·夜行电车第零站", exact: true });
      await expect(work).toBeVisible();
      await expect(work.locator("../..")).toContainText("25:15");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      const shots = process.env.MENGHUAN_SCREENSHOT_DIR;
      if (shots) {
        mkdirSync(shots, { recursive: true });
        await page.screenshot({ path: resolve(shots, `preview-${width}-${theme}-schedule.png`) });
      }
      await page.goto("/anime/synthetic-yuc-3");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByRole("heading", { name: /合成·雨幕图书室/ }).first()).toBeVisible();
      const source = page.getByTestId("synthetic-source-details");
      await source.locator(":scope > summary").click();
      await expect(source).toContainText("自行编写的合成资料");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      if (shots)
        await page.screenshot({
          path: resolve(shots, `preview-${width}-${theme}-unknown-detail.png`),
        });
      expect(errors).toEqual([]);
    });
  }
}
test("read-only Preview exposes no source write API", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect((await health.json()).environment).toBe("preview");
  for (const path of ["/api/review/adopt", "/api/review/import", "/api/yuc/sync"]) {
    expect((await request.post(path, { data: { title: "prohibited write probe" } })).status()).toBe(
      404,
    );
  }
});
