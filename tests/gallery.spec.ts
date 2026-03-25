import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe("Gallery page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("loads at / with status 200", async ({ page }) => {
    const response = await page.request.get("/");
    expect(response.status()).toBe(200);
  });

  test("gallery catalogue panel is visible", async ({ page }) => {
    const catalogue = page.locator(".gallery-content > div").first();
    await expect(catalogue).toBeVisible();
  });

  test("gallery detail panel is visible", async ({ page }) => {
    const detail = page.locator(".gallery-content > div").last();
    await expect(detail).toBeVisible();
  });

  test("detail panel shows placeholder text before interaction", async ({ page }) => {
    await expect(
      page.getByText("Hover over an image or session to see details here.")
    ).toBeVisible();
  });

  test("image tiles are present in the catalogue", async ({ page }) => {
    const tiles = page.locator(".gallery-image-container");
    await expect(tiles.first()).toBeVisible();
    const count = await tiles.count();
    expect(count).toBeGreaterThan(0);
  });

  test("hovering an image tile updates the detail panel", async ({ page }) => {
    const firstTile = page.locator(".gallery-image-container").first();
    await firstTile.hover();
    await page.waitForTimeout(300);

    // After hovering, placeholder should no longer be visible and detail should show image content
    const placeholder = page.getByText(
      "Hover over an image or session to see details here."
    );
    await expect(placeholder).not.toBeVisible();
  });

  test("screenshot baseline — gallery desktop (1280x800)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const screenshotPath = path.join(
      __dirname,
      "screenshots",
      "gallery-baseline.png"
    );
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // Verify file was written
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });
});
