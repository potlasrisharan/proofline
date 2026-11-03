import { expect, test } from "@playwright/test";

test.describe("Final Round: Three Core Improvements Suite", () => {
  test("Improvement 1: Multimodal Visual & Video Compliance Engine verifies frame geometry & FTC disclaimer font ratios", async ({ page }) => {
    await page.goto("/multimodal");

    // Verify Heading and Gemini 2.5 Flash Engine Tag
    await expect(page.getByRole("heading", { name: "Visual & Video Frame Compliance Radar" })).toBeVisible();
    await expect(page.getByText(/MULTIMODAL COMPLIANCE ENGINE/)).toBeVisible();
    await expect(page.locator(".multimodal-engine-tag")).toContainText("Gemini 2.5 Flash");

    // Verify Canvas and Frame Scrubber
    await expect(page.locator("canvas.multimodal-canvas")).toBeVisible();
    await expect(page.locator(".canvas-timestamp")).toHaveText("Slide 1 / 3");

    // Inspect FTC § 255 Font Ratio Gauge
    await expect(page.getByText("FTC § 255 DISCLAIMER FONT RATIO")).toBeVisible();
    await expect(page.getByText(/1.33% of frame height/)).toBeVisible();
    await expect(page.getByText(/FTC Min 2.5%/)).toBeVisible();

    // Remediate 1st violation
    const remediateBtn = page.getByRole("button", { name: "⚡ 1-Click: Remediate Frame" }).first();
    await remediateBtn.click();
    await expect(page.getByText("✓ Remediation Applied to Frame").first()).toBeVisible();

    // Switch to Slide 2 (Battery claim contradiction)
    await page.getByRole("button", { name: /Battery Endurance/ }).click();
    await expect(page.getByText("TRUTH REGISTRY SPEC CONTRADICTION")).toBeVisible();
    await expect(page.getByText("Up to 20 Hours Battery (20h)")).toBeVisible();

    // Run Multimodal Vision Audit button
    const auditBtn = page.getByRole("button", { name: /Run Multimodal Vision Audit/ });
    await expect(auditBtn).toBeVisible();
    await auditBtn.click();
    await expect(page.getByText(/MULTIMODAL AUDIT TELEMETRY/)).toBeVisible();
  });

  test("Improvement 2: Live Publishing & Post-Publish Drift Radar detects spec changes and dispatches remediations", async ({ page }) => {
    await page.goto("/drift");

    // Verify Drift Radar header
    await expect(page.getByRole("heading", { name: "Multi-Platform Publishing & Post-Publish Drift Radar" })).toBeVisible();
    await expect(page.getByText("RADAR ACTIVE · 60s HEARTBEAT")).toBeVisible();

    // Verify existing active drift on expired promo code
    await expect(page.getByText("POST-PUBLISH COMPLIANCE DRIFT DETECTED")).toBeVisible();
    await expect(page.getByText("PROMO-DISC-20")).toBeVisible();

    // Click 1-Click Clarification on the drifted tweet
    const clarifyBtn = page.getByRole("button", { name: "💬 1-Click Clarification" }).first();
    await clarifyBtn.click();
    await expect(page.getByText("✓ REMEDIATED")).toBeVisible();

    // Simulate spec update on battery spec
    const simBtn = page.getByRole("button", { name: "⚡ Simulate Spec Update (12h → 14h)" });
    await simBtn.click();

    // Verify new drift alert generated for Instagram post
    await expect(page.getByText("14 hours (IEEE lab benchmark v4)")).toBeVisible();
    await expect(page.getByText("⚠ DRIFT DETECTED")).toBeVisible();

    // Test Emergency Takedown
    const takedownBtn = page.getByRole("button", { name: "🛑 Emergency Takedown" }).first();
    await takedownBtn.click();
    await expect(page.getByText("🛑 TAKEN DOWN")).toBeVisible();
  });

  test("Improvement 3: Dynamic Brand Truth Sync ingests live Notion and Google Docs records", async ({ page }) => {
    await page.goto("/sync");

    // Verify Sync header
    await expect(page.getByRole("heading", { name: "Dynamic Brand Truth Sync & Enterprise Doc Ingestion" })).toBeVisible();
    await expect(page.getByText("NOTION & GOOGLE DOCS CONNECTED")).toBeVisible();

    // Verify Ingested Records
    await expect(page.getByText("NovaBook S1 Battery Endurance")).toBeVisible();
    await expect(page.getByText("Mandatory US Promotional Qualifier")).toBeVisible();
    await expect(page.getByText("Real-Time Inventory & Base Price")).toBeVisible();

    // Test Pull Live Notion Blocks
    const pullNotionBtn = page.getByRole("button", { name: "⚡ Pull Live Notion Blocks" });
    await pullNotionBtn.click();
    await expect(page.locator(".sync-telemetry-box")).toContainText("Notion");

    // Test Pull Google Doc Clauses
    const pullGDocsBtn = page.getByRole("button", { name: "⚡ Pull Google Doc Clauses" });
    await pullGDocsBtn.click();
    await expect(page.locator(".sync-telemetry-box")).toContainText("Google Docs Sync Success");
  });
});
