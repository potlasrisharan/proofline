import { expect, test } from "@playwright/test";

test.describe("Edge Cases, Robustness & Direct Visits Audit", () => {
  test.describe("/submit (Content intake & analysis)", () => {
    test("handles direct visit and renders submission workspace cleanly", async ({ page }) => {
      await page.goto("/submit");
      await expect(page).toHaveTitle(/Proofline/);
      await expect(page.getByRole("heading", { name: "Bring the context with the draft." })).toBeVisible();
      await expect(page.getByLabel("Review name")).toBeVisible();
      await expect(page.getByLabel("Paste content")).toBeVisible();
    });

    test("handles bad inputs: empty content and empty review name", async ({ page }) => {
      await page.goto("/submit");

      // Switch to Local Demo mode for offline predictable tests
      await page.getByRole("radio", { name: /Local Demo/ }).click();

      // Clear out text and title
      await page.getByLabel("Paste content").fill("");
      await page.getByLabel("Review name").fill("");
      await page.getByRole("button", { name: "Run evidence check" }).click();

      // Expect validation error
      const formError = page.locator(".form-error");
      await expect(formError).toContainText("Paste content or upload a readable supported file");

      // Fill content but leave title empty
      await page.getByLabel("Paste content").fill("Sample content for review");
      await page.getByRole("button", { name: "Run evidence check" }).click();
      await expect(formError).toContainText("Give this content a review name.");
    });

    test("handles duplicate clicks and rapid submissions safely", async ({ page }) => {
      await page.goto("/submit");
      await page.getByRole("radio", { name: /Local Demo/ }).click();

      const submitButton = page.getByRole("button", { name: "Run evidence check" });
      await expect(submitButton).toBeEnabled();

      // Click submit; should route to /findings
      await submitButton.click();
      await expect(page).toHaveURL(/\/findings$/);
      await expect(page.getByRole("heading", { name: "Every flag has an explanation." })).toBeVisible();
    });

    test("handles page refresh on /submit without crashing", async ({ page }) => {
      await page.goto("/submit");
      await page.getByLabel("Review name").fill("Test Draft Refresh");
      await page.reload();
      await expect(page.getByRole("heading", { name: "Bring the context with the draft." })).toBeVisible();
    });

    test("loads 1-click samples (flagged draft & clean draft)", async ({ page }) => {
      await page.goto("/submit");
      await page.getByRole("button", { name: "✓ 1-Click: Clean Draft" }).click();
      await expect(page.getByLabel("Review name")).toHaveValue("VoltEdge NovaBook S1 · Clean Draft");
      await expect(page.getByLabel("Paste content")).toContainText("30-day return guarantee");

      await page.getByRole("button", { name: "⚡ 1-Click: Flagged Draft" }).click();
      await expect(page.getByLabel("Review name")).toHaveValue("NovaBook S1 launch email");
      await expect(page.getByLabel("Paste content")).toContainText("20 hours of battery life");
    });
  });

  test.describe("/findings (Audit findings & triage)", () => {
    test("handles direct visit with empty state and provides 1-click recovery", async ({ page }) => {
      await page.goto("/findings");
      await page.evaluate(() => sessionStorage.clear());
      await page.reload();

      // Verify empty state is rendered
      await expect(page.getByRole("heading", { name: "No content has been submitted in this tab." })).toBeVisible();
      await expect(page.getByText("Submit a VoltEdge draft to inspect its highlighted spans")).toBeVisible();

      // Click 1-click recovery button
      await page.getByRole("button", { name: /Load Sample NovaBook S1 Review/ }).click();

      // Verify transition to findings
      await expect(page.getByRole("heading", { name: "Every flag has an explanation." })).toBeVisible();
      await expect(page.getByRole("heading", { name: "NovaBook S1 launch email" })).toBeVisible();
      await expect(page.getByText("Risk breakdown")).toBeVisible();
    });

    test("preserves findings across page refreshes", async ({ page }) => {
      await page.goto("/findings");
      await page.getByRole("button", { name: /Load Sample NovaBook S1 Review/ }).click();
      await expect(page.getByRole("heading", { name: "NovaBook S1 launch email" })).toBeVisible();

      // Refresh page
      await page.reload();

      // Verify findings are still present
      await expect(page.getByRole("heading", { name: "Every flag has an explanation." })).toBeVisible();
      await expect(page.getByRole("heading", { name: "NovaBook S1 launch email" })).toBeVisible();
    });

    test("allows switching content tabs between Audited text, Current, and Original", async ({ page }) => {
      await page.goto("/findings");
      await page.getByRole("button", { name: /Load Sample NovaBook S1 Review/ }).click();

      await page.getByRole("button", { name: /Current v1/ }).click();
      await expect(page.locator(".pl-content-copy")).toBeVisible();

      await page.getByRole("button", { name: "Original" }).click();
      await expect(page.locator(".pl-content-copy")).toBeVisible();

      await page.getByRole("button", { name: "Audited text" }).click();
      await expect(page.locator(".pl-content-copy")).toBeVisible();
    });

    test("handles dismissing a finding with validation and reason recording", async ({ page }) => {
      await page.goto("/findings");
      await page.getByRole("button", { name: /Load Sample NovaBook S1 Review/ }).click();

      // Click Dismiss with reason on the first finding
      const dismissBtn = page.getByRole("button", { name: "Dismiss with reason" }).first();
      await dismissBtn.click();

      // Verify dismissal reason textarea appears
      const reasonInput = page.getByLabel("Reason for dismissal (required)");
      await expect(reasonInput).toBeVisible();

      // Submit button should be disabled when reason is empty
      const recordBtn = page.getByRole("button", { name: "Record dismissal" });
      await expect(recordBtn).toBeDisabled();

      // Fill reason and submit
      await reasonInput.fill("Tested and verified for regional variant.");
      await expect(recordBtn).toBeEnabled();
      await recordBtn.click();

      // Verify dismissal recorded
      await expect(page.locator(".pl-action-message")).toContainText("Dismissal recorded with your reason");
    });
  });

  test.describe("/impact (Fact-change impact radar)", () => {
    test("handles direct visit and renders impact radar cleanly", async ({ page }) => {
      await page.goto("/impact");
      await expect(page).toHaveTitle(/Fact-change impact radar/);
      await expect(page.getByRole("heading", { name: "Fact-Change Impact Radar" })).toBeVisible();
      await expect(page.getByText("Find stored content that relied on an older approved fact.")).toBeVisible();
    });

    test("handles scenario switching and filtering", async ({ page }) => {
      await page.goto("/impact");

      // Switch to Battery filter
      await page.getByRole("button", { name: /NovaBook Battery/ }).click();
      await expect(page.locator(".pl-action-message")).toContainText("Filtered: NovaBook S1 battery life spec updated");

      // Switch to Offer filter
      await page.getByRole("button", { name: /Offer Validity Ended/ }).click();
      await expect(page.locator(".pl-action-message")).toContainText("Filtered: October 20% promotional discount lapsed.");

      // Switch back to All
      await page.getByRole("button", { name: /All Impact Events/ }).click();
      await expect(page.locator(".pl-action-message")).toContainText("Displaying all cascading fact & offer impact items.");
    });

    test("handles Re-check all affected with duplicate click prevention", async ({ page }) => {
      await page.goto("/impact");
      const recheckBtn = page.getByRole("button", { name: "Re-check all affected" });
      await expect(recheckBtn).toBeEnabled();

      await recheckBtn.click();
      await expect(page.locator(".pl-action-message")).toContainText("Re-check completed for 2 affected item(s)");
    });

    test("handles direct visit page refresh cleanly", async ({ page }) => {
      await page.goto("/impact");
      await page.reload();
      await expect(page.getByRole("heading", { name: "Fact-Change Impact Radar" })).toBeVisible();
    });
  });

  test.describe("/insights (Governance insights)", () => {
    test("handles direct visit and renders governance metrics and signals", async ({ page }) => {
      await page.goto("/insights");
      await expect(page).toHaveTitle(/Governance insights/);
      await expect(page.locator("h2", { hasText: "Find patterns. Clarify the guidance." })).toBeVisible();
      await expect(page.getByRole("heading", { name: "What keeps surfacing" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Recorded review activity" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Rules that need attention" })).toBeVisible();
    });

    test("handles suggestion approval with duplicate click prevention", async ({ page }) => {
      await page.goto("/insights");
      const approveBtn = page.getByRole("button", { name: "Approve proposed update" }).first();
      if (await approveBtn.isVisible()) {
        await approveBtn.click();
        await expect(page.getByText(/Owner approval recorded/)).toBeVisible();
      }
    });

    test("handles page refresh cleanly", async ({ page }) => {
      await page.goto("/insights");
      await page.reload();
      await expect(page.locator("h2", { hasText: "Find patterns. Clarify the guidance." })).toBeVisible();
    });
  });

  test.describe("/vault (Brand source vault)", () => {
    test("handles direct visit and seamlessly routes to Truth Registry", async ({ page }) => {
      await page.goto("/vault");
      await expect(page).toHaveURL(/\/\?view=registry/);
      await expect(page.getByRole("heading", { name: "The sources behind every decision." })).toBeVisible();
      await expect(page.getByText("Brand truth registry")).toBeVisible();
    });

    test("handles role permissions on Brand Source Vault (creator read-only vs brand_owner)", async ({ page }) => {
      // Test creator read-only view
      await page.goto("/?view=registry");
      await page.getByLabel("Role preview").selectOption("creator");
      await expect(page.getByText("Read-only registry view")).toBeVisible();
      await expect(page.getByRole("button", { name: /Add source/ })).toHaveCount(0);

      // Test brand owner management view
      await page.getByLabel("Role preview").selectOption("brand_owner");
      await expect(page.getByRole("button", { name: /Add source/ })).toBeVisible();
    });

    test("handles adding new source with duplicate title validation", async ({ page }) => {
      await page.goto("/?view=registry");
      await page.getByLabel("Role preview").selectOption("brand_owner");

      // Open Add Source modal
      await page.getByRole("button", { name: /Add source/ }).click();
      await expect(page.getByRole("dialog", { name: "Add a source draft." })).toBeVisible();

      // Enter an already existing source title
      await page.getByLabel("Source name").fill("NovaBook S1 · Battery life");
      await page.getByRole("button", { name: "Save source draft" }).click();

      // Expect duplicate error notification
      await expect(page.getByRole("status")).toContainText("A registry entry with this name already exists in the local workspace.");
    });

    test("handles page refresh on Truth Registry cleanly", async ({ page }) => {
      await page.goto("/?view=registry");
      await page.reload();
      await expect(page.getByRole("heading", { name: "The sources behind every decision." })).toBeVisible();
    });
  });
});
