/**
 * Thin Shell — bootstrap entry.
 *
 * The ENTIRE shell runtime. Vanilla TypeScript; no React import.
 *
 * Responsibilities:
 *   1. Fetch and validate manifest
 *   2. Initialize TokenManager and expose `window.__MFE_AUTH__`
 *   3. Mount chrome MFEs into their slots (from `manifest.chrome`)
 *   4. Mount the feature MFE matching the current URL (from `manifest.features`)
 *   5. Listen for popstate + `mfe:navigate` events to swap feature MFEs
 *
 * Failure modes:
 *   - Manifest unreachable: render critical-error template into #app
 *   - Auth init throws: log, treat user as unauthenticated, continue
 *   - Feature MFE load fails: (temporary) log to console. Slot-level fallback UI
 *     arrives in the `graceful-failure-boundaries` change.
 *
 * See:
 *   - openspec/changes/refactor-to-thin-shell/specs/thin-shell-bootstrap/spec.md
 *   - docs/adr/0004-chrome-mfe-pattern.md
 */

import "./style.css";
import { createShellRuntime } from "@mfe-runtime/shell-runtime";
import { renderCriticalError } from "./shell/critical-error.js";
import { createWebsiteShellRuntimeConfig } from "./shell/runtime-config.js";

async function bootstrap(): Promise<void> {
  const runtime = createShellRuntime(createWebsiteShellRuntimeConfig());
  await runtime.start();

  if (import.meta.env.DEV) {
    console.log("[shell] Bootstrap complete");
  }
}

try {
  await bootstrap();
} catch (error) {
  console.error("[shell] Fatal bootstrap error:", error);
  renderCriticalError(error instanceof Error ? error.message : String(error));
}
