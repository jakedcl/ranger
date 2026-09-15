import { expect, test } from "@playwright/test";

const password = process.env.SEED_STAFF_PASSWORD ?? "ranger-dev-only-password";

test("admin can open all seed companies", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Staff email").fill("admin@northstar.example");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Companies" }).click();
  await expect(page.getByRole("heading", { name: "Companies" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Harbor Architecture" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cedar Studio" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Summit Systems" })).toBeVisible();
  await page.keyboard.press("Tab");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "RANGER" })).toBeVisible();
});

test("viewer cannot open Summit", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Staff email").fill("viewer@northstar.example");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Companies" }).click();
  await expect(page.getByRole("link", { name: "Harbor Architecture" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Summit Systems" })).toHaveCount(0);
  await page.goto(`/companies/22222222-2222-4222-8222-222222222223`);
  await expect(page.getByText(/not in your grant/i)).toBeVisible();
});
