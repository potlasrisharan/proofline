import { expect, test, type Page } from "@playwright/test";

async function openReviews(page: Page, role: "creator" | "manager" | "legal_reviewer" | "brand_owner" | "agency") {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Role preview" }).selectOption(role);
  await page.getByRole("button", { name: /Review queue/ }).click();
  await expect(page.getByRole("heading", { name: "NovaBook S1 launch email" })).toBeVisible();
}

test.describe("seeded collaboration preview (not authenticated persistence)", () => {
  test("creator fixes the 20-hour claim, manager sees the submission, and reviewer approves the revision", async ({ page }) => {
    await openReviews(page, "creator");

    const factFinding = page.getByRole("article").filter({ hasText: "Fact mismatch" });
    await expect(factFinding).toContainText("up to 20 hours of battery life");
    await expect(factFinding).toContainText("Up to 12 hours");
    await expect(page.getByRole("button", { name: "Run re-scan", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Approve revision", exact: true })).toHaveCount(0);

    await factFinding.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(factFinding).toContainText("Resolved");

    await page.getByRole("tab", { name: "Submitted content", exact: true }).click();
    await expect(page.getByRole("button", { name: "12 hours", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: /Findings/ }).click();

    const remainingFixes = page.getByRole("button", { name: "Apply", exact: true });
    await expect(remainingFixes).toHaveCount(2);
    await remainingFixes.first().click();
    await remainingFixes.first().click();
    await page.getByRole("button", { name: "Run re-scan", exact: true }).click();
    await expect(page.getByRole("button", { name: "Send for approval", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Send for approval", exact: true }).click();

    await page.getByRole("combobox", { name: "Role preview" }).selectOption("manager");
    const launchQueueItem = page.getByRole("button", { name: /NovaBook S1 launch email Email campaign/ });
    await expect(launchQueueItem).toContainText("Pending approval");
    await expect(page.getByRole("button", { name: "Approve revision", exact: true })).toHaveCount(0);

    await page.getByRole("combobox", { name: "Role preview" }).selectOption("legal_reviewer");
    await page.getByRole("textbox", { name: "Decision note" }).fill("VoltEdge fictional evidence reviewed for this revision.");
    await page.getByRole("button", { name: "Approve revision", exact: true }).click();
    await expect(launchQueueItem).toContainText("Approved");

    await page.getByRole("button", { name: "Audit log", exact: true }).click();
    await expect(page.getByText("Chain verified", { exact: true })).toBeVisible();
    await page.getByRole("combobox", { name: "Filter", exact: true }).selectOption("revision_approved");
    const approvalEvent = page.getByRole("article");
    await expect(approvalEvent).toHaveCount(1);
    await expect(approvalEvent).toContainText("Authorised reviewer");
    await expect(approvalEvent).toContainText("VoltEdge fictional evidence reviewed");
  });

  test("creator has read-only Vault controls and no approval controls", async ({ page }) => {
    await openReviews(page, "creator");
    await expect(page.getByRole("button", { name: "Approve revision", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Truth registry", exact: true }).click();
    await expect(page.getByText("Read-only registry view", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add source/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Edit|Approve/ })).toHaveCount(0);
  });

  test("manager sees a High risk review without final-approval controls", async ({ page }) => {
    await openReviews(page, "manager");
    await page.getByRole("combobox", { name: "Risk", exact: true }).selectOption("high");
    await expect(page.getByRole("article").filter({ hasText: "Fact mismatch" })).toContainText("High");
    await expect(page.getByRole("button", { name: "Approve revision", exact: true })).toHaveCount(0);
  });

  test("agency preview does not expose unrelated queue content", async ({ page }) => {
    await openReviews(page, "agency");
    await expect(page.getByRole("button", { name: /Partner launch brief/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Support team release note/ })).toHaveCount(0);
  });

  test("brand owner can approve a draft fact through the real-user registry", async ({ page }) => {
    await openReviews(page, "brand_owner");
    await page.getByRole("button", { name: "Truth registry", exact: true }).click();
    const batteryFact = page.getByRole("article").filter({ hasText: "NovaBook S1 · Battery life" });
    await expect(batteryFact.getByRole("button", { name: /Approve/ })).toBeVisible();
  });

  test("brand owner saves a source draft without activating it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("combobox", { name: "Role preview" }).selectOption("brand_owner");
    await page.getByRole("button", { name: "Truth registry", exact: true }).click();
    await page.getByRole("button", { name: /Add source/ }).click();
    await page.getByLabel("Source name").fill("VoltEdge launch claims policy");
    await page.getByRole("button", { name: "Save source draft", exact: true }).click();
    const draft = page.getByRole("article").filter({ hasText: "VoltEdge launch claims policy" });
    await expect(draft).toContainText("Draft · not active");
    await expect(page.getByRole("status")).toContainText("not active until approved");
  });
});
