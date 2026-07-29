## Why

The monorepo has partial test coverage but no defensible quality gate. Verified state (July 2026):

- The root suite executes 19 test files and 160 tests across seven packages.
- `packages/monorepo-tools` and `packages/utils` contain test files but expose no `test` script, so Turbo never runs them.
- `packages/remote-config` has no directly executed test suite.
- `packages/dynamic-loader` coverage is well below the configured thresholds: statements 40.54% vs 80%, branches 36.27% vs 75%, functions 64.28% vs 80%, lines 39.85% vs 80%. The coverage gate is configured but the workspace does not fail on this today.
- No real integration layer exists that builds the shell and an MFE, serves them on separate HTTP origins, and loads the generated `remoteEntry.js`. Shell lifecycle, manifest, auth, navigation, and event flows are only tested in-process with mocks.
- There is no Playwright or Cypress installation, no `test:e2e`, no `test:integration`, and no GitHub Actions workflow.
- `docs/TESTING.md` references an E2E suite that does not exist, outdated versions, and commands that no longer match the workspace.

This change replaces the stale, deferred `testing-infrastructure` change proposal (which explicitly deferred E2E and CI, and described a "zero test coverage" starting state that is no longer accurate) with a complete test pyramid: unit, component, runtime integration, and browser E2E, plus a CI gate and accurate documentation.

## What Changes

- Add missing `test` scripts to `packages/monorepo-tools`, `packages/utils`, and `packages/remote-config` so Turbo executes them under `turbo test`.
- Add `packages/remote-config` unit tests covering valid and invalid runtime configuration behavior.
- Close the `packages/dynamic-loader` coverage gap through targeted unit tests plus runtime integration coverage collection (no production-code exclusions to inflate numbers).
- Introduce a new **runtime integration** test layer: production builds of `apps/shells/website` and `apps/mfes/mfe-widget` served on separate HTTP origins with a generated manifest; tests load `remoteEntry.js` through the real dynamic loader without mocking Module Federation.
- Introduce a new **browser E2E** layer using Playwright covering shell startup, MFE rendering, cross-MFE navigation, direct navigation, browser refresh on nested routes, lifecycle transitions, protected routes, unavailable/malformed remotes, and a cross-origin scenario representative of future CDN hosting.
- Introduce root commands `test:integration`, `test:e2e`, and `test:ci`; keep `test`, `test:watch`, `test:coverage` semantics; update `ready` to reflect the complete verification suite.
- Add a GitHub Actions workflow with parallel jobs (`lint`, `type-check`, `unit-tests-with-coverage`, `build`, `integration`, `e2e`, `gate`) using pnpm store + Playwright browser caches only. Turbo task outputs are not cached across jobs.
- Rewrite `docs/TESTING.md` to match actual versions, scripts, layers, thresholds, CI behavior, and troubleshooting; remove references to test suites and commands that do not exist.

## Capabilities

### New Capabilities

- `testing-infrastructure`: The complete workspace testing capability — layer definitions (unit, component, runtime integration, E2E), package-level test scripts, coverage gate, test orchestration, CI quality gates, and testing documentation.

### Modified Capabilities

<!-- No existing published specs are being modified. This change supersedes the stale in-flight `testing-infrastructure` change proposal (0/128 tasks, deferred E2E/CI). -->

## Impact

**Code:**

- `packages/monorepo-tools/package.json` — add `test`, `test:coverage`; add `vitest.config.ts`.
- `packages/utils/package.json` — add `test`, `test:coverage`; add `vitest.config.ts`.
- `packages/remote-config/package.json` — add `test`, `test:coverage`; add `vitest.config.ts` and new tests under `src/**`.
- `packages/dynamic-loader/` — new tests closing coverage gaps; no production exclusions added.
- `tests/integration/` — new top-level runtime integration suite with orchestration script, fixture manifests, and Vitest config using node environment.
- `tests/e2e/` — new top-level Playwright project (config, fixtures, storage-state seeding, auth stub server, host-rules cross-origin config).
- `scripts/test-integration.ts` — new orchestration script (build → port pre-flight → serve → run vitest → teardown).
- Root `package.json` — new/updated scripts (`test:integration`, `test:e2e`, `test:ci`, updated `ready`).
- Root `turbo.json` — task graph updated so `test:coverage`, `test:integration`, `test:e2e` participate correctly.
- `.github/workflows/test.yml` — new CI workflow.
- `docs/TESTING.md` — rewritten.

**Dependencies:**

- Add `@playwright/test` as a dev dependency at the workspace root or dedicated test package.
- Add a small HTTP static server dev dependency (e.g., `sirv` or reuse `vite preview`) if a dedicated static server is required for runtime integration tests.
- No new production dependencies.

**CI/CD:**

- New GitHub Actions workflow enforces lint, type-check, unit + component + coverage, production builds, runtime integration, and E2E.
- Required-check gate job blocks merge.

**Documentation:**

- `docs/TESTING.md` is authoritative and matches executable configuration.
- The stale `testing-infrastructure` change proposal remains in place; archiving it is explicitly out of scope of this change per the "do not modify unrelated OpenSpec changes" non-goal.

**Non-goals:**

- Do not redesign production shell or MFE behavior beyond minimal testability shims.
- Do not add application features.
- Do not change deployment infrastructure beyond CI/test simulation.
- Do not lower coverage thresholds to pass the gate.
- Do not require live Azure resources or production credentials in normal CI.
- Do not replace Vite+, Turbo, Vitest, or Module Federation.
- Do not modify the existing stale `testing-infrastructure` change proposal.

**Unresolved decisions (flagged, not invented):**

- Exact default port numbers for integration (proposed: shell 4173, MFE 4174) and E2E (proposed: shell 4273, MFE 4274). Overridable via env.
- CI artifact retention duration (proposed: 14 days).
- Whether `test:ci` runs `vp check` as its first step (proposed: yes, mirrors `ready`).
