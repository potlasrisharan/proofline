import { expect, test } from "@playwright/test";

test.describe("Judge Quick-Demo Scenarios", () => {
  test("Scenario 1: [IMP-1] Fact-Change Impact Radar navigates to impact queue and triggers recheck", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /\[IMP-1\] Impact Radar/ }).click();

    await expect(page).toHaveURL(/\/impact$/);
    await expect(page.getByRole("heading", { name: "Fact-Change Impact Radar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Re-check all affected" })).toBeVisible();

    await page.getByRole("button", { name: "Re-check all affected" }).click();
    await expect(page.getByText(/Re-check completed for 2 affected item\(s\)/)).toBeVisible();
  });

  test("Scenario 2: [IMP-2] Evidence-or-Abstain highlights unverified claim vs hard contradiction", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /\[IMP-2\] Evidence-or-Abstain/ }).click();

    await expect(page.getByRole("heading", { name: "NovaBook S1 launch email" })).toBeVisible();
    await expect(page.getByText("our most reliable laptop yet")).toBeVisible();
    await expect(page.getByText("evidence not found", { exact: true })).toBeVisible();
    await expect(page.getByText("Comparative claims need an approved benchmark")).toBeVisible();
  });

  test("Scenario 3: [IMP-3] Guideline-Gap Detector navigates to insights and approves proposed rule update", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /\[IMP-3\] Guideline-Gap Detector/ }).click();

    await expect(page).toHaveURL(/\/insights$/);
    await expect(page.locator("h1", { hasText: "Find patterns. Clarify the guidance." })).toBeVisible();
    await expect(page.getByText("What keeps surfacing")).toBeVisible();

    const approveBtn = page.getByRole("button", { name: "Approve proposed update" }).first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await expect(page.getByText(/Owner approval recorded/)).toBeVisible();
    }
  });

  test("Scenario 4: Claim Audit & Visual Diff inspects battery claim findings and diffs", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Claim Audit & Visual Diff/ }).click();

    await expect(page.getByRole("heading", { name: "NovaBook S1 launch email" })).toBeVisible();
    await expect(page.locator(".diff-highlight-box").first()).toBeVisible();
    await expect(page.getByText("up to 20 hours of battery life")).toBeVisible();
  });

  test("Scenario 5: Indic Verification opens Sarvam AI modal with Telugu and Hindi", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Indic Verification \(Sarvam AI\)/ }).click();

    await expect(page.getByRole("dialog", { name: "Cross-Lingual Brand Compliance" })).toBeVisible();
    await expect(page.getByText("Powered by Sarvam AI")).toBeVisible();
    await expect(page.getByText("వోల్ట్‌ఎడ్జ్ నోవాబుక్ S1")).toBeVisible();

    await page.getByRole("button", { name: "Hindi (हिन्दी)" }).click();
    await expect(page.getByText("वोल्टएज नोवाबुक S1")).toBeVisible();

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("dialog", { name: "Cross-Lingual Brand Compliance" })).toHaveCount(0);
  });

  test("Scenario 6: 1-Click Gated Dispatch unlocks multi-platform dispatch modal", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /1-Click Gated Dispatch \(Zernio\)/ }).click();

    await expect(page.getByRole("dialog", { name: "Publish approved revision" })).toBeVisible();
    await expect(page.getByText("SIMULATED · Zernio Sandbox Mock")).toBeVisible();
    await expect(page.getByText("LinkedIn Post / Article")).toBeVisible();
    await expect(page.getByText("Instagram (Carousel / Reel)")).toBeVisible();

    await page.getByRole("button", { name: /Simulate Multi-Platform Dispatch/ }).click();
    await expect(page.getByText("Dispatch Successful (Simulated Sandbox)")).toBeVisible();

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("dialog", { name: "Publish approved revision" })).toHaveCount(0);
  });

  test("Scenario 7: Cryptographic Audit Chain navigates to audit log and checks hash chain", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Cryptographic Audit Chain/ }).click();

    await expect(page.getByRole("heading", { name: "Every decision has a link." })).toBeVisible();
    await expect(page.getByText("Chain verified", { exact: true })).toBeVisible();
  });

  test("allows switching execution engine between Cloudflare API and Local Demo", async ({ page }) => {
    await page.goto("/submit");
    const apiBtn = page.getByRole("radio", { name: /⚡ Cloudflare API/ }).first();
    const demoBtn = page.getByRole("radio", { name: /💻 Local Demo/ }).first();

    await expect(apiBtn).toHaveAttribute("aria-checked", "true");
    await expect(demoBtn).toHaveAttribute("aria-checked", "false");

    await demoBtn.click();
    await expect(demoBtn).toHaveAttribute("aria-checked", "true");
    await expect(apiBtn).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText("IMPLEMENTED · local demo")).toBeVisible();

    await apiBtn.click();
    await expect(apiBtn).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("IMPLEMENTED · local API opt-in")).toBeVisible();
  });

  test("allows loading sample review directly on empty findings page", async ({ page }) => {
    await page.goto("/findings");
    const loadBtn = page.getByRole("button", { name: /⚡ Load Sample NovaBook S1 Review/ });
    await expect(loadBtn).toBeVisible();
    await loadBtn.click();
    await expect(page.getByRole("heading", { name: "NovaBook S1 launch email" })).toBeVisible();
    await expect(page.getByText(/Human review required/)).toBeVisible();
  });
});
