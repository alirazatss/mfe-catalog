## ADDED Requirements

<!--
Requirement IDs are stable identifiers of the form REQ-TI-<group>-<n>.
Groups:
  W = Workspace unit and component testing
  C = Coverage enforcement
  I = Runtime integration testing
  E = Browser E2E testing
  O = Test orchestration
  Q = CI quality gates
  D = Testing documentation
-->

### Requirement: REQ-TI-W-1 — Every applicable package MUST expose a test command that Turbo executes

Every workspace package that contains source code eligible for testing (`packages/auth`, `packages/auth-ui`, `packages/dynamic-loader`, `packages/events`, `packages/monorepo-tools`, `packages/remote-config`, `packages/shell-runtime`, `packages/utils`, `apps/shells/website`, `apps/mfes/mfe-widget`) SHALL define a `test` script in its `package.json`. Turbo SHALL discover and execute each `test` script when `turbo test` runs from the repository root.

#### Scenario: Root test run executes every packaged test script

- **GIVEN** the repository is cleanly installed via `pnpm install`
- **WHEN** a developer runs `pnpm test` at the repository root
- **THEN** Turbo SHALL invoke `test` in each of the ten packages listed above
- **AND** the summary line SHALL list at least ten package tasks
- **AND** the process SHALL exit with code `0` when all tests pass

#### Scenario: monorepo-tools tests participate in the root suite

- **GIVEN** `packages/monorepo-tools/src/manifest-validation.test.ts` and `manifest-generation.test.ts` exist
- **WHEN** `pnpm test` runs
- **THEN** the test output SHALL include the `@mfe-runtine/monorepo-tools#test` task
- **AND** both test files SHALL be reported as executed

#### Scenario: utils tests participate in the root suite

- **GIVEN** `packages/utils/tests/index.test.ts` exists
- **WHEN** `pnpm test` runs
- **THEN** the test output SHALL include the `utils#test` task
- **AND** the test file SHALL be reported as executed

#### Scenario: A missing package test script fails discovery

- **GIVEN** a package listed above has its `test` script removed
- **WHEN** `pnpm test` runs
- **THEN** the run SHALL exit with a non-zero code
- **OR** the CI job SHALL detect the missing script via an explicit assertion step and fail with a diagnostic naming the package

---

### Requirement: REQ-TI-W-2 — remote-config MUST test valid and invalid configuration behavior

The `packages/remote-config` package SHALL contain unit tests that exercise both accepted and rejected runtime-configuration inputs against the package's public API.

#### Scenario: Valid manifest passes validation

- **GIVEN** a JSON object that conforms to `manifest.schema.json`
- **WHEN** the remote-config validator is invoked with that object
- **THEN** the validator SHALL return a success result
- **AND** the parsed structure SHALL be observable to the caller

#### Scenario: Manifest with unknown remote-entry URL scheme is rejected

- **GIVEN** a manifest whose `entryUrl` is not a valid `https:`/`http:` URL
- **WHEN** the validator runs
- **THEN** the validator SHALL return a failure result
- **AND** the error SHALL identify the offending field path

#### Scenario: Manifest missing required chrome slot is rejected

- **GIVEN** a manifest missing the `chrome.header` entry required by the schema
- **WHEN** the validator runs
- **THEN** the validator SHALL return a failure result
- **AND** the error SHALL name the missing path (`chrome.header`)

---

### Requirement: REQ-TI-W-3 — Unit and component tests MUST be deterministic

Unit and component tests SHALL NOT rely on arbitrary wall-clock sleeps to synchronize outcomes. Timing-sensitive tests SHALL use Vitest fake timers or Testing Library's `waitFor` bounded to explicit conditions.

#### Scenario: No arbitrary sleeps in test sources

- **GIVEN** the workspace at HEAD
- **WHEN** a lint or grep audit scans `**/*.test.{ts,tsx}` for calls that block on a hard-coded delay (e.g., `new Promise(r => setTimeout(r, N))` outside a fake-timer context)
- **THEN** the audit SHALL report zero occurrences
- **AND** the CI unit-tests job SHALL fail if occurrences are introduced

