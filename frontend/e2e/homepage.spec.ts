import { test, expect } from "@playwright/test";

test.describe("Meeting-AI Frontend E2E Tests", () => {
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
    await expect(page.locator("a.brand")).toContainText("Meeting AI");
    await expect(page.locator("h1")).toContainText("Every meeting,remembered.");
    await expect(page.locator("text=Your meeting notes will appear here.")).toBeVisible();
  });

  test("2. choose-file UI works", async ({ page }) => {
    await page.goto("/");
    const chooseFileLabel = page.locator("label.upload");
    await expect(chooseFileLabel).toContainText("Choose file");

    const fileInput = page.locator("input[type='file']");
    await expect(fileInput).toBeHidden(); // Hidden input inside the label
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

    // Set file input
    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles({
      name: "test.wav",
      mimeType: "audio/wav",
      buffer: Buffer.from("RIFF dummy WAV file data"),
    });

    // Click Transcribe & summarize →
    const processBtn = page.locator("button.process");
    await expect(processBtn).toContainText("Transcribe & summarize");
    await processBtn.click();

    // Check loading indicator appears
    await expect(page.locator("button.process")).toContainText("Processing meeting…");
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

    // Set file input
    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles({
      name: "test.wav",
      mimeType: "audio/wav",
      buffer: Buffer.from("RIFF dummy WAV file data"),
    });

    // Click Transcribe & summarize →
    await page.locator("button.process").click();

    // Verify error is displayed, processing state ends, and retry button remains visible
    await expect(page.locator("button.process")).toContainText("Transcribe & summarize");
    await expect(page.locator("p.error")).toContainText("Internal Server Error during AI summary");
  });

  test("5. successful meeting processing displays all structured sections", async ({ page }) => {
    const mockResponse = {
      id: 123,
      title: "Design System Alignment",
      status: "done",
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

    // Set file input
    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles({
      name: "test.wav",
      mimeType: "audio/wav",
      buffer: Buffer.from("RIFF dummy WAV file data"),
    });

    // Click Transcribe & summarize →
    await page.locator("button.process").click();

    // Check title is rendered
    await expect(page.locator("h2:has-text('Design System Alignment')")).toBeVisible();

    // Check summary section
    await expect(page.locator("text=This was an alignment meeting")).toBeVisible();

    // Check key points
    await expect(page.locator("text=Discussion on design framework choices")).toBeVisible();

    // Check decisions
    await expect(page.locator("text=Migrate component library to Tailwind CSS next sprint")).toBeVisible();

    // Check action items
    await expect(page.locator("text=Lead conversion migration work")).toBeVisible();
    await expect(page.locator("text=Alice · Next Friday")).toBeVisible();

    // Check full transcript
    const details = page.locator("details.transcript");
    await expect(details).toBeVisible();
    await details.locator("summary").click();
    await expect(details.locator("p")).toContainText("We decided to migrate our component library");
  });

  test("6. failed meeting displays processing failure and full transcript", async ({ page }) => {
    const mockResponse = {
      id: 999,
      title: "Failed Meeting Test",
      status: "failed",
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
    await expect(page.locator("h2:has-text('Failed Meeting Test')")).toBeVisible();

    // Summary section should show "Processing failed. Please check the backend logs or retry."
    await expect(page.locator(".summary p")).toContainText("Processing failed. Please check the backend logs or retry.");

    // Full transcript card should still be visible and expandable
    const details = page.locator("details.transcript");
    await expect(details).toBeVisible();
    await details.locator("summary").click();
    await expect(details.locator("p")).toContainText("This is a transcript of a meeting that eventually failed");
  });

  test("7. export PDF button is visible for completed meetings", async ({ page }) => {
    const mockResponse = {
      id: 123,
      title: "PDF Test Meeting",
      status: "done",
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

    // Export button should be visible
    const exportBtn = page.locator("a:has-text('Export PDF')");
    await expect(exportBtn).toBeVisible();
    
    // Check download href
    const href = await exportBtn.getAttribute("href");
    expect(href).toContain("/meetings/123/pdf?lang=en");
  });
});


