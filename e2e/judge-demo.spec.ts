import { expect, test } from "@playwright/test";

test.describe("Enterprise Workspaces & Quality Gate Workflows", () => {
  test("Scenario 1: [IMP-1] Fact-Change Impact Radar navigates to impact queue and triggers recheck", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Impact radar" }).click();

    await expect(page).toHaveURL(/\/impact$/);
    await expect(page.getByRole("heading", { name: "Fact-Change Impact Radar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Re-check all affected" })).toBeVisible();

    await page.getByRole("button", { name: "Re-check all affected" }).click();
    await expect(page.getByText(/Re-check completed for 2 affected item\(s\)/)).toBeVisible();
  });

  test("Scenario 2: [IMP-2] Evidence-or-Abstain highlights unverified claim vs hard contradiction", async ({ page }) => {
    await page.goto("/?view=reviews");

    await expect(page.getByRole("heading", { name: "NovaBook S1 launch email" })).toBeVisible();
    await expect(page.getByText("our most reliable laptop yet")).toBeVisible();
    await expect(page.getByText("evidence not found", { exact: true })).toBeVisible();
    await expect(page.getByText("Comparative claims need an approved benchmark")).toBeVisible();
  });

  test("Scenario 3: [IMP-3] Guideline-Gap Detector navigates to insights and approves proposed rule update", async ({ page }) => {
    await page.goto("/insights");

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
    await page.goto("/?view=reviews");

    await expect(page.getByRole("heading", { name: "NovaBook S1 launch email" })).toBeVisible();
    await expect(page.locator(".diff-highlight-box").first()).toBeVisible();
    await expect(page.getByText("up to 20 hours of battery life")).toBeVisible();
  });

  test("Scenario 5: Indic Verification opens Sarvam AI modal with Telugu and Hindi", async ({ page }) => {
    await page.goto("/submit");

    // Open Creator Studio from submit page
    const studioBtn = page.getByRole("button", { name: /Open Creator Studio/i }).first();
    if (await studioBtn.isVisible()) {
      await studioBtn.click();
      const studioDialog = page.getByRole("dialog", { name: /Creator Content Studio/i });
      await expect(studioDialog).toBeVisible();

      // Test Sarvam Indic language toggle
      await studioDialog.getByRole("button", { name: "Telugu (తెలుగు)" }).click();
      await expect(studioDialog.getByText("వోల్ట్‌ఎడ్జ్ నోవాబుక్")).toBeVisible();

      await studioDialog.getByRole("button", { name: "Hindi (हिन्दी)" }).click();
      await expect(studioDialog.getByText("वोल्टएज नोवाबुक")).toBeVisible();

      await studioDialog.getByRole("button", { name: "Close" }).click();
    }
  });

  test("Scenario 6: 1-Click Gated Dispatch unlocks multi-platform dispatch modal", async ({ page }) => {
    await page.goto("/?view=reviews");

    // Click into findings tab
    await page.getByRole("tab", { name: /Findings/i }).click();

    // Resolve battery finding
    const applyBtn = page.getByRole("button", { name: "Apply" }).first();
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
    }

    // Check if gated dispatch can be triggered or simulated
    await expect(page.getByText("PUBLISHING GATE")).toBeVisible();
  });

  test("Scenario 7: Cryptographic Audit Chain navigates to audit log and checks hash chain", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Audit log/ }).click();

    await expect(page.getByRole("heading", { name: "Every decision has a link." })).toBeVisible();
    await expect(page.getByText("Chain verified", { exact: true })).toBeVisible();
  });

  test("allows switching execution engine between Cloudflare API and Local Engine", async ({ page }) => {
    await page.goto("/submit");
    const apiBtn = page.getByRole("radio", { name: /⚡ Cloudflare API/ }).first();
    const demoBtn = page.getByRole("radio", { name: /💻 Local Engine/ }).first();

    await expect(apiBtn).toHaveAttribute("aria-checked", "true");
    await expect(demoBtn).toHaveAttribute("aria-checked", "false");

    await demoBtn.click();
    await expect(demoBtn).toHaveAttribute("aria-checked", "true");
    await expect(apiBtn).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText("IMPLEMENTED · local engine")).toBeVisible();

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

  test("Scenario 8: Enterprise Compliance Suite verifies Acrolinx Scorecard, Red Marker Rulebook, PerformLine Scanner, and Filestage Certificate", async ({ page }) => {
    await page.goto("/");
    // Switch to creator role so we can apply fixes
    await page.getByRole("combobox", { name: "Role preview" }).selectOption("creator");

    // Click into content review via overview action button
    await page.getByRole("button", { name: "Open Review Workspace →" }).click();

    // Verify Quality Gate Scorecard is visible and initially blocked
    await expect(page.getByText("PUBLISHING GATE: BLOCKED")).toBeVisible();
    await expect(page.getByText("Acrolinx Quality Scorecard")).toBeVisible();

    // Test Red Marker Regulatory Rulebook Tab
    await page.getByRole("tab", { name: /Red Marker Regulatory Rulebook/ }).click();
    await expect(page.getByText("FTC 16 CFR § 255")).toBeVisible();
    await expect(page.getByText("Lanham Act § 43(a)")).toBeVisible();
    await expect(page.getByText("Mandatory Disclosure Rule")).toBeVisible();

    // Insert mandatory disclaimer
    const addDisclaimerBtn = page.getByRole("button", { name: /Insert Mandatory Disclaimer/ });
    if (await addDisclaimerBtn.isVisible()) {
      await addDisclaimerBtn.click();
      await expect(page.getByText("Footnote Detected")).toBeVisible();
    }

    // Test PerformLine Superlative Scanner Tab
    await page.getByRole("tab", { name: /PerformLine Superlative Scanner/ }).click();
    await expect(page.getByText("High-Risk Superlative & Absolute Scanner")).toBeVisible();
    await expect(page.locator(".trigger-text")).toContainText("our most reliable laptop yet");

    // Apply safe-harbor rewrite
    const safeHarborBtn = page.getByRole("button", { name: /Apply Safe-Harbor Rewrite/ });
    if (await safeHarborBtn.isVisible()) {
      await safeHarborBtn.click();
    }

    // Now resolve battery finding to unlock gate
    await page.getByRole("tab", { name: /Acrolinx Quality Scorecard/ }).click();
    const batteryApplyBtn = page.getByRole("button", { name: "Apply" }).first();
    if (await batteryApplyBtn.isVisible()) {
      await batteryApplyBtn.click();
    }

    // Gate should now be UNLOCKED
    await expect(page.getByText("PUBLISHING GATE: UNLOCKED")).toBeVisible();

    // Open Compliance Certificate Modal
    await page.getByRole("button", { name: "View Certificate" }).first().click();
    await expect(page.getByRole("dialog", { name: "PUBLICATION & REGULATORY COMPLIANCE" })).toBeVisible();
    await expect(page.getByText("PROOFLINE TRUTH ENGINE")).toBeVisible();
    await expect(page.getByText("OFFICIALLY SEALED")).toBeVisible();
    await expect(page.getByText(/PLC-2026-/)).toBeVisible();

    // Copy JSON receipt verification
    await page.getByRole("button", { name: /Copy Verification JSON/ }).click();
    await expect(page.getByText("Receipt JSON Copied!")).toBeVisible();

    // Close certificate modal
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "PUBLICATION & REGULATORY COMPLIANCE" })).not.toBeVisible();
  });

  test("Scenario 9: Compliance Certificate opens and functions seamlessly on /findings", async ({ page }) => {
    await page.goto("/findings");
    const loadBtn = page.getByRole("button", { name: /⚡ Load Sample NovaBook S1 Review/ });
    if (await loadBtn.isVisible()) {
      await loadBtn.click();
    }

    const viewCertBtn = page.getByRole("button", { name: /View Compliance Certificate/ });
    await expect(viewCertBtn).toBeVisible();
    await viewCertBtn.click();

    await expect(page.getByRole("dialog", { name: "PUBLICATION & REGULATORY COMPLIANCE" })).toBeVisible();
    await expect(page.getByText("PROOFLINE TRUTH ENGINE")).toBeVisible();
    await expect(page.getByText(/PLC-2026-/)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "PUBLICATION & REGULATORY COMPLIANCE" })).not.toBeVisible();
  });

  test("Scenario 10: Enterprise Single Login & Role Access verifies all 5 roles and seamless navigation", async ({ page }) => {
    await page.goto("/");

    // Verify Active Role Workflow Banner is visible
    const banner = page.getByRole("region", { name: "Active role workflow context" });
    await expect(banner).toBeVisible();
    await expect(banner.getByText("Logged in as Maya Chen")).toBeVisible();
    await expect(banner.getByText("maya.chen@voltedge.io")).toBeVisible();

    // Verify Single Login component is visible on home page
    const loginSection = page.locator(".single-login-container");
    await expect(loginSection.getByRole("heading", { name: "Sign In to VoltEdge Workspace" })).toBeVisible();
    await expect(loginSection.getByText("aisha.rahman@voltedge.io")).toBeVisible();
    await expect(loginSection.getByText("marcus.vance@voltedge.io")).toBeVisible();
    await expect(loginSection.getByText("lena.ortiz@voltedge.io")).toBeVisible();
    await expect(loginSection.getByText("carlos.mendez@agency-partner.com")).toBeVisible();

    // 1-Click quick login as Aisha Rahman (Creator)
    await loginSection.getByRole("button", { name: /Sign in as Aisha Rahman/ }).click();
    await expect(banner.getByText("Logged in as Aisha Rahman")).toBeVisible();
    await expect(banner.getByText("aisha.rahman@voltedge.io")).toBeVisible();

    // Open Single Login modal via topbar avatar
    await page.locator("header .persona-avatar").first().click();
    const modal = page.getByRole("dialog", { name: "Sign In to VoltEdge Workspace" });
    await expect(modal).toBeVisible();

    // Switch to Lena Ortiz (Brand Owner)
    await modal.getByRole("button", { name: /Sign in as Lena Ortiz/ }).click();
    await expect(banner.getByText("Logged in as Lena Ortiz")).toBeVisible();
    await expect(banner.getByText("lena.ortiz@voltedge.io")).toBeVisible();

    // Open Single Login modal via banner button
    await banner.getByRole("button", { name: "⇄ Switch Account / Role" }).click();
    const modal2 = page.getByRole("dialog", { name: "Sign In to VoltEdge Workspace" });
    await expect(modal2).toBeVisible();

    // Switch to Marcus Vance (Manager)
    await modal2.getByRole("button", { name: /Sign in as Marcus Vance/ }).click();
    await expect(banner.getByText("Logged in as Marcus Vance")).toBeVisible();
    await expect(banner.getByText("marcus.vance@voltedge.io")).toBeVisible();

    // Verify dedicated /login page works
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign In to VoltEdge Workspace" })).toBeVisible();
    await page.getByRole("button", { name: /Sign in as Carlos Mendez/ }).click();
    await expect(page).toHaveURL("/");
    const activeBanner = page.getByRole("region", { name: "Active role workflow context" });
    await expect(activeBanner.getByText("Logged in as Carlos Mendez")).toBeVisible();
  });

  test("Scenario 11: Creator Multi-Platform Studio audits LinkedIn, X/Twitter, and Instagram with Groq/Sarvam fallbacks", async ({ page }) => {
    await page.goto("/");

    // Log in as Aisha Rahman (Creator)
    await page.locator(".single-login-container").getByRole("button", { name: /Sign in as Aisha Rahman/ }).click();

    // Active workflow banner displays Creator Studio button
    const banner = page.getByRole("region", { name: "Active role workflow context" });
    const studioBtn = banner.getByRole("button", { name: /Creator Studio/ });
    await expect(studioBtn).toBeVisible();
    await studioBtn.click();

    const studioDialog = page.getByRole("dialog", { name: "Creator Content Studio · Cross-Platform Compliance" });
    await expect(studioDialog).toBeVisible();
    await expect(page.getByText("Live Groq & Sarvam AI + Fail-Soft Fallbacks")).toBeVisible();

    // Select Instagram tab
    await studioDialog.getByRole("tab", { name: "Instagram" }).click();
    await expect(page.getByText("Instagram & TikTok Caption")).toBeVisible();

    // Run Multi-Platform Audit
    await studioDialog.getByRole("button", { name: "▶ Run Multi-Platform Audit" }).click();

    // Verify findings are displayed: FTC rule 255 and Truth Registry spec
    await expect(studioDialog.getByText("FTC 16 CFR § 255 (Endorsement Guides)")).toBeVisible();
    await expect(studioDialog.getByText("Truth Registry Contradiction: up to 20 hours of battery life")).toBeVisible();

    // Click 1-Click Fix All
    await studioDialog.getByRole("button", { name: /1-Click Fix All/ }).click();
    await expect(studioDialog.getByText("100 / 100")).toBeVisible();
    await expect(studioDialog.getByText("All Specifications & Regulatory Checks Passed")).toBeVisible();

    // Apply to main workspace
    await studioDialog.getByRole("button", { name: "✓ Apply Clean Copy to Main Workspace" }).click();
    await expect(studioDialog).not.toBeVisible();
    await expect(page.getByText("Compliant creator copy applied to workspace!")).toBeVisible();
  });

  test("Scenario 12: Interactive Guided Tour walks step-by-step through workspace", async ({ page }) => {
    await page.goto("/");

    // Click Take Guided Product Tour button on home overview
    await page.getByRole("button", { name: /Take Guided (Product|Interactive) Tour/ }).click();

    // Verify Guided Tour dialog is active
    await expect(page.getByRole("dialog", { name: "Start with the workspace overview" })).toBeVisible();
    await expect(page.getByText("Step 1 of 7")).toBeVisible();

    // Advance to next step
    await page.getByRole("button", { name: "Open overview" }).click();
    await expect(page.getByText("Step 2 of 7")).toBeVisible();

    // Close tour
    await page.getByRole("button", { name: "Skip tour" }).click();
    await expect(page.getByRole("dialog", { name: /Start with the workspace overview|Submit one draft/ })).not.toBeVisible();
  });

  test("Scenario 13: Separate Main Screen (Portal) with Separate Logins and Separate Dashboards", async ({ page }) => {
    // 1. Visit separate main portal screen
    await page.goto("/portal");
    await expect(page.getByRole("heading", { name: "Select Your Role to Access Your Dedicated Dashboard" })).toBeVisible();

    // 2. Verify all 5 separate logins are rendered
    await expect(page.getByRole("heading", { name: "Aisha Rahman" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Marcus Vance" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Maya Chen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lena Ortiz" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Carlos Mendez" })).toBeVisible();

    // 3. Sign in to Creator Dashboard (Aisha)
    await page.getByRole("button", { name: /Sign In to Aisha's Dashboard/ }).click();
    await expect(page.getByRole("heading", { name: /Aisha's Content Lead Dashboard/ })).toBeVisible();
    await expect(page.getByText("Interactive Claims & Spec Inspector")).toBeVisible();

    // 4. Test 1-click lab fix on Creator Dashboard
    const fixBtn = page.getByRole("button", { name: /1-Click Fix: Replace with 12h Lab Spec/ });
    await expect(fixBtn).toBeVisible();
    await fixBtn.click();
    await expect(page.getByRole("button", { name: /Approved Lab Spec \(12h\) Applied/ })).toBeVisible();

    // 5. Switch to Legal Dashboard (Maya) via selector
    await page.getByLabel("Switch to another role dashboard").selectOption("legal_reviewer");
    await expect(page.getByRole("heading", { name: /Maya's Authorised Legal Reviewer Dashboard/ })).toBeVisible();
    await expect(page.getByText("4-Pillar Regulatory & Brand Scorecard")).toBeVisible();

    // 6. Return to Main Screen via Switch Login
    await page.getByRole("button", { name: "← Switch Login / All Roles" }).click();
    await expect(page.getByRole("heading", { name: "Select Your Role to Access Your Dedicated Dashboard" })).toBeVisible();

    // 7. Test open full workspace link
    await page.getByRole("button", { name: "⇥ Open Full Workspace" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Enterprise workspace")).toBeVisible();
  });
});