#### Scenario: Async assertions use bounded conditions

- **GIVEN** a component test that waits for an async render
- **WHEN** the test observes the resulting DOM
- **THEN** the test SHALL use Testing Library `waitFor` with an explicit assertion callback
- **AND** the default timeout SHALL be observed (no arbitrary `sleep`)

---

### Requirement: REQ-TI-C-1 — Package coverage thresholds MUST be enforced by an executable root command

Running `pnpm test:coverage` at the repository root SHALL execute the workspace test suite with coverage collection enabled and SHALL enforce per-package thresholds. If any package falls below its configured thresholds, the command SHALL exit non-zero.

#### Scenario: All packages meet thresholds

- **GIVEN** every package's coverage meets or exceeds its thresholds
- **WHEN** `pnpm test:coverage` runs
- **THEN** the process SHALL exit with code `0`
- **AND** the summary SHALL show each package's statement/branch/function/line percentage

#### Scenario: One package falls below a threshold

- **GIVEN** `packages/dynamic-loader` statement coverage is 79% (threshold 80%)
- **WHEN** `pnpm test:coverage` runs
- **THEN** the process SHALL exit with a non-zero code
- **AND** the output SHALL name the failing package and the specific metric(s) that were below threshold

---

### Requirement: REQ-TI-C-2 — Shared packages SHALL meet 80/75/80/80 thresholds

The following packages SHALL enforce coverage thresholds of statements ≥ 80%, branches ≥ 75%, functions ≥ 80%, lines ≥ 80%: `auth`, `auth-ui`, `dynamic-loader`, `events`, `monorepo-tools`, `remote-config`, `shell-runtime`, `utils`.

#### Scenario: Threshold declared per package

- **GIVEN** any package listed above
- **WHEN** its `vitest.config.ts` `test.coverage.thresholds` is read
- **THEN** the values SHALL be `{ statements: 80, branches: 75, functions: 80, lines: 80 }`

#### Scenario: Threshold enforced on the failing package

- **GIVEN** `packages/dynamic-loader` currently reports statements 40.54%, branches 36.27%, functions 64.28%, lines 39.85%
- **WHEN** this change is complete and `pnpm test:coverage` runs
- **THEN** `packages/dynamic-loader` SHALL report statements ≥ 80%, branches ≥ 75%, functions ≥ 80%, lines ≥ 80%
- **AND** the coverage SHALL come from real test execution, not from adding production source files to the exclusion list

---

### Requirement: REQ-TI-C-3 — Shell and MFE apps SHALL meet 70/65/70/70 thresholds

`apps/shells/website` and `apps/mfes/mfe-widget` SHALL enforce coverage thresholds of statements ≥ 70%, branches ≥ 65%, functions ≥ 70%, lines ≥ 70%.

#### Scenario: Threshold declared per app

- **GIVEN** `apps/shells/website` or `apps/mfes/mfe-widget`
- **WHEN** its `vitest.config.ts` `test.coverage.thresholds` is read
- **THEN** the values SHALL be `{ statements: 70, branches: 65, functions: 70, lines: 70 }`

#### Scenario: App threshold enforced by coverage command

- **GIVEN** the shell's statement coverage drops to 69%
- **WHEN** `pnpm test:coverage` runs
- **THEN** the process SHALL exit non-zero
- **AND** the output SHALL name `website` and the failing metric

---

### Requirement: REQ-TI-C-4 — dynamic-loader coverage gap SHALL be closed with real tests, not exclusions

The gap between current `packages/dynamic-loader` coverage and its 80/75/80/80 threshold SHALL be closed by adding new tests (unit tests and/or runtime integration coverage) that exercise real code paths. The change SHALL NOT add source files under `packages/dynamic-loader/src` to `coverage.exclude` for the sole purpose of raising percentages.

#### Scenario: Audit precedes new tests

