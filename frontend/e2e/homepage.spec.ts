import { test, expect } from "@playwright/test";

const FAKE_USER = { id: 1, email: "test@example.com", name: "Test User", has_password: true };

function meeting(overrides: Record<string, unknown> = {}) {
  return {
    id: 123,
    title: "Design System Alignment",
    status: "done",
    recording_type: "Business Meeting",
    confidence: 90,
    audio_filename: null,
    media_token: "tok",
    transcript: "We decided to migrate our component library to Tailwind CSS by next sprint. Alice will lead the work.",
    summary: "This was an alignment meeting to finalize design system upgrades.",
    key_points: ["Discussion on design framework choices", "Evaluation of Tailwind conversion speed"],
    decisions: ["Migrate component library to Tailwind CSS next sprint"],
    action_items: [{ task: "Lead conversion migration work", owner: "Alice", due: "Next Friday" }],
    created_at: "2026-07-15T02:00:00Z",
    ...overrides,
  };
}

const json = (body: unknown, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(body) });

test.describe("Orivon Frontend E2E Tests", () => {
  // Every test starts "already logged in": the app silently calls
  // POST /auth/refresh on mount, then GET /meetings. Tests that exercise
  // the login screen override the /auth/refresh mock (last route wins).
  test.beforeEach(async ({ page }) => {
    await page.route("**/auth/refresh", (route) =>
      route.fulfill(json({ access_token: "tok", token_type: "bearer", user: FAKE_USER })),
    );
    await page.route(/\/meetings\/\d+\/metadata/, (route) =>
      route.fulfill(json({ people: [], projects: [], topics: [], related_meetings: [] })),
    );
    await page.route(/\/meetings(\?.*)?$/, (route) => route.fulfill(json([])));
  });

  test("1. dashboard loads for an authenticated user", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Orivon", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening), Test/ })).toBeVisible();
    await expect(page.getByText("No recordings yet")).toBeVisible();
  });

  test("2. uploads UI works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Uploads" }).click();
    await expect(page.locator(".rf-upload-trigger-btn")).toBeVisible();
    await expect(page.locator("input[type='file']")).toBeHidden();
  });

  test("3. processing state appears during upload", async ({ page }) => {
    await page.route("**/meetings/upload", async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.fulfill(json(meeting({ status: "done" })));
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Uploads" }).click();
    await page.locator("input[type='file']").setInputFiles({ name: "test.wav", mimeType: "audio/wav", buffer: Buffer.from("RIFF dummy") });
    await expect(page.locator(".rf-processing-view")).toBeVisible();
  });

  test("4. backend errors surface an error message", async ({ page }) => {
    await page.route("**/meetings/upload", (route) => route.fulfill(json({ detail: "Internal Server Error during AI summary" }, 500)));
    await page.goto("/");
    await page.getByRole("button", { name: "Uploads" }).click();
    await page.locator("input[type='file']").setInputFiles({ name: "test.wav", mimeType: "audio/wav", buffer: Buffer.from("RIFF dummy") });
    await expect(page.locator(".rf-error-message")).toContainText("Internal Server Error during AI summary");
  });

  test("5. a completed upload opens its structured detail view", async ({ page }) => {
    await page.route("**/meetings/upload", (route) => route.fulfill(json(meeting({ status: "done" }))));
    await page.goto("/");
    await page.getByRole("button", { name: "Uploads" }).click();
    await page.locator("input[type='file']").setInputFiles({ name: "test.wav", mimeType: "audio/wav", buffer: Buffer.from("RIFF dummy") });

    await expect(page.getByRole("heading", { name: "Design System Alignment" })).toBeVisible();
    await expect(page.getByText("This was an alignment meeting")).toBeVisible();
    await expect(page.getByText("Discussion on design framework choices")).toBeVisible();
    await expect(page.getByText("Migrate component library to Tailwind CSS next sprint")).toBeVisible();
    await expect(page.getByText("Lead conversion migration work")).toBeVisible();

    await page.getByRole("button", { name: "Transcript" }).click();
    await expect(page.getByText("We decided to migrate our component library")).toBeVisible();
  });

  test("6. a failed meeting shows the failure state and transcript", async ({ page }) => {
    const failed = meeting({ id: 999, title: "Failed Meeting Test", status: "failed", summary: null, key_points: [], decisions: [], action_items: [], transcript: "This is a transcript of a meeting that eventually failed summarization." });
    await page.route(/\/meetings(\?.*)?$/, (route) => route.fulfill(json([failed])));
    await page.goto("/");
    await page.getByText("Failed Meeting Test").first().click();
    await expect(page.getByText(/Processing failed/)).toBeVisible();
    await page.getByRole("button", { name: "Transcript" }).click();
    await expect(page.getByText("This is a transcript of a meeting that eventually failed")).toBeVisible();
  });

  test("7. the detail view exposes an Export PDF link", async ({ page }) => {
    await page.route(/\/meetings(\?.*)?$/, (route) => route.fulfill(json([meeting()])));
    await page.goto("/");
    await page.getByText("Design System Alignment").first().click();
    const exportLink = page.getByRole("link", { name: /Export/ }).first();
    await expect(exportLink).toBeVisible();
    expect(await exportLink.getAttribute("href")).toContain("/meetings/123/pdf?lang=en");
  });

  test("8. background processing is polled until completion", async ({ page }) => {
    const id = 456;
    let polls = 0;
    await page.route("**/meetings/upload", (route) =>
      route.fulfill(json(meeting({ id, title: "Untitled Meeting", status: "transcribing", summary: null, key_points: [], decisions: [], action_items: [], transcript: null }))),
    );
    await page.route(new RegExp(`/meetings/${id}$`), (route) => {
      polls += 1;
      const done = polls >= 2;
      route.fulfill(json(meeting({ id, title: done ? "Background Processed Meeting" : "Untitled Meeting", status: done ? "done" : "transcribing" })));
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Uploads" }).click();
    await page.locator("input[type='file']").setInputFiles({ name: "test.wav", mimeType: "audio/wav", buffer: Buffer.from("RIFF dummy") });
    await expect(page.locator(".rf-processing-view")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Background Processed Meeting" })).toBeVisible({ timeout: 15000 });
  });

  test("9. unauthenticated visitors see the login screen", async ({ page }) => {
    await page.route("**/auth/refresh", (route) => route.fulfill(json({ detail: "no session" }, 401)));
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.locator("#auth-email")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toHaveCount(0);
  });

  test("10. registering a new account logs the user in", async ({ page }) => {
    await page.route("**/auth/refresh", (route) => route.fulfill(json({ detail: "no session" }, 401)));
    await page.route("**/auth/register", (route) => route.fulfill(json({ access_token: "tok", token_type: "bearer", user: FAKE_USER })));
    await page.goto("/");
    await page.getByText("New here? Create an account").click();
    await page.locator("#auth-email").fill("newuser@example.com");
    await page.locator("#auth-password").fill("a-secure-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible();
  });

  test("11. a wrong password shows an error", async ({ page }) => {
    await page.route("**/auth/refresh", (route) => route.fulfill(json({ detail: "no session" }, 401)));
    await page.route("**/auth/login", (route) => route.fulfill(json({ detail: "Incorrect email or password." }, 401)));
    await page.goto("/");
    await page.locator("#auth-email").fill("test@example.com");
    await page.locator("#auth-password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toHaveCount(0);
  });

  test("12. logging out returns to the login screen", async ({ page }) => {
    await page.route("**/auth/logout", (route) => route.fulfill(json({ status: "success" })));
    await page.goto("/");
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });
});
