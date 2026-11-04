import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

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

    // Minimal valid DOCX containing word/document.xml with NovaBook specifications
    const docxBase64 =
      "UEsDBBQAAAAAAHhVZF0CxKfsSwEAAEsBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbDw/eG1sIHZlcnNpb249IjEuMCIgZW5jb2Rpbmc9IlVURi04IiBzdGFuZGFsb25lPSJ5ZXMiPz48VHlwZXMgeG1sbnM9Imh0dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9wYWNrYWdlLzIwMDYvY29udGVudC10eXBlcyI+PERlZmF1bHQgRXh0ZW5zaW9uPSJ4bWwiIENvbnRlbnRUeXBlPSJhcHBsaWNhdGlvbi94bWwiLz48T3ZlcnJpZGUgUGFydE5hbWU9Ii93b3JkL2RvY3VtZW50LnhtbCIgQ29udGVudFR5cGU9ImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC53b3JkcHJvY2Vzc2luZ21sLmRvY3VtZW50Lm1haW4reG1sIi8+PC9UeXBlcz5QSwMEFAAAAAAAeFVkXc/fvaoYAQAAGAEAABEAAAB3b3JkL2RvY3VtZW50LnhtbDw/eG1sIHZlcnNpb249IjEuMCIgZW5jb2Rpbmc9IlVURi04IiBzdGFuZGFsb25lPSJ5ZXMiPz48dzpkb2N1bWVudCB4bWxuczp3PSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvd29yZHByb2Nlc3NpbmdtbC8yMDA2L21haW4iPjx3OmJvZHk+PHc6cD48dzpyPjx3OnQ+Tm92YWNvcmUgTm92YUJvb2sgUzEgZmVhdHVyZXMgdXAgdG8gMjAgaG91cnMgYmF0dGVyeSBsaWZlIGFuZCB1bmlib2R5IHRpdGFuaXVtLjwvdzp0PjwvdzpyPjwvdzpwPjwvdzpib2R5Pjwvdzpkb2N1bWVudD5QSwECFAMUAAAAAAB4VWRdAsSn7EsBAABLAQAAEwAAAAAAAAAAAAAAgAEAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUAxQAAAAAAHhVZF3P372qGAEAABgBAAARAAAAAAAAAAAAAACAAXwBAAB3b3JkL2RvY3VtZW50LnhtbFBLBQYAAAAAAgACAIAAAADDAgAAAAA=";
    const validDocx = Buffer.from(docxBase64, "base64");

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("#pl-upload").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "press_release_novabook.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: validDocx,
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

    await expect(page.getByText(/✓ Image "novabook_hero_banner\.png" (loaded|attached)/)).toBeVisible();

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

  test("12. Uploading a complex multi-page PDF extracts real text and NEVER replaces it with hardcoded demo copy", async ({ page }) => {
    await page.goto("/submit");

    const pdfPath = path.join(process.cwd(), "docs/Proofline_Round_3_Final_Product.pdf");
    const pdfBuffer = fs.readFileSync(pdfPath);

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("#pl-upload").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "Proofline_Round_3_Final_Product.pdf",
      mimeType: "application/pdf",
      buffer: pdfBuffer,
    });

    // Check upload status confirms real text was extracted
    await expect(page.getByText(/✓ PDF "Proofline_Round_3_Final_Product\.pdf" loaded/)).toBeVisible();

    // Verify textarea contains real extracted text
    const contentTextarea = page.locator("#pl-text");
    await expect(contentTextarea).toBeVisible();
    const value = await contentTextarea.inputValue();

    // MUST contain real document content
    expect(value).toContain("PROOFLINE");
    expect(value).toContain("Evidence-Backed Brand Governance");

    // MUST NOT contain the fake hardcoded demo copy
    expect(value).not.toContain("Meet the Novacore NovaBook S1.\n\nDesigned for deep work and long days");
    expect(value).not.toContain("whisper-quiet cooling");

    // Run evidence check on the real extracted PDF content
    await page.getByRole("button", { name: "Run evidence check" }).click();
    await page.waitForURL("/findings");

    // Must reach findings with verified audit results
    await expect(page.getByText("Flagged claims & fixes")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Every flag has an explanation." })).toBeVisible();
  });

  test("13. Custom draft submission dynamically updates Human Review Queue and all Role Dashboards", async ({ page }) => {
    await page.goto("/submit");

    // Submit custom marketing announcement
    const customTitle = "Judge Live Pipeline Verification Campaign";
    const customBody = "The Novacore NovaBook S1 delivers class-leading computing power with up to 20 hours battery life.";

    await page.locator("#pl-title").fill(customTitle);
    await page.locator("#pl-text").fill(customBody);
    await page.getByRole("button", { name: "Run evidence check" }).click();
    await page.waitForURL("/findings");

    // 1. Verify in Human Review Queue (/?view=reviews)
    await page.goto("/?view=reviews");
    await expect(page.getByRole("heading", { name: "Open reviews" })).toBeVisible();

    // Custom draft must be visible at the top of the queue
    const customQueueItem = page.getByRole("button", { name: new RegExp(customTitle) });
    await expect(customQueueItem).toBeVisible();
    await customQueueItem.click();

    // Verify detail view displays submitted draft and findings
    await expect(page.getByRole("heading", { name: customTitle })).toBeVisible();
    await expect(page.getByText("Submitted by Aisha Rahman (You)")).toBeVisible();

    // 2. Verify in Creator Dashboard (/dashboards?role=creator)
    await page.goto("/dashboards?role=creator");
    await expect(page.getByRole("heading", { name: "Aisha's Content Lead Dashboard" })).toBeVisible();
    // Custom draft appears under Recent Creator Submissions
    await expect(page.getByText(new RegExp(customTitle))).toBeVisible();

    // 3. Verify in Manager Dashboard (/dashboards?role=manager)
    await page.goto("/dashboards?role=manager");
    await expect(page.getByRole("heading", { name: "Editorial Review Queue" })).toBeVisible();
    // Custom draft appears in Marcus's table
    const tableRow = page.getByRole("button", { name: new RegExp(customTitle) });
    await expect(tableRow).toBeVisible();
    await tableRow.click();

    // Route to Legal button works
    const routeLegalBtn = page.getByRole("button", { name: /Route .* to Legal Sign-off/i });
    await expect(routeLegalBtn).toBeVisible();
    await routeLegalBtn.click();
    await expect(page.getByText(/routed to Maya Chen/i)).toBeVisible();
  });
});