- **GIVEN** the current dynamic-loader coverage report
- **WHEN** the coverage audit task runs
- **THEN** the audit output SHALL categorize every uncovered branch as (a) needs test, (b) unreachable/dead code to be removed, or (c) legitimate defensive code with a documented rationale

#### Scenario: No production-code exclusions added

- **GIVEN** `packages/dynamic-loader/vitest.config.ts` at HEAD vs after this change
- **WHEN** the diff of `coverage.exclude` is inspected
- **THEN** no path under `src/**` that contains executable production code SHALL be newly excluded

#### Scenario: Runtime integration coverage feeds dynamic-loader totals

- **GIVEN** runtime integration tests exercise `DynamicLoader` end-to-end
- **WHEN** `pnpm test:coverage` runs the workspace suite followed by the integration suite with coverage merging enabled
- **THEN** the merged coverage report SHALL attribute integration-exercised branches to `packages/dynamic-loader`

---

### Requirement: REQ-TI-I-1 — Runtime integration tests MUST use real production builds served on separate origins

Runtime integration tests SHALL execute against production builds of `apps/shells/website` and `apps/mfes/mfe-widget` served on two distinct local HTTP origins. The Module Federation loader SHALL NOT be mocked in this layer.

#### Scenario: Two distinct HTTP origins are served

- **GIVEN** the runtime integration orchestration script is invoked
- **WHEN** the servers are ready
- **THEN** the shell SHALL be reachable at `http://127.0.0.1:<SHELL_PORT>`
- **AND** the MFE SHALL be reachable at `http://127.0.0.1:<MFE_PORT>` where `MFE_PORT != SHELL_PORT`
- **AND** the served files SHALL come from `apps/shells/website/dist` and `apps/mfes/mfe-widget/dist` respectively
- **AND** requesting `http://127.0.0.1:<MFE_PORT>/remoteEntry.js` SHALL return HTTP `200` with a JavaScript content type

#### Scenario: MFE loader is not mocked

- **GIVEN** the runtime integration Vitest config
- **WHEN** the test setup is inspected
- **THEN** neither `vi.mock('@module-federation/vite')` nor equivalent mocks of `packages/dynamic-loader` SHALL be in effect
- **AND** the loaded MFE SHALL be the real production bundle

---

### Requirement: REQ-TI-I-2 — Runtime integration tests MUST verify manifest loading and remote resolution

The runtime integration suite SHALL cover manifest fetch, valid-manifest load, invalid-manifest rejection, unavailable-remote handling, and recovery/fallback behavior.

#### Scenario: Manifest loaded and remote resolved

- **GIVEN** the shell serves a generated manifest pointing at the MFE origin
- **WHEN** the shell fetches the manifest and calls the loader
- **THEN** the shell SHALL issue a GET to `http://127.0.0.1:<MFE_PORT>/remoteEntry.js`
- **AND** the response body SHALL be executed
- **AND** the MFE's lifecycle module SHALL be resolvable

#### Scenario: Invalid manifest is rejected

- **GIVEN** a manifest whose `entryUrl` is not a URL string
- **WHEN** the shell attempts to load remotes
- **THEN** the loader SHALL reject with a diagnostic identifying the invalid field
- **AND** the shell test double SHALL observe an error state without a mounted MFE

#### Scenario: Remote entry is unavailable

- **GIVEN** the MFE origin returns HTTP `404` for `/remoteEntry.js`
- **WHEN** the shell attempts to load the remote
- **THEN** the loader SHALL surface a load-failure error
- **AND** the shell SHALL render its slot-level fallback UI
- **AND** no uncaught error SHALL leak out of the loader

#### Scenario: Remote asset or chunk fails to load

- **GIVEN** the MFE `remoteEntry.js` loads successfully but a referenced chunk returns HTTP `500`
- **WHEN** the shell mounts the MFE
- **THEN** the mount SHALL fail with an error attributable to the chunk URL
- **AND** the slot-level fallback UI SHALL render

#### Scenario: Recovery after transient failure

