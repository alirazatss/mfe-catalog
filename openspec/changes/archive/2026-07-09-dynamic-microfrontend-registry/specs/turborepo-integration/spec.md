# turborepo-integration Specification

## Purpose

Integrates Turborepo for smart incremental builds, content-based caching, and parallel execution across the monorepo. Ensures only changed micro-frontends rebuild while unchanged apps are served from cache.

## ADDED Requirements

### Requirement: System SHALL use Turborepo for build orchestration

The system SHALL use Turborepo to manage builds across all workspace packages with dependency-aware execution.

#### Scenario: Turborepo builds all apps on initial run

- **WHEN** running `turbo build` for the first time
- **THEN** Turborepo SHALL build all apps in dependency order
- **AND** Turborepo SHALL cache build outputs in `.turbo/` directory
- **AND** build SHALL complete successfully

#### Scenario: Turborepo uses cache for unchanged apps

- **WHEN** running `turbo build` a second time without code changes
- **THEN** Turborepo SHALL detect no changes via content hashing
- **AND** Turborepo SHALL serve all apps from cache (no rebuilds)
- **AND** execution SHALL complete in <1 second

#### Scenario: Turborepo rebuilds only changed app

- **WHEN** changing code in `apps/mfe-widget/src/CounterWidget.ts`
- **AND** running `turbo build`
- **THEN** Turborepo SHALL rebuild mfe-widget only
- **AND** Turborepo SHALL serve mfe-dashboard from cache (if exists)
- **AND** Turborepo SHALL rebuild website (depends on mfe-widget via config generation)

### Requirement: System SHALL configure Turborepo pipeline in turbo.json

The system SHALL define task dependencies and caching behavior via `turbo.json` configuration file.

#### Scenario: Build task configured with dependencies

- **WHEN** `turbo.json` defines build task with `"dependsOn": ["^build"]`
- **THEN** Turborepo SHALL build dependencies before dependents
- **AND** micro-frontends SHALL build before host (host depends on config from all mfes)

