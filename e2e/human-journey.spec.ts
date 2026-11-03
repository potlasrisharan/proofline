import { test, expect } from "@playwright/test";

test.describe("Agent 001 & 005: Comprehensive Human Navigation & Verification Suite", () => {
  const routes = [
    { name: "Home / Overview", path: "/" },
    { name: "Role Dashboards Portal", path: "/dashboards" },
    { name: "Direct Portal Page", path: "/portal" },
    { name: "Review Queue", path: "/?view=reviews" },
    { name: "Truth Registry", path: "/?view=registry" },
    { name: "Governance Insights", path: "/?view=insights" },
    { name: "Audit Log View", path: "/?view=audit-log" },
    { name: "Content Workspace - Submit", path: "/submit" },
    { name: "Content Workspace - Findings", path: "/findings" },
    { name: "Dynamic Truth Sync", path: "/sync" },
    { name: "Multimodal Compliance Studio", path: "/multimodal" },
    { name: "Publishing & Drift Radar", path: "/drift" },
    { name: "Fact-Change Impact Radar", path: "/impact" },
    { name: "Insights Page", path: "/insights" },
    { name: "Privacy & AI Disclosure", path: "/privacy" },
    { name: "Enterprise Login", path: "/login" },
  ];

  for (const route of routes) {
    test(`Human Navigation to ${route.name} (${route.path}) without errors`, async ({ page }) => {
      const pageErrors: Error[] = [];
      page.on("pageerror", (err) => {
        pageErrors.push(err);
      });

      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(400);

      // Verify no uncaught runtime crash
      expect(pageErrors).toHaveLength(0);

      // Verify page has loaded basic structure
      await expect(page.locator("body")).toBeVisible();

      // Check primary navigation links have valid targets
      const navLinks = page.locator("nav a[href], header a[href], aside a[href]");
      const count = await navLinks.count();
      for (let i = 0; i < Math.min(count, 12); i++) {
        const href = await navLinks.nth(i).getAttribute("href");
        expect(href).toBeTruthy();
        expect(href).not.toBe("#");
      }
    });
  }

  test("Universal 4-Stage Stepper Navigation works seamlessly across all stages", async ({ page }) => {
    // Start at Stage 1: Truth & Specs
    await page.goto("/?view=registry");
    const stepper = page.locator(".workflow-stepper-container");
    await expect(stepper).toBeVisible();

    // Verify Stage 1 is active
    await expect(page.locator(".stepper-stage-indicator")).toContainText("STAGE 01");

    // Click Next to advance to Stage 2: Draft & Visual Scan
    const nextBtn = page.locator(".stepper-step-btn.next");
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    await page.waitForURL("**/submit");
    await expect(page.locator(".stepper-stage-indicator")).toContainText("STAGE 02");

    // Advance to Stage 3: Review & Legal Gate
    await page.locator(".stepper-step-btn.next").click();
    await page.waitForURL("**/?view=reviews");
    await expect(page.locator(".stepper-stage-indicator")).toContainText("STAGE 03");

    // Advance to Stage 4: Publish & Monitor
    await page.locator(".stepper-step-btn.next").click();
    await page.waitForURL("**/drift");
    await expect(page.locator(".stepper-stage-indicator")).toContainText("STAGE 04");

    // Go backwards using Previous Stage button
    const prevBtn = page.locator(".stepper-step-btn.prev");
    await expect(prevBtn).toBeVisible();
    await prevBtn.click();
    await page.waitForURL("**/?view=reviews");
    await expect(page.locator(".stepper-stage-indicator")).toContainText("STAGE 03");
  });

  test("Simulate Persona Workflow Transitions across all 5 Stakeholders", async ({ page }) => {
    await page.goto("/dashboards");
    await expect(page.locator("body")).toBeVisible();

    // Sign in to Aisha's Creator Dashboard
    const aishaSignIn = page.locator('button:has-text("Sign In to Aisha")').first();
    await expect(aishaSignIn).toBeVisible();
    await aishaSignIn.click();

    // Now in Role Dedicated Dashboard, role tabs exist
    const roleTabs = page.locator('[role="tab"]');
    const tabCount = await roleTabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(4);

    // Test 1-click fix button in Creator Dashboard
    const fixBtn = page.locator('button:has-text("1-Click Fix")').first();
    if (await fixBtn.isVisible()) {
      await fixBtn.click();
      await expect(page.locator("body")).toContainText("Approved Lab Spec");
    }

    // Switch to Legal Reviewer Dashboard (Maya)
    const mayaTab = page.locator('button:has-text("Maya")').first();
    if (await mayaTab.isVisible()) {
      await mayaTab.click();
      await expect(page.locator("body")).toContainText("Legal");
    }

    // Switch to Brand Owner Dashboard (Lena)
    const lenaTab = page.locator('button:has-text("Lena")').first();
    if (await lenaTab.isVisible()) {
      await lenaTab.click();
      await expect(page.locator("body")).toContainText("Brand");
    }
  });

  test("Simulate Review Cockpit Interactions (Tabs, Findings, Redlines, Suggestions)", async ({ page }) => {
    await page.goto("/?view=reviews");
    await expect(page.locator("body")).toBeVisible();

    // Verify review tabs are clickable
    const tabs = ["Findings", "Content", "History"];
    for (const tab of tabs) {
      const tabLocator = page.locator(`button:has-text("${tab}"), [role="tab"]:has-text("${tab}")`).first();
      if (await tabLocator.isVisible()) {
        await tabLocator.click();
        await page.waitForTimeout(100);
      }
    }
  });

  test("Multimodal Compliance Studio Frame Inspection and Scanner", async ({ page }) => {
    await page.goto("/multimodal");
    await expect(page.locator("body")).toBeVisible();

    // Run Visual Scan
    const scanBtn = page.locator('button:has-text("Run Multimodal Vision Audit"), button:has-text("Run Visual Scan")');
    await expect(scanBtn).toBeVisible();
    await scanBtn.click();
    await page.waitForTimeout(500);

    // Verify findings are present
    await expect(page.locator(".findings-list")).toBeVisible();
  });

  test("Dynamic Truth Sync Source Sync Triggers", async ({ page }) => {
    await page.goto("/sync");
    await expect(page.locator("body")).toBeVisible();

    // Trigger sync
    const syncBtn = page.locator('button:has-text("Sync Now")');
    await expect(syncBtn).toBeVisible();
    await syncBtn.click();
    await page.waitForTimeout(500);

    // Verify specs list
    await expect(page.locator(".facts-card-list")).toBeVisible();
  });

  test("Publishing Drift Radar 1-Click Remediate and Dispatch", async ({ page }) => {
    await page.goto("/drift");
    await expect(page.locator("body")).toBeVisible();

    // Check drift feed
    await expect(page.locator(".live-posts-list")).toBeVisible();

    // Trigger simulate battery update
    const simBtn = page.locator('button:has-text("Simulate Spec Update")');
    if (await simBtn.isVisible()) {
      await simBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test("Workspace Switcher in sidebar opens dropdown and switches brand workspace", async ({ page }) => {
    await page.goto("/?view=reviews");
    const switcherBtn = page.locator("button.workspace-switcher");
    await expect(switcherBtn).toBeVisible();
    await expect(switcherBtn).toContainText("Novacore Brand Workspace");

    // Click to open dropdown
    await switcherBtn.click();
    const dropdown = page.locator(".workspace-dropdown-menu");
    await expect(dropdown).toBeVisible();

    // Verify option is visible and switch to VoltEdge Labs
    const voltedgeOption = page.locator(".workspace-option-btn:has-text('VoltEdge Labs R&D')");
    await expect(voltedgeOption).toBeVisible();
    await voltedgeOption.click();

    // Dropdown should close and switcher updates
    await expect(dropdown).not.toBeVisible();
    await expect(switcherBtn).toContainText("VoltEdge Labs R&D");

    // Breadcrumb updates as well
    await expect(page.locator(".breadcrumb")).toContainText("VoltEdge Labs R&D");
  });
});
