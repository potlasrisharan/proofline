import { test, expect } from "@playwright/test";

test.describe("Judge Upload & Comprehensive Error Handling Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("1. Non-existent route renders branded 404 page and navigates cleanly", async ({ page }) => {
    await page.goto("/non-existent-endpoint-test-404");
    
    // Check branded 404 elements
    await expect(page.getByText("404 NOT FOUND")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Endpoint Not Located" })).toBeVisible();
    await expect(page.getByText("The requested route or dashboard view does not exist")).toBeVisible();

    // Verify recovery link to Return to Cockpit
    const cockpitLink = page.getByRole("link", { name: "← Return to Cockpit" });
    await expect(cockpitLink).toBeVisible();
    await cockpitLink.click();
    await expect(page).toHaveURL("/");
  });

  test("2. Unmapped view parameter renders defensive view fallback panel", async ({ page }) => {
    await page.goto("/?view=unmapped_legacy_dashboard");

    // Defensive fallback panel must be visible
    await expect(page.getByRole("heading", { name: "View Not Located" })).toBeVisible();
    await expect(page.getByText(/The requested view parameter.*is not active/)).toBeVisible();

    // Click Return to Content Reviews
    const returnBtn = page.getByRole("button", { name: "Return to Content Reviews →" });
    await expect(returnBtn).toBeVisible();
    await returnBtn.click();

    // Should switch to reviews view
    await expect(page.getByRole("heading", { name: "Make the decision easy to defend." })).toBeVisible();
    await expect(page.getByText("findings need review")).toBeVisible();
  });

  test("3. Judge uploads plain text (.txt) file and receives verified findings", async ({ page }) => {
    await page.goto("/submit");
    await expect(page.getByRole("heading", { name: "Content to review" })).toBeVisible();

    const textContent =
      "The Novacore NovaBook S1 is our latest innovation. It features up to 20 hours of battery life and is twice as fast as all competitor ultrabooks. Built with titanium unibody.";

    // Trigger file upload with .txt buffer
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("#pl-upload").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "judge_review_draft.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(textContent, "utf-8"),
    });

    // Check upload status confirmation
    await expect(page.getByText(/✓ Text extracted from judge_review_draft\.txt/)).toBeVisible();

    // Verify draft text is populated
    const contentTextarea = page.locator("#pl-text");
    await expect(contentTextarea).toHaveValue(textContent);

    // Submit for evidence check
    const runBtn = page.getByRole("button", { name: "Run evidence check" });
    await expect(runBtn).toBeEnabled();
    await runBtn.click();

    // Verify landing on /findings with parsed results
    await page.waitForURL("/findings");
    await expect(page.getByText("Flagged claims & fixes")).toBeVisible();
    await expect(page.getByText("Risk breakdown")).toBeVisible();
    await expect(page.getByText(/Battery life/i).first()).toBeVisible();

    // Verify remediation action button is available
    const actionBtn = page.getByRole("button", { name: /Apply suggestion|Provide replacement|Dismiss with reason/i }).first();
    await expect(actionBtn).toBeVisible();
  });

  test("4. Judge uploads PDF document (.pdf) and receives verified findings", async ({ page }) => {
    await page.goto("/submit");

    const pdfBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 55 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Novacore NovaBook S1 deliver 20 hours battery) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n320\n%%EOF",
      "utf-8"
    );

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("#pl-upload").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "official_novabook_spec.pdf",
      mimeType: "application/pdf",
      buffer: pdfBuffer,
    });

    await expect(page.getByText(/✓ PDF "official_novabook_spec\.pdf" loaded/)).toBeVisible();

    // Run check
    await page.getByRole("button", { name: "Run evidence check" }).click();
    await page.waitForURL("/findings");
    await expect(page.getByText("Flagged claims & fixes")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Every flag has an explanation." })).toBeVisible();
  });

  test("5. Judge uploads DOCX document and receives verified findings", async ({ page }) => {
    await page.goto("/submit");

    const dummyDocx = Buffer.from("PK\x03\x04MockDocxContentWithNovaBookSpecifications", "utf-8");

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("#pl-upload").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "press_release_novabook.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: dummyDocx,
    });

    await expect(page.getByText(/✓ DOCX "press_release_novabook\.docx" loaded/)).toBeVisible();

    await page.getByRole("button", { name: "Run evidence check" }).click();
    await page.waitForURL("/findings");
    await expect(page.getByText("Risk breakdown")).toBeVisible();
  });

  test("6. Judge uploads marketing image (.png) and checks visual claims & alt-text", async ({ page }) => {
    await page.goto("/submit");

    // 1x1 transparent PNG buffer
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("#pl-upload").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "novabook_hero_banner.png",
      mimeType: "image/png",
      buffer: pngBuffer,
    });

    await expect(page.getByText(/✓ Image "novabook_hero_banner\.png" loaded/)).toBeVisible();

    await page.getByRole("button", { name: "Run evidence check" }).click();
    await page.waitForURL("/findings");

    // Check alt text review card is rendered
    await expect(page.getByText(/Alt text provided/i)).toBeVisible();
  });

  test("7. Unsupported file format is properly caught and surfaces clear error message", async ({ page }) => {
    await page.goto("/submit");

    const exeBuffer = Buffer.from("MZThisIsAnExecutableFile", "utf-8");

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("#pl-upload").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "malicious_script.exe",
      mimeType: "application/x-msdownload",
      buffer: exeBuffer,
    });

    // Check error banner targeting form-error container specifically
    const alertBox = page.locator(".form-error.pl-message");
    await expect(alertBox).toBeVisible();
    await expect(alertBox).toContainText("Please choose a supported file: .txt, .md, PDF, DOCX, PNG, or JPG.");
  });

  test("8. Oversized file exceeds limit and surfaces clear error message", async ({ page }) => {
    await page.goto("/submit");

    // 16 MB buffer exceeding the 15 MB limit
    const largeBuffer = Buffer.alloc(16 * 1024 * 1024);

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("#pl-upload").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "huge_archive_dump.txt",
      mimeType: "text/plain",
      buffer: largeBuffer,
    });

    // Check size limit error banner targeting form-error container specifically
    const alertBox = page.locator(".form-error.pl-message");
    await expect(alertBox).toBeVisible();
    await expect(alertBox).toContainText("File exceeds the 15 MB upload limit");
  });

  test("9. Multimodal visual scan handles custom frame upload and format validation", async ({ page }) => {
    await page.goto("/multimodal");

    // Upload custom PNG frame
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "📤 Upload Custom Frame" }).click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "instagram_reel_frame.png",
      mimeType: "image/png",
      buffer: pngBuffer,
    });

    // Verify frame is added to carousel and audit log
    await expect(page.getByText(/Custom asset "instagram_reel_frame\.png" loaded/)).toBeVisible();

    // Trigger multimodal audit
    const auditBtn = page.getByRole("button", { name: /Run Multimodal Vision Audit/ });
    await expect(auditBtn).toBeVisible();
    await auditBtn.click();

    // Verify rich telemetry output
    await expect(page.getByText(/Multimodal Audit Complete/i)).toBeVisible();
  });

  test("10. Direct /findings navigation with empty storage provides 1-click sample load", async ({ page }) => {
    // Clear storage to test cold start
    await page.goto("/findings");
    await page.evaluate(() => {
      window.sessionStorage.clear();
      window.localStorage.clear();
    });
    await page.reload();

    await expect(page.getByRole("heading", { name: "No content has been submitted in this tab." })).toBeVisible();

    // Click 1-click sample load
    const loadSampleBtn = page.getByRole("button", { name: "⚡ Load Sample NovaBook S1 Review" });
    await expect(loadSampleBtn).toBeVisible();
    await loadSampleBtn.click();

    // Should immediately populate review with findings and risk score
    await expect(page.getByText("Risk breakdown")).toBeVisible();
    await expect(page.getByText("Review & Edit History")).toBeVisible();
    await expect(page.getByRole("button", { name: "📜 View Compliance Certificate" }).first()).toBeVisible();
  });

  test("11. Arbitrary test copy and unknown PDF flags test/unverified scope and enables interactive tabs and editing", async ({ page }) => {
    await page.goto("/submit");

    // Upload an unknown document
    const dummyPdf = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 40 >>\nstream\nBT /F1 12 Tf 100 700 Td (Presented By Binary Brains) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000216 00000 n\ntrailer << /Size 5 /Root 1 0 R >>\nstartxref\n300\n%%EOF",
      "utf-8"
    );

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("#pl-upload").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "Presented By Binary Brains.pdf",
      mimeType: "application/pdf",
      buffer: dummyPdf,
    });

    // Enter test probing copy
    const testCopy = "hii this content is to check and if this is not flagged this pipeline is failing";
    await page.locator("#pl-text").fill(testCopy);

    // Run check
    await page.getByRole("button", { name: "Run evidence check" }).click();
    await page.waitForURL("/findings");

    // 1. Verify finding exists and is flagged as high/critical
    await expect(page.getByText("Flagged claims & fixes")).toBeVisible();
    await expect(page.getByText("Risk breakdown")).toBeVisible();
    // Test copy probe or unverified claim must be caught
    await expect(page.getByText(/Test phrasing|unverified placeholder|unverified/i).first()).toBeVisible();

    // 2. Verify interactive tabs
    const auditedTab = page.getByRole("button", { name: "Audited text" });
    const currentTab = page.getByRole("button", { name: /Current v1/i });
    const originalTab = page.getByRole("button", { name: "Original" });
    await expect(auditedTab).toBeVisible();
    await expect(currentTab).toBeVisible();
    await expect(originalTab).toBeVisible();

    // Switch to Current v1 tab
    await currentTab.click();
    await expect(page.getByText("Current Working Draft (v1)")).toBeVisible();
    const editDraftBtn = page.getByRole("button", { name: "✏️ Edit Draft Directly" });
    await expect(editDraftBtn).toBeVisible();

    // Open direct editor and update draft
    await editDraftBtn.click();
    const directTextarea = page.locator("#direct-draft-edit");
    await expect(directTextarea).toBeVisible();
    await directTextarea.fill("Meet the Novacore NovaBook S1. Up to 12 hours of battery life.");
    await page.getByRole("button", { name: "⚡ Save & Run Fresh Check" }).click();

    // Verify v2 draft is audited and active
    await expect(page.getByText("Current v2")).toBeVisible();

    // 3. Verify sidebar workspace switcher works
    const switcherBtn = page.getByRole("button", { name: "Switch brand workspace" });
    await expect(switcherBtn).toBeVisible();
    await switcherBtn.click();
    await expect(page.getByRole("listbox", { name: "Available Brand Workspaces" })).toBeVisible();
    await expect(page.getByText("VoltEdge Labs R&D")).toBeVisible();
    await page.getByText("VoltEdge Labs R&D").click();
    await expect(page.getByText("Switched to: VoltEdge Labs R&D")).toBeVisible();
  });
});