- **GIVEN** the MFE origin returned `503` on first attempt and is now healthy
- **WHEN** the shell retries the load
- **THEN** the second attempt SHALL succeed
- **AND** the MFE SHALL mount into its slot

---

### Requirement: REQ-TI-I-3 — Runtime integration tests MUST verify lifecycle transitions

The suite SHALL verify bootstrap, mount, route change, unmount, and remount behavior of the MFE through the real loader.

#### Scenario: Bootstrap and mount happen in order

- **GIVEN** an MFE loaded for the first time in the test page
- **WHEN** the loader completes
- **THEN** the MFE's `bootstrap` SHALL be observed exactly once
- **AND** `mount` SHALL be observed exactly once
- **AND** `mount` SHALL be observed after `bootstrap`

#### Scenario: Route change triggers unmount and remount

- **GIVEN** an MFE mounted at `/widgets`
- **WHEN** the test navigates to `/dashboard` and back to `/widgets`
- **THEN** `unmount` SHALL be observed after the first navigation
- **AND** a new `mount` SHALL be observed after returning
- **AND** the MFE SHALL remain functional after remount (assertable DOM present)

#### Scenario: MFE without required lifecycle exports is rejected

- **GIVEN** a fixture MFE whose exposed module lacks `mount`
- **WHEN** the loader validates exports
- **THEN** the loader SHALL reject with an error naming the missing export
- **AND** no partial mount SHALL be observable in the DOM

---

### Requirement: REQ-TI-I-4 — Generated remote chunks and assets MUST resolve from the MFE origin

Assets referenced by the MFE's `remoteEntry.js` (JS chunks, CSS, static files) SHALL be requested from the MFE origin, not the shell origin.

#### Scenario: Chunk request origin is the MFE

- **GIVEN** the MFE has been loaded
- **WHEN** the test inspects captured HTTP requests
- **THEN** every request whose path matches a chunk emitted by the MFE build SHALL target `http://127.0.0.1:<MFE_PORT>`
- **AND** no chunk SHALL be requested from `http://127.0.0.1:<SHELL_PORT>`

---

### Requirement: REQ-TI-E-1 — Browser E2E tests SHALL be implemented with Playwright

The browser E2E suite SHALL use Playwright unless a written justification for another tool is captured in `design.md` and approved. Tests SHALL be organized under `tests/e2e/`.

#### Scenario: Playwright is the installed E2E runner

- **GIVEN** the repository at HEAD
- **WHEN** `pnpm ls @playwright/test` runs
- **THEN** `@playwright/test` SHALL be resolvable
- **AND** `playwright.config.ts` SHALL exist at the E2E project root

#### Scenario: Alternative tool requires design justification

- **GIVEN** a proposal to use a non-Playwright E2E tool
- **WHEN** `design.md` is inspected
- **THEN** an "Alternatives Considered" entry SHALL name the tool and record the justification
- **AND** the CI workflow SHALL install and run that tool consistently

---

### Requirement: REQ-TI-E-2 — E2E tests MUST cover core user journeys

The E2E suite SHALL cover shell startup, MFE rendering, direct navigation to an MFE route, cross-MFE navigation, browser refresh on a nested route, and lifecycle transitions.

#### Scenario: Shell startup renders visible chrome and main slot

- **GIVEN** the shell and MFE test servers are running
- **WHEN** the browser navigates to the shell origin root
- **THEN** the page SHALL render without any uncaught browser console errors
- **AND** the main slot SHALL become non-empty within a bounded timeout (default: 10s)

#### Scenario: Direct navigation to nested MFE route

- **GIVEN** the browser has never visited the shell
- **WHEN** the browser navigates directly to `/widgets/some-id`
- **THEN** the MFE SHALL mount and render content addressable by a stable selector or role
- **AND** the URL SHALL remain `/widgets/some-id`

#### Scenario: Browser refresh on a nested MFE route

- **GIVEN** the browser is on `/widgets/some-id` after cross-MFE navigation
- **WHEN** the browser reloads
- **THEN** the MFE SHALL remount at the same route
- **AND** no uncaught browser console error SHALL be reported during reload

