import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_IMAGE_ID = "img1";
const TEST_SESSION_ID = "test-session-e2e";
const SESSION_URL = `/session/${TEST_IMAGE_ID}/${TEST_SESSION_ID}`;

test.describe("Session page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SESSION_URL);
    await page.waitForLoadState("networkidle");
  });

  test("session page loads without crashing", async ({ page }) => {
    // Page should not show an error boundary
    await expect(page.locator("body")).not.toContainText(
      "Something went wrong"
    );
  });

  test("canvas element is present", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 5000 });
  });

  test("start button is visible", async ({ page }) => {
    const startButton = page.getByRole("button", { name: /start/i }).first();
    await expect(startButton).toBeVisible({ timeout: 5000 });
  });

  test("clicking start transitions to recording state", async ({ page }) => {
    const startButton = page.getByRole("button", { name: /start/i }).first();
    await startButton.click();
    await page.waitForTimeout(500);

    // Either a "stop" button appears, or a "recording" indicator appears
    const hasStop = await page
      .getByRole("button", { name: /stop/i })
      .first()
      .isVisible()
      .catch(() => false);

    const hasRecordingText = await page
      .getByText("recording")
      .isVisible()
      .catch(() => false);

    expect(hasStop || hasRecordingText).toBe(true);
  });

  test("drawing strokes and stopping session shows survey", async ({ page }) => {
    // Start the session
    const startButton = page.getByRole("button", { name: /start/i }).first();
    await startButton.click();
    await page.waitForTimeout(800);

    // Draw 3 strokes on the canvas with pauses between them
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();

    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;

      // Stroke 1
      await page.mouse.move(cx - 50, cy - 50);
      await page.mouse.down();
      await page.mouse.move(cx, cy);
      await page.mouse.up();
      await page.waitForTimeout(1500);

      // Stroke 2
      await page.mouse.move(cx, cy - 30);
      await page.mouse.down();
      await page.mouse.move(cx + 60, cy + 30);
      await page.mouse.up();
      await page.waitForTimeout(1500);

      // Stroke 3
      await page.mouse.move(cx - 30, cy + 40);
      await page.mouse.down();
      await page.mouse.move(cx + 30, cy - 20);
      await page.mouse.up();
      await page.waitForTimeout(1500);
    }

    // Stop the session
    const stopButton = page.getByRole("button", { name: /stop/i }).first();
    await stopButton.click();
    await page.waitForTimeout(1000);

    // Survey / reflection form should appear
    const surveyVisible =
      (await page.getByText("Session Reflection").isVisible().catch(() => false)) ||
      (await page.getByText("Submit Reflection").isVisible().catch(() => false));

    expect(surveyVisible).toBe(true);

    // Screenshot of session-end state
    const screenshotPath = path.join(
      __dirname,
      "screenshots",
      "session-end-state.png"
    );
    await page.screenshot({ path: screenshotPath, fullPage: false });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });
});
