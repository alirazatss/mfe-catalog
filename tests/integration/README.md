# Runtime Integration Tests

This directory contains runtime integration tests for the micro-frontend (MFE) architecture.

## Scope

Integration tests exercise the **real runtime behavior** of the MFE system:

- **Config fetching** via HTTP (not mocked)
- **Remote script loading** via real `<script>` tags
- **Module Federation containers** loaded in Node environment
- **Lifecycle orchestration** (bootstrap → mount → unmount)
- **Error scenarios** (404 remoteEntry, missing exports, chunk failures)

## Differences from Unit Tests

| Aspect      | Unit Tests    | Integration Tests                  |
| ----------- | ------------- | ---------------------------------- |
| Environment | happy-dom     | Node (with HTTP servers)           |
| Loader      | Mocked        | Real `DynamicLoader`               |
| Network     | Mocked fetch  | Real HTTP requests                 |
| DOM         | Simulated     | Real (via happy-dom in test cases) |
| Scope       | Single module | Cross-package interactions         |

## Running Tests

```bash
# Run integration tests (requires build)
pnpm test:integration

# With coverage
pnpm test:integration --coverage

# Specific test file
pnpm vitest run tests/integration/manifest.test.ts
```

## Test Structure

```
tests/integration/
├── vitest.config.ts       # Integration test config (Node environment)
├── README.md              # This file
├── fixtures/              # Test fixtures (manifests, mock MFEs)
│   ├── valid-manifest.json
│   ├── invalid-manifest.json
│   └── mock-mfe/          # Minimal MFE for testing
├── manifest.test.ts       # Manifest loading tests
├── remote-loading.test.ts # Script loading tests
├── lifecycle.test.ts      # Mount/unmount tests
└── chunk-origin.test.ts   # Cross-origin chunk loading
```

## Fixtures

- **valid-manifest.json**: Valid chrome + features manifest
- **invalid-manifest.json**: Schema-violating manifest
- **mock-mfe/**: Minimal MFE with bootstrap/mount/unmount exports
- **404-mfe/**: Missing remoteEntry.js
- **broken-mfe/**: Missing lifecycle exports

## Coverage

Integration test coverage is merged with unit test coverage to provide a complete view of runtime code paths. See `packages/dynamic-loader/COVERAGE-AUDIT.md` for details.

## Orchestration

Integration tests are orchestrated by `scripts/test-integration.ts`:

1. Build shell + MFE packages
2. Pre-flight port availability check (4173, 4174)
3. Start static servers for shell and MFE
4. Wait for health checks (`/remoteEntry.js` 200)
5. Generate test manifest with correct ports
6. Run Vitest integration suite
7. Collect diagnostics on failure
8. Clean shutdown (frees ports on SIGINT)

## Debugging

On test failure, diagnostics are collected in `tests/integration/test-results/`:

- Server access logs
- Manifest JSON
- `remoteEntry.js` response
- Browser console errors (E2E only)

## Design Decisions

- **Node environment**: Allows real HTTP servers without browser overhead
- **No mocks**: Exercises production code paths
- **Separate coverage**: Merged with unit tests to avoid double-counting
- **Port isolation**: Different ports than E2E (4173/4174 vs 4273/4274)
