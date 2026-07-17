import { test, expect } from "@playwright/test";

test.describe("Orivon Frontend E2E Tests", () => {
  // Mock GET /meetings on every page load to return empty list
  test.beforeEach(async ({ page }) => {
    await page.route("**/meetings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
  });

  test("1. homepage loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("a.sidebar-brand")).toContainText("ORIVON");
    await expect(page.locator("text=Your structured knowledge will appear here.")).toBeVisible();
  });

  test("2. choose-file UI works", async ({ page }) => {
    await page.goto("/");
    // Switch to Record & Upload tab
    await page.locator("text=Record & Upload").click();

    const chooseFileLabel = page.locator(".rf-upload-trigger-btn");
    await expect(chooseFileLabel).toBeVisible();

    const fileInput = page.locator("input[type='file']");
    await expect(fileInput).toBeHidden(); // Hidden input inside the trigger button area
  });

  test("3. processing state appears during upload", async ({ page }) => {
    // Intercept upload to delay response
    await page.route("**/meetings/upload", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 1,
          title: "Delayed Meeting",
          status: "done",
          recording_type: "Unknown",
          confidence: 100,
          audio_filename: null,
          transcript: "Mock transcript",
          summary: "Mock summary",
          key_points: [],
          decisions: [],
          action_items: [],
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.goto("/");
    // Switch to Record & Upload tab
    await page.locator("text=Record & Upload").click();

    // Set file input (starts upload immediately)
    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles({
      name: "test.wav",
      mimeType: "audio/wav",
      buffer: Buffer.from("RIFF dummy WAV file data"),
    });

    // Check loading indicator / processing view appears immediately
    await expect(page.locator(".rf-processing-view")).toBeVisible();
  });

  test("4. backend errors stop the loading state and display error", async ({ page }) => {
    // Mock upload to fail
    await page.route("**/meetings/upload", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Internal Server Error during AI summary" }),
      });
    });

    await page.goto("/");
    // Switch to Record & Upload tab
    await page.locator("text=Record & Upload").click();

    // Set file input
    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles({
      name: "test.wav",
      mimeType: "audio/wav",
      buffer: Buffer.from("RIFF dummy WAV file data"),
    });

    // Verify error is displayed, processing state ends
    await expect(page.locator(".rf-error-message")).toContainText("Internal Server Error during AI summary");
  });

  test("5. successful meeting processing displays all structured sections", async ({ page }) => {
    const mockResponse = {
      id: 123,
      title: "Design System Alignment",
      status: "done",
      recording_type: "Business Meeting",
      confidence: 90,
      audio_filename: null,
      transcript: "We decided to migrate our component library to Tailwind CSS by next sprint. Alice will lead the work.",
      summary: "This was an alignment meeting to finalize design system upgrades.",
      key_points: ["Discussion on design framework choices", "Evaluation of Tailwind conversion speed"],
      decisions: ["Migrate component library to Tailwind CSS next sprint"],
      action_items: [
        { task: "Lead conversion migration work", owner: "Alice", due: "Next Friday" }
      ],
      created_at: "2026-07-15T02:00:00Z",
    };

    await page.route("**/meetings/upload", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponse),
      });
    });

    await page.goto("/");
    // Switch to Record & Upload tab
    await page.locator("text=Record & Upload").click();

    // Set file input
    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles({
      name: "test.wav",
      mimeType: "audio/wav",
      buffer: Buffer.from("RIFF dummy WAV file data"),
    });

    // Check title is rendered
    await expect(page.locator("h1:has-text('Design System Alignment')")).toBeVisible();

    // Check summary section
    await expect(page.locator("text=This was an alignment meeting")).toBeVisible();

    // Check key points
    await expect(page.locator("text=Discussion on design framework choices")).toBeVisible();

    // Check decisions
    await expect(page.locator("text=Migrate component library to Tailwind CSS next sprint")).toBeVisible();

    // Check action items
    await expect(page.locator("text=Lead conversion migration work")).toBeVisible();
    await expect(page.locator("text=Alice · Next Friday")).toBeVisible();

    // Check full transcript — navigate to Transcript tab first (new workspace nav)
    await page.locator("button[role='tab']:has-text('Transcript')").click();
    await expect(page.locator(".rw-transcript-body")).toContainText("We decided to migrate our component library");
  });

  test("6. failed meeting displays processing failure and full transcript", async ({ page }) => {
    const mockResponse = {
      id: 999,
      title: "Failed Meeting Test",
      status: "failed",
      recording_type: "Unknown",
      confidence: 100,
      audio_filename: null,
      transcript: "This is a transcript of a meeting that eventually failed summarization.",
      summary: null,
      key_points: [],
      decisions: [],
      action_items: [],
      created_at: "2026-07-15T02:00:00Z",
    };

    // Mock GET /meetings to return this failed meeting
    await page.route("**/meetings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockResponse]),
      });
    });

    await page.goto("/");

    // Wait for the meeting to be selected in the sidebar
    await expect(page.locator("h1:has-text('Failed Meeting Test')")).toBeVisible();

    // Summary section should show failed warning
    await expect(page.locator(".rw-summary-text")).toContainText("Processing failed. Please check the backend logs or retry.");

    // Full transcript should still be visible — switch to Transcript tab
    await page.locator("button[role='tab']:has-text('Transcript')").click();
    await expect(page.locator(".rw-transcript-body")).toContainText("This is a transcript of a meeting that eventually failed");
  });

  test("7. export PDF button is visible for completed meetings", async ({ page }) => {
    const mockResponse = {
      id: 123,
      title: "PDF Test Meeting",
      status: "done",
      recording_type: "Unknown",
      confidence: 100,
      audio_filename: null,
      transcript: "We discussed export options.",
      summary: "This is a summary.",
      key_points: [],
      decisions: [],
      action_items: [],
      created_at: "2026-07-15T02:00:00Z",
    };

    await page.route("**/meetings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockResponse]),
      });
    });

    await page.goto("/");

    // Export button should be visible (we select the first match in the DOM)
    const exportBtn = page.locator("a:has-text('Export PDF')").first();
    await expect(exportBtn).toBeVisible();
    
    // Check download href
    const href = await exportBtn.getAttribute("href");
    expect(href).toContain("/meetings/123/pdf?lang=en");
  });
});