#### Scenario: Cross-MFE navigation via navigation bridge

- **GIVEN** the shell exposes `window.__MFE_NAVIGATION__`
- **WHEN** the test triggers navigation from `/widgets` to `/dashboard` via the bridge (or the chrome MFE UI where available)
- **THEN** the current MFE SHALL unmount
- **AND** the next MFE SHALL mount
- **AND** the URL SHALL update to `/dashboard`

---

### Requirement: REQ-TI-E-3 — E2E tests MUST cover authentication boundaries

The suite SHALL exercise protected-route behavior for both the default mocked auth boundary and a dedicated auth-flow subset that runs against a local stub token server. Live external identity providers SHALL NOT be required.

#### Scenario: Protected route with authenticated user (mocked boundary)

- **GIVEN** the Playwright fixture injects an authenticated `window.__MFE_AUTH__`
- **WHEN** the browser navigates to a protected route
- **THEN** the protected content SHALL render
- **AND** the user SHALL NOT be redirected to a login screen

#### Scenario: Protected route without authentication

- **GIVEN** no `window.__MFE_AUTH__` is injected and no valid session exists against the stub server
- **WHEN** the browser navigates to a protected route
- **THEN** the shell SHALL render the login boundary
- **AND** the URL SHALL indicate the unauthenticated state (login route or original path with a query flag) consistent with the shell's behavior

#### Scenario: Authentication required but unavailable

- **GIVEN** the auth stub server is intentionally unreachable
- **WHEN** the browser navigates to a protected route
- **THEN** the shell SHALL render an auth-unavailable state observable in the DOM
- **AND** no infinite refresh loop SHALL be observed within a bounded time window (default: 10s)

---

### Requirement: REQ-TI-E-4 — E2E tests MUST cover unavailable and malformed remotes

The suite SHALL cover a remote entry returning an HTTP error, a remote entry that loads but lacks the required lifecycle contract, and a route that does not map to an enabled MFE.

#### Scenario: Remote entry returns HTTP error

- **GIVEN** the MFE origin returns `503` for `/remoteEntry.js`
- **WHEN** the browser navigates to a route requiring that MFE
- **THEN** the shell SHALL render a slot-level fallback UI observable via a stable selector or role
- **AND** the shell SHALL remain interactive (other chrome slots do not crash)

#### Scenario: Remote loads but lacks lifecycle contract

- **GIVEN** the MFE remote resolves but its exposed module lacks `mount`
- **WHEN** the browser navigates to a route requiring that MFE
- **THEN** the shell SHALL render the slot-level fallback UI
- **AND** the browser console SHALL include an error naming the missing export
- **AND** the test SHALL assert that error message is present

#### Scenario: Route does not map to any enabled MFE

- **GIVEN** the manifest has no entry matching `/unknown-feature`
- **WHEN** the browser navigates to `/unknown-feature`
- **THEN** the shell SHALL render a not-found or equivalent unmapped-route UI
- **AND** no MFE SHALL be mounted into the main slot

---

### Requirement: REQ-TI-E-5 — E2E tests MUST include a cross-origin scenario representative of CDN hosting

At least one E2E scenario SHALL exercise shell and MFE on distinct hostnames (not just distinct ports) to simulate future CDN-hosted MFE topology.

#### Scenario: Cross-hostname load via Playwright host rules

- **GIVEN** Playwright is configured with host rules mapping `shell.test` to the shell server and `cdn.test` to the MFE server
- **WHEN** the browser navigates to `http://shell.test:<SHELL_PORT>/`
- **THEN** the MFE SHALL be fetched from `http://cdn.test:<MFE_PORT>/remoteEntry.js`
- **AND** the MFE SHALL mount successfully
- **AND** the request SHALL cross the browser's origin boundary (verifiable via captured request URLs)

---

### Requirement: REQ-TI-E-6 — E2E tests MUST collect diagnostics on failure

