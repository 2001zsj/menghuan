import { expect, test } from "@playwright/test";

test("web health page and API are available", async ({ page, request }) => {
  await page.goto("/health");
  await expect(page.getByRole("heading", { name: "梦幻 Web 健康状态" })).toBeVisible();
  await expect(page.getByText("menghuan-web")).toBeVisible();

  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);

  const body = (await response.json()) as Record<string, unknown>;
  expect(body.status).toBe("ok");
  expect(body.service).toBe("menghuan-web");
});
