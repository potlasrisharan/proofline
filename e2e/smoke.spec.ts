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

test("shows the verified local privacy and AI boundary", async ({ page }) => {
  await page.goto("/privacy");

  await expect(page).toHaveTitle(/Privacy and AI transparency/);
  await expect(page.getByRole("heading", { name: "Privacy and AI transparency" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current boundary: local demo state only" })).toBeVisible();
  await expect(page.getByText("No provider or model is configured or verified for the demo UI.", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What can receive data in this build" })).toBeVisible();
  await expect(page.getByText("Confidential-material flag", { exact: true })).toBeVisible();
  await expect(page.getByText("Use synthetic or fictional material only.", { exact: true })).toBeVisible();
  await expect(page.getByText("test wrapper checks the generated section", { exact: false })).toBeVisible();
});

test("lets a creator mark a draft confidential for local handling", async ({ page }) => {
  await page.goto("/submit");

  const marker = page.getByLabel("Mark this draft confidential for local handling");
  await marker.check();

  await expect(marker).toBeChecked();
  await expect(page.getByText("Confidential marker recorded in this browser tab.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Run local evidence check" }).click();
  await expect(page.getByText("Confidential · browser-local", { exact: true })).toBeVisible();
});