Failing E2E tests SHALL persist screenshot, trace, video, browser console log, and network HAR artifacts. Passing runs SHALL NOT capture large media for every test.

#### Scenario: Failing test produces required artifacts

- **GIVEN** a Playwright test that fails
- **WHEN** the run completes
- **THEN** the output directory SHALL contain a screenshot of the failure state
- **AND** a Playwright trace file
- **AND** a video recording covering the failed test
- **AND** the captured browser console log for the test
- **AND** a HAR file for the test

#### Scenario: Passing test does not persist heavy artifacts

- **GIVEN** a Playwright test that passes
- **WHEN** the run completes
- **THEN** no video or HAR file SHALL be persisted for that test
- **AND** the trace SHALL only be persisted on the first retry, not on the successful attempt

#### Scenario: Browser console error during a critical journey causes failure

- **GIVEN** any critical-journey E2E test
- **WHEN** the browser reports an uncaught error to the console during the test
- **THEN** the test SHALL fail
- **AND** the console log entry SHALL be included in the failure output

---

### Requirement: REQ-TI-I-5 — Runtime integration tests MUST collect diagnostics on failure

Failing runtime integration tests SHALL persist test server access logs, the manifest content used by the test, and the HTTP response status and body for `remoteEntry.js` fetches performed during the failing test.

#### Scenario: Failing integration test writes diagnostic bundle

- **GIVEN** a runtime integration test that fails
- **WHEN** the run completes
- **THEN** the output directory SHALL contain the test server access log for the failing test's time window
- **AND** the manifest JSON used by the failing test
- **AND** the recorded HTTP response for `remoteEntry.js` (status + body) if fetched
- **AND** any uncaught errors from the loaded MFE

---

### Requirement: REQ-TI-O-1 — The repository SHALL expose separate root commands for each test layer

`package.json` at the repository root SHALL define scripts `test` (unit + component), `test:coverage`, `test:integration` (runtime integration), `test:e2e` (Playwright), and `test:ci` (the complete verification suite).

#### Scenario: All required scripts are declared

- **GIVEN** the root `package.json`
- **WHEN** its `scripts` field is inspected
- **THEN** it SHALL contain keys: `test`, `test:coverage`, `test:integration`, `test:e2e`, `test:ci`

#### Scenario: test:ci runs the complete verification pipeline

- **GIVEN** a clean install
- **WHEN** `pnpm test:ci` runs
- **THEN** it SHALL execute in order: static checks (`vp check`), unit + component tests with coverage, production builds, runtime integration, and E2E
- **AND** it SHALL exit non-zero on the first stage that fails
- **AND** it SHALL exit `0` when all stages pass

#### Scenario: Layer commands are independently runnable

- **GIVEN** the shell and MFE builds already exist
- **WHEN** a developer runs `pnpm test:integration` in isolation
- **THEN** the command SHALL orchestrate its own builds if artifacts are missing
- **AND** SHALL run the runtime integration suite
- **AND** SHALL exit with the suite's exit code

---

### Requirement: REQ-TI-O-2 — Test servers SHALL have deterministic startup and shutdown

The integration orchestration script SHALL start required HTTP servers only when they are ready to accept requests, and SHALL shut them down cleanly whether the test suite passes, fails, or is interrupted.

#### Scenario: Servers report ready before tests execute

- **GIVEN** `pnpm test:integration` is invoked
- **WHEN** the orchestrator starts the shell and MFE servers
- **THEN** the orchestrator SHALL poll each server's origin until it returns HTTP `200` for `/`
- **AND** SHALL only invoke Vitest after both servers report ready
- **AND** SHALL time out with a diagnostic if a server does not become ready within a bounded window (default: 30s)

#### Scenario: SIGINT during tests cleans up servers

- **GIVEN** `pnpm test:integration` is running
- **WHEN** the process receives SIGINT
- **THEN** the orchestrator SHALL send termination signals to child servers
- **AND** SHALL await server exit before exiting itself
- **AND** the shell/MFE server ports SHALL be free within 5 seconds of the parent's exit

#### Scenario: Test server fails during startup

