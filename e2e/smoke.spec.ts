import { expect, test } from "@playwright/test";

test("loads the seeded workspace and navigates to the review queue", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Proofline/);
  await expect(page.getByRole("heading", { name: "Good morning, Maya." })).toBeVisible();
  await expect(page.getByText("Demo state only")).toBeVisible();

  await page.getByRole("button", { name: /Review queue/ }).click();

  await expect(page.getByRole("heading", { name: "Make the decision easy to defend." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "NovaBook S1 launch email" })).toBeVisible();
});

test("opens the review intake dialog", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Role preview").selectOption("creator");
  await page.getByRole("button", { name: /Start a review/ }).click();

  await expect(
    page.getByRole("dialog", { name: "Bring a draft into Proofline." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Paste text/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Upload a document/ })).toBeVisible();
});
