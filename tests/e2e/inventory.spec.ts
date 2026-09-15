import { expect, test } from "@playwright/test";
import { SEED_COMPANY_IDS, SEED_PERSON_IDS } from "@ranger/test-fixtures";

const password = process.env.SEED_STAFF_PASSWORD ?? "ranger-dev-only-password";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Staff email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({ timeout: 15_000 });
}

test("admin sees Harbor people including Alex Rivera", async ({ page }) => {
  await signIn(page, "admin@northstar.example");
  await page.goto(`/companies/${SEED_COMPANY_IDS.harbor}/people`);
  await expect(page.getByRole("heading", { name: "People" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: /Alex Rivera/i })).toBeVisible();
  await page.getByRole("link", { name: /Alex Rivera/i }).click();
  await expect(page.getByRole("heading", { name: /Alex Rivera/i })).toBeVisible();
  await expect(page.getByText(/Scenario date|Manual record|Contractor/i).first()).toBeVisible();
});

test("viewer can open Alex but has no assign control", async ({ page }) => {
  await signIn(page, "viewer@northstar.example");
  await page.goto(
    `/companies/${SEED_COMPANY_IDS.harbor}/people/${SEED_PERSON_IDS.alexRiveraHarbor}`,
  );
  await expect(page.getByRole("heading", { name: /Alex Rivera/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: "Assign resource" })).toHaveCount(0);
  await expect(page.getByText(/Viewers can inspect/i)).toBeVisible();
});