- **GIVEN** the shell build directory is missing or corrupt
- **WHEN** the orchestrator starts the shell server
- **THEN** the server SHALL exit non-zero
- **AND** the orchestrator SHALL detect the failure
- **AND** SHALL abort Vitest before it runs
- **AND** SHALL exit non-zero with a diagnostic naming the failed server

---

### Requirement: REQ-TI-O-3 — Test servers SHALL use fixed default ports with a pre-flight check

Runtime integration and E2E servers SHALL default to fixed, documented ports. The orchestrator SHALL fail fast with an actionable error if any required port is already occupied. Ports SHALL be overridable via environment variables.

#### Scenario: Default ports are used when free

- **GIVEN** all default test ports are free
- **WHEN** the integration or E2E orchestrator starts
- **THEN** the shell server SHALL bind to its default port (proposed: 4173 for integration, 4273 for E2E — actual values documented in `docs/TESTING.md`)
- **AND** the MFE server SHALL bind to its documented default port
- **AND** the generated test manifest SHALL reference the actual ports in use

#### Scenario: Pre-flight fails when default port is occupied

- **GIVEN** the shell default port is already bound by another process
- **WHEN** the orchestrator runs its pre-flight check
- **THEN** the orchestrator SHALL exit non-zero
- **AND** the error message SHALL name the occupied port
- **AND** the error message SHALL name the environment variable that overrides it

#### Scenario: Environment variable overrides default port

- **GIVEN** `SHELL_TEST_PORT=15173` and `MFE_TEST_PORT=15174` are set
- **WHEN** the orchestrator runs
- **THEN** the shell server SHALL bind to `15173`
- **AND** the MFE server SHALL bind to `15174`
- **AND** the generated manifest SHALL point at those ports

---

### Requirement: REQ-TI-O-4 — Parallel execution MUST NOT corrupt workspace state

Concurrent test execution across packages SHALL NOT corrupt pnpm links, generated manifests, ports, or build outputs.

#### Scenario: Parallel Turbo runs remain isolated per package

- **GIVEN** `turbo test` executes multiple package `test` tasks in parallel
- **WHEN** the runs complete
- **THEN** each package's `coverage/` directory SHALL be scoped to that package
- **AND** no package SHALL overwrite another's `dist/` or `node_modules/` symlinks
- **AND** the workspace lockfile SHALL be byte-identical before and after the run

#### Scenario: Integration and E2E do not share ports

- **GIVEN** default port ranges for integration and E2E are disjoint
- **WHEN** an integration run and an E2E run execute back-to-back (or a developer runs both)
- **THEN** neither run SHALL bind a port owned by the other
- **AND** the manifests generated for each SHALL point at their own range

---

### Requirement: REQ-TI-Q-1 — GitHub Actions workflow SHALL enforce the complete test pipeline

A GitHub Actions workflow SHALL exist at `.github/workflows/test.yml` that runs on pull requests and pushes to the default branch. It SHALL execute lint/type checks, unit + component tests with coverage, production builds, runtime integration tests, and E2E tests.

#### Scenario: Workflow file exists and triggers on PR

- **GIVEN** the repository at HEAD
- **WHEN** `.github/workflows/test.yml` is inspected
- **THEN** the file SHALL exist
- **AND** its `on:` section SHALL include `pull_request` and `push` for the default branch
- **AND** it SHALL install dependencies via the repository-supported Vite+ workflow (`vp install` or the equivalent `pnpm install` invocation used by Vite+)

#### Scenario: Workflow runs all required stages

- **GIVEN** the workflow executes on a PR
- **WHEN** the run completes
- **THEN** the workflow SHALL have executed jobs equivalent to: lint, type-check, unit-tests-with-coverage, build, integration, e2e, gate
- **AND** the `gate` job SHALL depend on all other test jobs succeeding

#### Scenario: Required checks block merging on failure

- **GIVEN** the E2E job fails
- **WHEN** the PR check status is inspected
- **THEN** the `gate` job SHALL be in a failing state
- **AND** the PR SHALL be blocked from merging via branch protection (documented as a required-check in `docs/TESTING.md`)

