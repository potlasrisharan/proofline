import { expect, test } from "@playwright/test";

test.describe("Judge Quick-Demo Scenarios", () => {
  test("Scenario 1: Claim Audit & Visual Diff navigates directly to NovaBook review", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "① Claim Audit & Visual Diff" }).click();

    await expect(page.getByRole("heading", { name: "NovaBook S1 launch email" })).toBeVisible();
    await expect(page.locator(".diff-highlight-box").first()).toBeVisible();
    await expect(page.getByText("up to 20 hours of battery life")).toBeVisible();
  });

  test("Scenario 2: Indic Verification opens Sarvam AI modal with Telugu and Hindi", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "② Indic Verification (Sarvam AI)" }).click();

    await expect(page.getByRole("dialog", { name: "Cross-Lingual Brand Compliance" })).toBeVisible();
    await expect(page.getByText("Powered by Sarvam AI")).toBeVisible();
    await expect(page.getByText("వోల్ట్‌ఎడ్జ్ నోవాబుక్ S1")).toBeVisible();

    await page.getByRole("button", { name: "Hindi (हिन्दी)" }).click();
    await expect(page.getByText("वोल्टएज नोवाबुक S1")).toBeVisible();

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("dialog", { name: "Cross-Lingual Brand Compliance" })).toHaveCount(0);
  });

  test("Scenario 3: 1-Click Gated Dispatch unlocks multi-platform dispatch modal", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "③ 1-Click Gated Dispatch (Zernio)" }).click();

    await expect(page.getByRole("dialog", { name: "Publish approved revision" })).toBeVisible();
    await expect(page.getByText("SIMULATED · Zernio Sandbox Mock")).toBeVisible();
    await expect(page.getByText("LinkedIn Post / Article")).toBeVisible();
    await expect(page.getByText("Instagram (Carousel / Reel)")).toBeVisible();

    await page.getByRole("button", { name: /Simulate Multi-Platform Dispatch/ }).click();
    await expect(page.getByText("Dispatch Successful (Simulated Sandbox)")).toBeVisible();

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("dialog", { name: "Publish approved revision" })).toHaveCount(0);
  });

  test("Scenario 4: Cryptographic Audit Chain navigates to audit log and checks hash chain", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "④ Cryptographic Audit Chain" }).click();

    await expect(page.getByRole("heading", { name: "Every decision has a link." })).toBeVisible();
    await expect(page.getByText("Chain verified", { exact: true })).toBeVisible();
  });
});
