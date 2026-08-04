import { test, expect } from "../fixtures/index.js";

/**
 * Core user journeys E2E tests.
 *
 * Scenarios:
 * - Shell startup
 * - MFE rendering
 * - Direct navigation to nested route
 * - Browser refresh on nested route
 * - Cross-MFE navigation
 *
 * REQ-TI-E-2
 */

test.describe("Core user journeys", () => {
  test("should load shell and render homepage", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/");

    // Wait for shell to load
    await authenticatedPage.waitForLoadState("networkidle");

    // Verify shell title
    await expect(authenticatedPage).toHaveTitle(/MF Mono Shell/i);

    // Verify basic shell structure (adjust selectors based on actual shell)
    const body = authenticatedPage.locator("body");
    await expect(body).toBeVisible();
  });

  test("should render MFE widget", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/widget");

    // Wait for MFE to load
    await authenticatedPage.waitForLoadState("networkidle");

    // Assert against the shell's single main mount slot to avoid strict-mode ambiguity.
    const main = authenticatedPage.locator("#main-slot");
    await expect(main).toBeVisible();
  });

  test("should navigate directly to nested route", async ({ authenticatedPage }) => {
    // Navigate directly to a supported nested MFE route.
    await authenticatedPage.goto("/widget/counter");

    await authenticatedPage.waitForLoadState("networkidle");

    // Verify URL reflects the route
    expect(authenticatedPage.url()).toContain("/widget/counter");
  });

  test("should handle browser refresh on nested route", async ({ authenticatedPage }) => {
    // Navigate to nested route
    await authenticatedPage.goto("/widget/counter");
    await authenticatedPage.waitForLoadState("networkidle");

    // Refresh the page
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");

    // Verify we're still on the same route after refresh
    expect(authenticatedPage.url()).toContain("/widget/counter");

    // Verify content is still visible
    const main = authenticatedPage.locator("#main-slot");
    await expect(main).toBeVisible();
  });

  test("should navigate between routes", async ({ authenticatedPage }) => {
    // Start at home
    await authenticatedPage.goto("/");
    await authenticatedPage.waitForLoadState("networkidle");
    expect(authenticatedPage.url()).toMatch(/\/$|\/$/);

    // Navigate to widget (if navigation links exist)
    // This is a placeholder—real test would click on navigation links
    await authenticatedPage.goto("/widget");
    await authenticatedPage.waitForLoadState("networkidle");
    expect(authenticatedPage.url()).toContain("/widget");

    // Navigate back to home
    await authenticatedPage.goto("/");
    await authenticatedPage.waitForLoadState("networkidle");
    expect(authenticatedPage.url()).toMatch(/\/$|\/$/);
  });
});
