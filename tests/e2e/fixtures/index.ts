import { test as base, expect } from "@playwright/test";

/**
 * Playwright fixtures for E2E tests.
 *
 * Provides:
 * - authenticatedPage: Page with mocked auth via window.__MFE_AUTH__
 * - unauthenticatedPage: Page without auth
 * - consoleErrors: Array to capture console errors (auto-fails test on error)
 *
 * REQ-TI-E-3, REQ-TI-E-6
 */

export interface MfeAuthState {
  token: string;
  user: {
    id: string;
    email: string;
    roles: string[];
  };
  expiresAt: number;
}

export interface TestFixtures {
  authenticatedPage: typeof base extends typeof base<infer T> ? T["page"] : never;
  unauthenticatedPage: typeof base extends typeof base<infer T> ? T["page"] : never;
  consoleErrors: string[];
}

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  // Capture console errors and auto-fail on error
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const errorText = msg.text();
        errors.push(errorText);
        console.error(`[Browser Console Error] ${errorText}`);
      }
    });

    page.on("pageerror", (error) => {
      const errorText = error.message;
      errors.push(errorText);
      console.error(`[Browser Page Error] ${errorText}`);
    });

    await use(errors);

    // Auto-fail test if console errors detected
    if (errors.length > 0) {
      expect(errors, `Console errors detected: ${errors.join(", ")}`).toHaveLength(0);
    }
  },

  // Authenticated page with mocked window.__MFE_AUTH__
  authenticatedPage: async ({ page }, use) => {
    const mockAuth: MfeAuthState = {
      token: "mock-test-token",
      user: {
        id: "test-user-1",
        email: "test@example.com",
        roles: ["user"],
      },
      expiresAt: Date.now() + 3600000, // 1 hour from now
    };

    // Inject auth state before page loads
    await page.addInitScript((auth) => {
      (window as any).__MFE_AUTH__ = auth;
    }, mockAuth);

    await use(page);
  },

  // Unauthenticated page (no __MFE_AUTH__)
  unauthenticatedPage: async ({ page }, use) => {
    await use(page);
  },
});

export { expect };
