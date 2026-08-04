import { test, expect } from "../fixtures/index.js";

/**
 * Authentication E2E tests.
 *
 * Scenarios:
 * - Authenticated user can access protected routes
 * - Unauthenticated user is redirected/blocked from protected routes
 * - Auth unavailable state is handled gracefully
 *
 * REQ-TI-E-3
 */

test.describe("Authentication journeys", () => {
  test("authenticated user can access protected route", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/widget");

    await authenticatedPage.waitForLoadState("networkidle");

    // Assert against the shell's single main mount slot to avoid strict-mode ambiguity.
    const main = authenticatedPage.locator("#main-slot");
    await expect(main).toBeVisible();

    // Verify no auth error messages
    const authError = authenticatedPage.locator("text=/unauthorized|forbidden|login required/i");
    await expect(authError).not.toBeVisible();
  });

  // TODO: Unauthenticated redirect requires auth guard implementation in the shell
  // This test will pass once the shell implements route protection
  test.skip("unauthenticated user cannot access protected route", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/widget");

    await unauthenticatedPage.waitForLoadState("networkidle");

    // Verify redirect to login or blocked message
    // This depends on your auth implementation
    const url = unauthenticatedPage.url();

    // Either redirected to login page or shows auth required message
    const isRedirected = url.includes("/login") || url.includes("/auth");
    const hasAuthMessage = await unauthenticatedPage
      .locator("text=/login required|unauthorized|please sign in/i")
      .isVisible()
      .catch(() => false);

    expect(isRedirected || hasAuthMessage).toBeTruthy();
  });

  test("public route is accessible without auth", async ({ unauthenticatedPage }) => {
    // Assuming "/" is a public route
    await unauthenticatedPage.goto("/");

    await unauthenticatedPage.waitForLoadState("networkidle");

    // Verify page loads successfully
    const body = unauthenticatedPage.locator("body");
    await expect(body).toBeVisible();

    // Verify no auth errors
    expect(unauthenticatedPage.url()).not.toContain("error");
  });

  test("auth state persists across navigation", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/");
    await authenticatedPage.waitForLoadState("networkidle");

    // Navigate to protected route
    await authenticatedPage.goto("/widget");
    await authenticatedPage.waitForLoadState("networkidle");

    // Verify still authenticated (no redirect)
    expect(authenticatedPage.url()).toContain("/widget");

    // Navigate back
    await authenticatedPage.goto("/");
    await authenticatedPage.waitForLoadState("networkidle");

    // Verify still on homepage (not redirected to login)
    expect(authenticatedPage.url()).toMatch(/\/$|\/$/);
  });
});
