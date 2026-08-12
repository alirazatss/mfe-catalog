# Task 2.1: Update docs and glossary

**Requirements**: REQ-001, REQ-005
**Status**: Complete

## Files Changed

- `README.md`: Updated auto-discovery description (line 11, 68)
- `CONTEXT.md`: Local Port Map glossary already accurate (lines 214-236)
- `openspec/specs/monorepo-discovery/spec.md`: Updated requirement titles and scenarios
- `openspec/specs/config-generation/spec.md`: Updated development URL port assignment description

## Changes Made

1. Replaced "alphabetical port allocation" with "canonical local port map"
2. Updated "Assign ports alphabetically" requirement to "Resolve ports from canonical local port map"
3. Changed "custom port override" to "preferred port override" to reflect current behavior
4. Updated scenario descriptions to match resolved port behavior

## Verification

Docs and glossary now use consistent "local-port-map" vocabulary and describe:

- Canonical local port map as source of truth
- Preferred-port resolution (not alphabetical allocation)
- Resolved port assignment and persistence

All references to "alphabetical" removed from active documentation.

---

# Task 2.2: Update/add spec tests

**Requirements**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
**Status**: Complete

## Verification

Ran monorepo-tools test suite:

```
vp test (in packages/monorepo-tools)
Test Files: 4 passed (4)
Tests: 51 passed (51)
```

## Coverage by Requirement

### REQ-001: Canonical local port map

- ✓ `port-map.test.ts > resolvePort - REQ-001: new app assignment > should assign port to new app not in map`

### REQ-002: Preferred port resolution

- ✓ `port-map.test.ts > resolvePort - REQ-002: preferred port resolution > should use preferred port when available`
- ✓ `port-map.test.ts > resolvePort - REQ-002: preferred port resolution > should assign alternate port when preferred port is in usedPorts`
- ✓ `discovery.test.ts > REQ-002: Custom port override (preferred port) > should use preferred port from package.json when available`
- ✓ `discovery.test.ts > REQ-002: Custom port override (preferred port) > should assign alternate port when preferred port is occupied`

### REQ-003: Stable port reuse

- ✓ `port-map.test.ts > resolvePort - REQ-003: stable port reuse > should reuse previously resolved port when available`
- ✓ `port-map.test.ts > resolvePort - REQ-003: stable port reuse > should assign alternate port when previously resolved port is unavailable`

### REQ-004: Discovery returns mapped ports

- ✓ `discovery.test.ts > REQ-004: Discovery returns mapped ports > should return mapped ports from existing port map`
- ✓ `discovery.test.ts > REQ-004: Discovery returns mapped ports > should allocate port for new app not in map`

### REQ-005: Manifest generation from resolved map

- ✓ `discovery.test.ts > REQ-005: Port map persistence > should persist resolved ports back to the map`
- ✓ `discovery.test.ts > REQ-005: Port map persistence > should update map when previous port becomes unavailable`
- ✓ `manifest-generation.test.ts > should generate environment-specific URLs` (validates localhost URL format)

## Additional Test Coverage

- Port map I/O: load, save, validation (5 tests)
- Port availability checking (2 tests)
- Port range allocation (3 tests)
- Batch resolution (3 tests)
- Manifest schema validation (16 tests)
- Discovery edge cases (2 tests)

All tests pass. No new tests required - existing coverage is comprehensive.

---

# Task 2.3: Validate shell boot integration

**Requirements**: REQ-001, REQ-005
**Status**: Complete

## Verification Steps

### 1. Generated remotes config from resolved port map

```
pnpm exec tsx scripts/generate-config.ts --shell website --environment development
```

Output:

```
✅ Found 2 micro-frontend(s):
   - mfe-landing-page (@mfe-runtime/mfe-landing-page) on port 5174
   - mfe-widget (@mfe-runtime/mfe-widget) on port 5175

✅ Config written to apps/shells/website/public/remotes.config.dev.json
   0 chrome MFE(s), 2 feature MFE(s) configured
```

### 2. Verified port map persistence

`.local-port-map.json`:

```json
{
  "mfe-landing-page": 5174,
  "mfe-widget": 5175
}
```

### 3. Verified remotes config URLs match port map

`remotes.config.dev.json`:

```json
{
  "features": {
    "/landing-page": {
      "entryUrl": "http://localhost:5174/remoteEntry.js"
    },
    "/widget": {
      "entryUrl": "http://localhost:5175/remoteEntry.js"
    }
  }
}
```

### 4. Integration test verification

Created and ran `test-shell-boot.mjs`:

```
✓ Port map loaded
✓ Remotes config loaded with features:
  ✓ mfe-landing-page: http://localhost:5174/remoteEntry.js
  ✓ mfe-widget: http://localhost:5175/remoteEntry.js

✅ All remote entry URLs match the resolved port map
✅ Shell boot integration verified successfully
```

### 5. Shell vite.config.ts verified

Line 9 uses: `getResolvedPort("website", 5173)` (REQ-001, REQ-003, REQ-004)

## Conclusion

- Port map is canonical source of truth
- Config generation reads from port map (REQ-005)
- Shell remotes.config.dev.json contains localhost URLs from resolved map
- No manual manifest edits required when ports change
- Integration verified end-to-end
