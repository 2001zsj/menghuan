import { expect, test } from "@playwright/test";

test("home enters today and desktop navigation works", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /在安静的档案中/ })).toBeVisible();
  await page.getByRole("link", { name: "查看今日更新" }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(
    page.getByRole("navigation", { name: "主要导航" }).getByRole("link", { name: "今日更新" }),
  ).toHaveAttribute("aria-current", "page");
});

test("mobile drawer traps focus, restores focus, and supports navigation", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");

  const menu = page.getByRole("button", { name: "打开导航菜单" });
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");

  const dialog = page.getByRole("dialog", { name: "梦幻导航" });
  const closeButton = dialog.getByRole("button", { name: "关闭菜单" });
  const focusable = dialog.locator(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );

  await expect(dialog).toBeVisible();
  await expect(closeButton).toBeFocused();

  const focusableCount = await focusable.count();
  for (let index = 0; index < focusableCount + 2; index += 1) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const activeDialog = document.querySelector('[role="dialog"]');
          return Boolean(activeDialog?.contains(document.activeElement));
        }),
      )
      .toBe(true);
  }

  await closeButton.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(focusable.last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeFocused();

  await menu.click();
  await page.getByRole("dialog").getByRole("link", { name: "放送表" }).click();
  await expect(page).toHaveURL(/\/schedule$/);
});

test("theme selection persists", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("theme-control").getByRole("button", { name: "浅色" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByTestId("theme-control").getByRole("button", { name: "深色" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const stored = await page.evaluate(() => localStorage.getItem("menghuan:ui-preferences:v1"));
  expect(stored).toContain('"theme":"dark"');
});

test("weekday filter uses pressed buttons and shows expected cross-day change", async ({
  page,
}) => {
  await page.goto("/schedule");

  const monday = page.getByRole("button", { name: "周一", exact: true });
  const tuesday = page.getByRole("button", { name: "周二", exact: true });
  await expect(monday).toHaveAttribute("aria-pressed", "true");
  await expect(tuesday).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("broadcast-time-cross-day")).toContainText("7月27日");

  await page
    .locator("main")
    .getByTestId("timezone-control")
    .getByRole("button", { name: "日本" })
    .click();
  await tuesday.click();

  await expect(monday).toHaveAttribute("aria-pressed", "false");
  await expect(tuesday).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("broadcast-time-cross-day")).toContainText("7月28日");
});

test("result pages keep card headings under named level-two sections", async ({ page }) => {
  await page.goto("/season");
  await expect(page.getByRole("heading", { level: 1, name: "季度新番" })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 2, name: /2026年夏季/ })).toBeVisible();
  await expect(page.locator(".mh-anime-card h3").first()).toBeVisible();

  await page.goto("/library");
  await expect(page.getByRole("heading", { level: 1, name: "番剧资料库" })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 2, name: "资料结果" })).toBeVisible();
  await expect(page.locator(".mh-anime-card h3").first()).toBeVisible();

  await page.goto("/anime/moonlit-archive");
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  await page.goto("/favorites");
  await expect(page.getByRole("heading", { level: 1, name: "我的收藏" })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 2, name: "已收藏作品" })).toBeVisible();
  await expect(page.locator(".mh-anime-card h3").first()).toBeVisible();
});

test("favorite can be added, listed, and removed", async ({ page }) => {
  await page.goto("/anime/moonlit-archive");
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  await page.getByRole("link", { name: "收藏", exact: true }).click();
  await expect(page.getByRole("heading", { name: "月灯档案馆" })).toBeVisible();
  await page.getByRole("button", { name: "取消收藏" }).click();
  await expect(page.getByRole("heading", { name: "还没有收藏" })).toBeVisible();
});
