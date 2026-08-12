## Context

The monorepo already runs Vitest via Turbo (`turbo test`) with 19 files and 160 tests across seven packages. But the workspace has significant gaps: three packages contain no `test` script (`monorepo-tools`, `utils`, `remote-config`), coverage is failing hard on `dynamic-loader`, no real HTTP-boundary integration exists, no browser E2E exists, and no CI enforces any gate. `docs/TESTING.md` claims a "separate E2E test suite" that has no code behind it.

This change adds the missing layers, closes the coverage gap with real tests, and installs an enforceable CI gate — without redesigning production behavior.

## Goals / Non-Goals

**Goals:**

- Establish the full test pyramid (unit, component, runtime integration, browser E2E) with a single verification command.
- Make every applicable package's tests visible to `turbo test`.
- Enforce coverage thresholds from an executable root command that returns non-zero on failure.
- Replace mocked "integration" with real HTTP-boundary integration that builds and serves both shell and MFE.
- Provide a CI workflow with parallel jobs, artifact reuse, and a required-check gate.
- Align `docs/TESTING.md` with what the workspace actually executes.

**Non-Goals:**

- No production feature changes.
- No lowering of thresholds to pass the gate.
- No live external services in CI (Azure, real identity provider, real CDN).
- No replacement of Vite+, Turbo, Vitest, or Module Federation.
- No Turbo remote cache work — deferred as separate change.
- No archiving/rewrite of the pre-existing stale `testing-infrastructure` change proposal — this change explicitly supersedes it in scope, but leaves that proposal untouched.

## Decisions

### D1: Test pyramid layer definitions

Four distinct layers, each with a clear scope, environment, and command:

| Layer               | Scope                                  | Environment                  | Runner        | Command                      | Where                   |
| ------------------- | -------------------------------------- | ---------------------------- | ------------- | ---------------------------- | ----------------------- |
| Unit                | Pure logic in packages                 | happy-dom or node            | Vitest        | `turbo test` per package     | co-located `*.test.ts`  |
| Component           | React component behavior               | happy-dom + RTL              | Vitest        | `turbo test` per app/package | co-located `*.test.tsx` |
| Runtime integration | Real HTTP, real MF loader, prod builds | node + fetch/JSDOM harness   | Vitest (root) | `pnpm test:integration`      | `tests/integration/**`  |
| Browser E2E         | Full user journeys, real browser       | Chromium (+ optional others) | Playwright    | `pnpm test:e2e`              | `tests/e2e/**`          |

The distinction between "component" and "runtime integration" is crucial: **component tests are in-process with mocks; runtime integration tests speak HTTP and never mock the loader.** This is the exact gap the current workspace has.

### D2: Package-level test script and threshold policy

- All eight packages (auth, auth-ui, dynamic-loader, events, monorepo-tools, remote-config, shell-runtime, utils) share the same threshold tier: **statements ≥ 80%, branches ≥ 75%, functions ≥ 80%, lines ≥ 80%.**
- Both apps (`website`, `mfe-widget`) share: **statements ≥ 70%, branches ≥ 65%, functions ≥ 70%, lines ≥ 70%.**
- Every package gets `test` and `test:coverage` scripts. Missing scripts cause Turbo to silently skip — this is the root cause of `monorepo-tools` and `utils` being invisible today.

### D3: dynamic-loader coverage recovery strategy

Current gap is ~40 percentage points on statements/lines. Approach:

1. **Audit first**: categorize every uncovered branch as (a) needs test, (b) dead code, (c) documented defensive code.
2. **Write real unit tests** for validation, error paths, edge cases.
3. **Merge runtime integration coverage** so end-to-end paths through the loader count toward the package's coverage totals (Vitest V8 provider supports coverage merging via `test.coverage.reportOnFailure` and a shared output directory).
4. **Explicit prohibition**: no new entries under `packages/dynamic-loader/src/**` in `coverage.exclude` — this is asserted by REQ-TI-C-4.

### D4: Runtime integration orchestration

A dedicated orchestration script `scripts/test-integration.ts` owns the full lifecycle:

```
build shell + MFE
  → pre-flight port check
    → start MFE static server (background)
      → wait for /remoteEntry.js 200
        → start shell static server (background)
          → wait for / 200
            → generate test manifest pointing at MFE port
              → run vitest --config tests/integration/vitest.config.ts
                → collect diagnostics on failure
              → teardown (SIGTERM + await)
```

**Why a dedicated script, not Vitest globalSetup:**