Example configuration:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", ".vite/**"]
    }
  }
}
```

#### Scenario: Dev task configured as persistent

- **WHEN** `turbo.json` defines dev task with `"cache": false, "persistent": true`
- **THEN** Turborepo SHALL NOT cache dev mode outputs
- **AND** Turborepo SHALL allow long-running dev servers

Example configuration:

```json
{
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

#### Scenario: Custom task with specific outputs

- **WHEN** defining `generate:config` task with specific outputs
- **THEN** Turborepo SHALL cache only specified output files
- **AND** Turborepo SHALL invalidate cache when inputs change

Example configuration:

```json
{
  "pipeline": {
    "generate:config": {
      "outputs": ["apps/website/public/remotes.config.json"]
    }
  }
}
```

### Requirement: System SHALL detect changes via content hashing

The system SHALL use file content hashes (not timestamps) to determine if rebuilds are needed.

#### Scenario: Changed file triggers rebuild

- **WHEN** modifying `apps/mfe-widget/src/CounterWidget.ts`
- **THEN** Turborepo SHALL detect content hash change
- **AND** Turborepo SHALL invalidate mfe-widget cache
- **AND** Turborepo SHALL rebuild mfe-widget

#### Scenario: Unchanged file uses cache

- **WHEN** file modification timestamp changes but content identical (e.g., `touch file.ts`)
- **THEN** Turborepo SHALL detect content hash unchanged
- **AND** Turborepo SHALL use cached build

#### Scenario: Dependency change triggers rebuild

- **WHEN** `apps/mfe-widget/package.json` dependencies change
- **THEN** Turborepo SHALL detect hash change
- **AND** Turborepo SHALL rebuild mfe-widget

### Requirement: System SHALL support parallel execution

The system SHALL build multiple independent apps simultaneously when no dependencies exist.

#### Scenario: Independent apps build in parallel

- **WHEN** running `turbo build` with mfe-widget and mfe-dashboard (no cross-dependencies)
- **THEN** Turborepo SHALL build both apps in parallel
- **AND** total build time SHALL be ~max(mfe-widget, mfe-dashboard), not sum

#### Scenario: Dependent apps build sequentially

- **WHEN** website depends on mfe-widget (via config generation)
- **THEN** Turborepo SHALL build mfe-widget first
- **AND** Turborepo SHALL build website after mfe-widget completes

### Requirement: System SHALL support workspace filtering

The system SHALL allow building specific apps or patterns via `--filter` flag.

#### Scenario: Build single app

- **WHEN** running `turbo build --filter website`
- **THEN** Turborepo SHALL build only website (and its dependencies)
- **AND** other apps SHALL be skipped

#### Scenario: Build all micro-frontends

- **WHEN** running `turbo build --filter "mfe-*"`
- **THEN** Turborepo SHALL build all apps matching `mfe-*` pattern
- **AND** website SHALL be skipped

#### Scenario: Build changed apps since commit

- **WHEN** running `turbo build --filter="[HEAD^1]"`
- **THEN** Turborepo SHALL build only apps changed since previous commit
- **AND** unchanged apps SHALL use cache

### Requirement: System SHALL support remote caching (optional)

The system SHALL allow configuring remote cache for sharing build artifacts across CI and developers.

#### Scenario: Remote cache enabled with token

- **WHEN** running `turbo build --token=$TURBO_TOKEN`
- **THEN** Turborepo SHALL check remote cache for artifacts
- **AND** on cache hit, Turborepo SHALL download artifacts instead of rebuilding
- **AND** on cache miss, Turborepo SHALL build and upload artifacts

#### Scenario: Remote cache works across CI runs

- **WHEN** CI run 1 builds all apps and uploads to remote cache
- **AND** CI run 2 runs with identical code
- **THEN** CI run 2 SHALL download all artifacts from remote cache
- **AND** CI run 2 SHALL complete in seconds (no rebuilds)

#### Scenario: Local-only cache when token not provided

- **WHEN** running `turbo build` without `--token`
- **THEN** Turborepo SHALL use only local `.turbo/` cache
- **AND** remote cache SHALL be skipped

### Requirement: System SHALL integrate with existing scripts

The system SHALL replace existing `vp run -r` or `pnpm -r` commands with `turbo` commands.

#### Scenario: Build script uses Turborepo

- **WHEN** root `package.json` defines `"build": "turbo build"`
- **THEN** running `pnpm build` SHALL invoke Turborepo
- **AND** Turborepo SHALL build all workspace apps

#### Scenario: Dev script uses Turborepo

- **WHEN** root `package.json` defines `"dev": "turbo dev"`
- **THEN** running `pnpm dev` SHALL start all dev servers in parallel
- **AND** Turborepo SHALL manage process lifecycle

### Requirement: System SHALL provide cache inspection and debugging

The system SHALL expose commands for inspecting and managing cache state.

#### Scenario: Dry run shows execution plan

- **WHEN** running `turbo build --dry-run=json`
- **THEN** Turborepo SHALL output JSON showing which tasks will run
- **AND** output SHALL include cache hit/miss predictions
- **AND** no actual builds SHALL execute

Example output:

```json
{
  "tasks": [
    {
      "task": "mfe-widget#build",
      "cacheState": "HIT",
      "command": "vite build"
    },
    {
      "task": "website#build",
      "cacheState": "MISS",
      "command": "vite build"
    }
  ]
}
```

#### Scenario: Force rebuild bypasses cache

- **WHEN** running `turbo build --force`
- **THEN** Turborepo SHALL ignore cache entirely
- **AND** Turborepo SHALL rebuild all apps from scratch

#### Scenario: Clear cache manually

- **WHEN** running `rm -rf .turbo`
- **THEN** all cached artifacts SHALL be deleted
- **AND** next `turbo build` SHALL rebuild everything

### Requirement: System SHALL log cache hit/miss statistics

The system SHALL display cache performance metrics after each run.

#### Scenario: Cache statistics displayed

- **WHEN** running `turbo build`
- **THEN** Turborepo SHALL output summary: "X tasks: Y cache hits, Z cache misses"
- **AND** summary SHALL show time saved from caching

Example output:

```
Tasks:    3 successful, 3 total
Cached:   2 successful, 2 total
Time:     2.5s >>> FULL TURBO (would have been 45s without cache)
```

### Requirement: System SHALL handle gitignored outputs

The system SHALL properly cache build outputs even when gitignored.

#### Scenario: Gitignored dist folders cached

- **WHEN** `dist/` is in `.gitignore`
- **AND** `turbo.json` specifies `"outputs": ["dist/**"]`
- **THEN** Turborepo SHALL cache dist/ contents
- **AND** cache SHALL work even though dist/ not in git

### Requirement: System SHALL integrate with CI/CD environments

The system SHALL provide CI-specific optimizations and cache strategies.

#### Scenario: CI cache stored in GitHub Actions cache

- **WHEN** using Turborepo with GitHub Actions
- **AND** `.github/workflows/ci.yml` includes Turborepo cache action
- **THEN** build artifacts SHALL be stored in GitHub Actions cache
- **AND** subsequent runs SHALL restore cache

Example GitHub Actions usage:

```yaml
- name: Restore Turborepo cache
  uses: actions/cache@v3
  with:
    path: .turbo
    key: turbo-${{ runner.os }}-${{ github.sha }}
    restore-keys: turbo-${{ runner.os }}-

- name: Build with Turborepo
  run: turbo build --filter="[HEAD^1]"
```

#### Scenario: CI uses Vercel Remote Cache

- **WHEN** CI runs with `TURBO_TOKEN` environment variable
- **THEN** Turborepo SHALL use Vercel Remote Cache
- **AND** builds SHALL be shared across all CI runs and developers

### Requirement: System SHALL configure automatic outputs

The system SHALL automatically detect and cache common output directories.

#### Scenario: Vite outputs auto-detected

- **WHEN** package uses Vite for building
- **THEN** Turborepo SHALL cache `dist/` directory by default
- **AND** manual `outputs` configuration SHALL override defaults

### Requirement: System SHALL support monorepo task dependencies

The system SHALL allow tasks to depend on other tasks across packages.

#### Scenario: Config generation depends on all mfe builds

- **WHEN** website's `generate:config` task depends on `^build`
- **THEN** Turborepo SHALL build all micro-frontends first
- **AND** Turborepo SHALL generate config after all mfes ready
- **AND** Turborepo SHALL build website last

Example dependency chain:

```
mfe-widget#build → \
                     website#generate:config → website#build
mfe-dashboard#build → /
```
