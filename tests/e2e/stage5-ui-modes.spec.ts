import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

test.skip(
  process.env.MENGHUAN_SYNTHETIC_MODE === "database",
  "Database flows have their own suite",
);

test("off and simulated previews retain one clear label, collapse method details and expose mobile works", async ({
  page,
}) => {
  const mock = process.env.MENGHUAN_SYNTHETIC_MODE === "mock";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/today", "/schedule"]) {
    await page.goto(route);
    const notice = page.getByRole("complementary", { name: "演示资料说明" });
    await expect(notice).toHaveCount(1);
    await expect(notice).toContainText(mock ? "非真实YUC资料" : "完全虚构作品");
    await expect(page.locator("main .mock-banner")).toHaveCount(0);
    await expect(notice.locator("details")).not.toHaveAttribute("open", "");
    const first = page.locator(".mh-broadcast-item").first();
    for (const part of [
      first.getByRole("heading"),
      first.locator(".mh-broadcast-item__times > strong"),
    ]) {
      const box = await part.boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    }
    await notice.locator("summary").click();
    await expect(notice.locator("details")).toHaveAttribute("open", "");
    await expect(notice).toContainText("不代表现实中的今天");
    if (mock) await expect(notice).toContainText("未连接数据库");
    else await expect(page.getByTestId("synthetic-source-details")).toHaveCount(0);
    const shots = process.env.MENGHUAN_SCREENSHOT_DIR;
    if (shots) {
      mkdirSync(shots, { recursive: true });
      await page.screenshot({
        path: resolve(shots, `${mock ? "mock" : "off"}-${route.slice(1)}.png`),
      });
    }
  }
  expect(errors).toEqual([]);
});