- Global setup runs inside Vitest's worker model, making clean SIGINT handling and multi-server orchestration awkward.
- A script gives us a single, debuggable entry point that developers can trace when something goes wrong.
- It composes naturally with `test:ci` and with CI job steps.

**Static server choice:** `vite preview` (already installed) satisfies the requirement of serving a production build. If pointer-precise header control is needed later, a small `sirv` config can replace it — this is not required to satisfy the current requirements.

### D5: E2E orchestration

Playwright's `webServer` config manages server lifecycle for E2E — this is the idiomatic path and gives us:

- Automatic teardown when the Playwright run ends (crash, pass, or fail).
- Ready-checking via `url` polling.
- Reuse of the same builds produced by the `build` step.

The E2E `webServer` config points at the same static-server command as the integration layer, but on a different port range so both suites can coexist.

### D6: Port allocation

Fixed defaults with pre-flight check and environment overrides. Chosen ports use two disjoint ranges so integration and E2E cannot collide:

- **Integration:** shell `4173` (Vite's default preview port; already documented), MFE `4174`.
- **E2E:** shell `4273`, MFE `4274`.

Environment overrides: `SHELL_TEST_PORT`, `MFE_TEST_PORT`, `SHELL_E2E_PORT`, `MFE_E2E_PORT`.

If a port is occupied, the orchestrator exits non-zero with a message like:

```
error: port 4173 is already in use.
       set SHELL_TEST_PORT to override, or free the port.
```

This directly satisfies REQ-TI-O-3 and the edge case "Port is already occupied."

### D7: Cross-origin strategy — layered

- **Runtime integration** uses different ports on `127.0.0.1`. The MF loader contract, manifest resolution, and remoteEntry fetching are all validated at HTTP level; happy-dom/JSDOM's origin model is sufficient here.
- **E2E** uses Playwright's [`--host-rules`](https://playwright.dev/) equivalent (`use: { extraHTTPHeaders`, or the network `route` API, or launching Chromium with `--host-rules`) to remap `shell.test → 127.0.0.1:<SHELL_E2E_PORT>` and `cdn.test → 127.0.0.1:<MFE_E2E_PORT>`. This gives us real cross-origin behavior in the browser (CORS preflights, SameSite cookies, credential handling) without touching `/etc/hosts` or requiring sudo.

The layered approach matches the pyramid: cheap tests validate the MF contract, expensive tests validate real browser cross-origin behavior.

### D8: E2E authentication strategy

Two-track:

1. **Default:** Playwright fixture injects `window.__MFE_AUTH__` via `page.addInitScript` before each test that needs an authenticated user. A storage-state fixture is captured once per project and reused for fast startup.
2. **Auth-specific subset:** A dedicated Playwright project runs against a local stub token server (small Node HTTP server), exercising real HTTP auth flow: unauthenticated redirect, token refresh, 401 handling, auth-unavailable.

No live identity provider. No production credentials. Fully hermetic in CI.

### D9: Diagnostics — layered

**Runtime integration failures** persist to `tests/integration/test-results/<test-id>/`:

- test server access log (time-windowed to the failure)
- manifest JSON used
- HTTP response status/body for `remoteEntry.js` fetches
- uncaught errors from the loaded MFE

**E2E failures** use Playwright's built-in artifact collection tuned to:

- `screenshot: 'only-on-failure'`
- `trace: 'on-first-retry'`
- `video: 'retain-on-failure'`
- console log captured per test via `page.on('console')`, persisted alongside failure
- HAR via `page.context().route()` recording, persisted only on failure

Passing tests do not persist heavy media. This satisfies REQ-TI-E-6 while keeping cost bounded.

### D10: Command surface

Chosen (Option C from alignment):

```
test              → turbo test                       (unit + component)
test:watch        → turbo test -- --watch             (existing)
test:coverage     → turbo test -- --coverage         (coverage gate)
test:integration  → tsx scripts/test-integration.ts  (runtime integration)
test:e2e          → playwright test                  (E2E)
test:ci           → vp check && turbo test -- --coverage \
                    && turbo build \
                    && pnpm test:integration \
                    && pnpm test:e2e
ready             → alias for the local pre-push equivalent
```

Existing `test`, `test:watch`, `test:coverage`, `test:ui` semantics preserved to avoid breaking developer muscle memory or tooling. The `ready` script is updated to match `test:ci` so `ready` is truthful.

### D11: CI job graph

```
             ┌── lint ───────────┐
             │                   │
install ────┼── type-check ─────┼── build ──┬── integration ──┐
             │                   │            │                │
             └── unit+coverage ──┘            └── e2e ─────────┴── gate
```

- **install** provisions dependencies (pnpm store cache hits here).
- **lint, type-check, unit+coverage** run in parallel; all three depend only on install.
- **build** runs `turbo build` and uploads `apps/shells/website/dist` + `apps/mfes/mfe-widget/dist` as workflow artifacts. It depends on unit+coverage passing (no reason to build if unit tests are broken).
- **integration** downloads build artifacts, runs `pnpm test:integration`.
- **e2e** downloads build artifacts, installs Playwright browsers (cache hit expected), runs `pnpm test:e2e`.
- **gate** depends on lint, type-check, unit+coverage, build, integration, e2e all succeeding. This is the single required check for branch protection.

Failures in any node block the gate, which blocks merge.

### D12: CI caching — safe by construction

Only two caches are declared:

1. **pnpm store** — content-addressed, immutable, keyed by lockfile hash.
2. **Playwright browsers** — pinned by `@playwright/test` version.

Explicitly NOT cached: Turbo task outputs, `dist/**`, `coverage/**`, `test-results/**`, `node_modules/**` (pnpm store cache + fresh install is faster and safer than caching `node_modules` in a monorepo).

Turbo's in-run local cache still speeds up the build/test steps within a single job. Nothing depends on cross-job cache for correctness.

### D13: Superseding the stale `testing-infrastructure` change

The pre-existing `testing-infrastructure` change proposal is stale: it explicitly defers E2E and CI, describes a "zero test coverage" starting state that no longer holds, and has 0/128 tasks completed. This change replaces its scope but leaves the artifact in place. The non-goal "Do not modify unrelated OpenSpec changes" is honored. Archiving the stale change is a follow-up decision for a different change.

## Risks / Trade-offs

**R1: dynamic-loader coverage may require refactoring for testability.**
The 40% starting point suggests significant untested branches. Some may be inside internal implementation that resists unit-testing. Mitigation: audit task (REQ-TI-C-4 scenario) will flag such branches early; combining unit + runtime integration coverage gives two ways to reach threshold without production changes.

**R2: Playwright adds ~500MB of browser binaries.**
Mitigation: cache Playwright browsers keyed by version; install only Chromium by default. If cross-browser coverage is later required, add other projects as a separate change.

**R3: Runtime integration tests are slower than unit tests.**
Expected time budget: build (~30-60s cold) + serve (~1-2s) + run (~10-30s). Mitigation: run in parallel job with cached build artifacts from the `build` job. Developer-side: `pnpm test` remains fast; integration only runs on demand or in CI.

**R4: Port conflicts on developer machines.**
Mitigation: pre-flight check with actionable error + env overrides (REQ-TI-O-3).

**R5: Adding `test` scripts to `monorepo-tools`/`utils`/`remote-config` may expose latent test failures.**
This is the intended outcome — hidden tests should participate. Mitigation: the change tasks include running each newly-participating suite once and fixing any real failures before enforcing the gate.

**R6: docs/TESTING.md drift can recur.**
Mitigation: REQ-TI-D-1 scenarios include grep-based checks (commands must resolve to real scripts, versions must match). Consider a future doc-lint job; out of scope here.

**R7: E2E can be flaky.**
Mitigation: enforce deterministic waits (REQ-TI-W-3 spirit extended to E2E — no arbitrary sleeps), retry once with trace enabled, capture full diagnostics, treat any browser console error as a failure (REQ-TI-E-6) to surface flake root causes.

## Alternatives Considered

**A1: Use Cypress instead of Playwright.**
Rejected: Playwright's multi-context support, native cross-origin handling via host rules, and Node-based worker model align better with the MFE cross-origin requirement. No blocker discovered during alignment.

**A2: Vitest globalSetup for integration server lifecycle.**
Rejected: harder to compose with `test:ci`, harder to reason about SIGINT handling across multiple servers, and less debuggable when startup fails.

**A3: Docker Compose for test environments.**
Rejected: overkill for local dev, adds a Docker dependency to CI, slower cold start, no requirement drives it.

**A4: Turbo remote cache in CI.**
Rejected for this change: adds infrastructure dependency, and the requirement "correctness MUST NOT depend on cached output" is best satisfied by not caching Turbo outputs at all. Revisit as a separate change if CI cost becomes an issue.

**A5: Dynamic port allocation.**
Rejected: fixed defaults with pre-flight check give better error messages, deterministic behavior, and simpler manifest generation. Env override covers parallel-CI cases.

**A6: Archive the stale `testing-infrastructure` change as part of this change.**
Rejected: violates the "do not modify unrelated OpenSpec changes" non-goal. Archiving is a separate decision.
