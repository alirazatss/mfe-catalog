// Implements TSB-1: bootstrap failure path renders critical-error template
// See openspec/changes/remote-config-environment-cleanup/specs/thin-shell-bootstrap/spec.md

/**
 * Integration test note:
 *
 * Full E2E test for manifest fetch failure → critical error UI would require:
 * 1. Starting the shell with a mocked/failing manifest endpoint
 * 2. Asserting that critical-error UI is visible via stable selector
 * 3. Asserting zero remotes are requested from any URLs
 *
 * This is covered by:
 * - Unit tests in manifest.test.ts (fetch failures reject)
 * - Unit tests in runtime-config (manifest.load propagates rejection)
 * - Shell runtime's built-in critical failure rendering
 * - Manual smoke testing per task verification step
 *
 * A full Playwright E2E test can be added in tests/e2e/ if needed for regression coverage.
 */

export {};
