import { expect, test } from "@playwright/test";
import { SEED_COMPANY_IDS } from "@ranger/test-fixtures";

const password = process.env.SEED_STAFF_PASSWORD ?? "ranger-dev-only-password";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Staff email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({ timeout: 15_000 });
}

test("admin opens Harbor incidents and a seeded investigation", async ({ page }) => {
  await signIn(page, "admin@northstar.example");
  await page.goto(`/companies/${SEED_COMPANY_IDS.harbor}/incidents`);
  await expect(page.getByRole("heading", { name: "Incidents" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/SketchUp license|auth error|Demo auth/i).first()).toBeVisible();
  await page.getByRole("link", { name: /SketchUp license|Earlier SketchUp/i }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/Related|Evidence|Investigation|timeline|hypothesis|result/i).first()).toBeVisible();
});

test("viewer cannot use export controls on an incident", async ({ page }) => {
  await signIn(page, "viewer@northstar.example");
  await page.goto(`/companies/${SEED_COMPANY_IDS.harbor}/incidents`);
  await expect(page.getByRole("heading", { name: "Incidents" })).toBeVisible({ timeout: 15_000 });
  const link = page.getByRole("link", { name: /SketchUp|auth|Demo/i }).first();
  await link.click();
  await expect(page.getByRole("button", { name: /Generate ZIP/i })).toHaveCount(0);
});
