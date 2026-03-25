import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Visual regression baseline suite.
 *
 * Each test navigates to a major view, waits for it to settle, and takes a
 * full-page screenshot saved to tests/screenshots/.
 *
 * To update baselines after an intentional UI change:
 *   pnpm test:e2e --update-snapshots
 *
 * These screenshots are committed to git as baselines.
 */

const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");

test.describe("Visual regression baselines", () => {
  test("gallery view baseline", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for images to render
    await page.waitForTimeout(500);

    const screenshotPath = path.join(SCREENSHOTS_DIR, "visual-gallery.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);

    // Snapshot comparison (updates with --update-snapshots)
    await expect(page).toHaveScreenshot("visual-gallery.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("session canvas view baseline", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/session/img1/test-visual-baseline");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const screenshotPath = path.join(SCREENSHOTS_DIR, "visual-session-canvas.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);

    await expect(page).toHaveScreenshot("visual-session-canvas.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