---

### Requirement: REQ-TI-Q-2 — CI caching SHALL NOT compromise correctness

The CI workflow SHALL cache the pnpm store and Playwright browser binaries only. Turbo task outputs, build artifacts, coverage reports, and test results SHALL NOT be restored from a cross-job cache.

#### Scenario: Only safe caches are declared

- **GIVEN** `.github/workflows/test.yml`
- **WHEN** its cache steps are inspected
- **THEN** the only cached paths SHALL be the pnpm store directory and the Playwright browsers directory
- **AND** no `actions/cache` step SHALL restore Turbo outputs, `dist/**`, `coverage/**`, or `test-results/**` across jobs

#### Scenario: Playwright browsers cache is keyed by Playwright version

- **GIVEN** the workflow's Playwright cache step
- **WHEN** the cache key is inspected
- **THEN** it SHALL include the resolved `@playwright/test` version so a version change invalidates the cache

---

### Requirement: REQ-TI-Q-3 — CI SHALL handle browser dependencies and artifacts explicitly

The CI workflow SHALL install Playwright browsers before the E2E job runs, upload build artifacts from the `build` job, download them in `integration` and `e2e` jobs, and upload E2E diagnostic artifacts on failure.

#### Scenario: Playwright browsers are installed before E2E

- **GIVEN** the E2E job
- **WHEN** its steps are inspected
- **THEN** a `playwright install --with-deps` step (or equivalent) SHALL run before the E2E test step
- **AND** it SHALL install only the browsers referenced by `playwright.config.ts`

#### Scenario: Build artifacts are reused across jobs

- **GIVEN** the `build` job produces `apps/shells/website/dist` and `apps/mfes/mfe-widget/dist`
- **WHEN** the workflow runs
- **THEN** the `build` job SHALL upload those directories as workflow artifacts
- **AND** the `integration` and `e2e` jobs SHALL download them before executing
- **AND** neither job SHALL re-run `turbo build`

#### Scenario: E2E diagnostics uploaded on failure

- **GIVEN** the E2E job fails
- **WHEN** the workflow post-steps run
- **THEN** the workflow SHALL upload the E2E `test-results/` directory as a workflow artifact
- **AND** the artifact SHALL be retained for the configured duration (proposed: 14 days)

---

### Requirement: REQ-TI-D-1 — docs/TESTING.md SHALL match executable configuration

`docs/TESTING.md` SHALL describe every test layer, its scope, how to run it locally, coverage thresholds actually enforced, CI behavior, and troubleshooting. It SHALL NOT reference commands, tools, or suites that do not exist in the repository.

#### Scenario: No references to non-existent commands

- **GIVEN** `docs/TESTING.md` at HEAD after this change
- **WHEN** each command shown in the doc is grepped against `package.json` files across the workspace
- **THEN** every command SHALL be resolvable to an actual script
- **AND** no reference to a "separate E2E test suite (not covered in this document)" SHALL remain unless E2E is actually documented

#### Scenario: Versions match installed dependencies

- **GIVEN** the "Test Stack" table in `docs/TESTING.md`
- **WHEN** each row is compared to `pnpm ls`
- **THEN** every version listed SHALL match (or reference the pnpm catalog if the doc uses catalog references consistently)

#### Scenario: Coverage thresholds in doc match config

- **GIVEN** the coverage-thresholds section of the doc
- **WHEN** each threshold value is compared to the corresponding `vitest.config.ts`
- **THEN** every documented number SHALL match the enforced number
- **AND** the "shared packages vs apps" split SHALL match the enforced split

#### Scenario: All test layers are documented

- **GIVEN** the doc's table of contents
- **WHEN** its sections are inspected
- **THEN** the doc SHALL contain distinct sections describing unit tests, component tests, runtime integration tests, and E2E tests
- **AND** each SHALL list its scope, environment (happy-dom / node / real browser), primary command, and typical file location
