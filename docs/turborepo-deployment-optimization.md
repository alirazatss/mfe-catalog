# Turborepo Integration for MFE Deployments

## Overview

This document explains how Turborepo optimizes the MFE deployment workflow by intelligently detecting changes and caching builds.

## Key Benefits

### 1. Intelligent Change Detection

**Before (Git Diff)**:

```bash
# Manual git diff parsing
git diff --name-only HEAD^ HEAD | grep '^apps/mfes/mfe-' | cut -d/ -f3
```

**After (Turborepo)**:

```bash
# Turborepo understands package dependencies
turbo build --dry-run --filter='[HEAD^1]'
```

**Why Better?**

- Turborepo understands `package.json` dependencies
- Detects when shared packages changed (e.g., `@mfe-runtime/dynamic-loader`)
- Automatically includes dependent MFEs
- Respects `turbo.json` configuration

### 2. Build Caching

**Before**:

- Every workflow run rebuilds everything from scratch
- Shared dependencies rebuilt for each MFE
- No cache between workflow runs

**After (Turborepo)**:

- Local cache: Reuses builds from previous commits
- Remote cache (optional): Share cache across machines
- Incremental builds: Only rebuild what changed
- Dependency cache: Shared packages built once

**Performance Gains**:

```
Scenario: Modify mfe-widget only

Before (No Cache):
- Install deps: 60s
- Build dynamic-loader: 15s
- Build events: 10s
- Build mfe-widget: 20s
Total: 105s

After (Turborepo Cache):
- Install deps: 60s
- Build dynamic-loader: 0s (cached)
- Build events: 0s (cached)
- Build mfe-widget: 20s
Total: 80s (24% faster)

After (Turborepo + No Code Change):
- Install deps: 60s
- Build mfe-widget: 0s (cached)
Total: 60s (43% faster)
```

### 3. Dependency-Aware Deployment

**Scenario**: You modify `packages/dynamic-loader`

**Before (Git Diff)**:

```bash
# Git diff only sees:
changed: packages/dynamic-loader/src/loader.ts

# Workflow deploys: Nothing (no MFE changed)
# Problem: MFEs using old dynamic-loader!
```

**After (Turborepo)**:

```bash
# Turborepo sees:
changed: packages/dynamic-loader/src/loader.ts

# Turborepo knows:
dependent: mfe-widget (uses @mfe-runtime/dynamic-loader)
dependent: mfe-landing-page (uses @mfe-runtime/dynamic-loader)

# Workflow deploys: mfe-widget, mfe-landing-page (both in parallel)
# Correct: All dependent MFEs rebuilt with new dynamic-loader
```

### 4. Parallel Builds with Smart Concurrency

**turbo.json Configuration**:

```json
{
  "concurrency": "12",
  "tasks": {
    "build": {
      "dependsOn": ["^build"]
    }
  }
}
```

Turborepo automatically:

- Builds independent packages in parallel
- Respects dependency order (`^build` means "build dependencies first")
- Uses available CPU cores efficiently

## Workflow Comparison

### Current Workflow (Git-Based)

```yaml
detect-changed-mfes:
  steps:
    - run: |
        # Manual git diff parsing
        CHANGED_FILES=$(git diff --name-only HEAD^ HEAD)

        # Check if shared packages changed
        if echo "$CHANGED_FILES" | grep -qE '^packages/(dynamic-loader|events)/'; then
          # Deploy all MFEs manually
          echo "matrix={\"mfe\":[\"mfe-widget\",\"mfe-landing-page\"]}" >> $GITHUB_OUTPUT
        else
          # Detect changed MFEs manually
          CHANGED_MFES=$(echo "$CHANGED_FILES" | grep '^apps/mfes/mfe-' | cut -d/ -f3)
          echo "matrix={\"mfe\":$CHANGED_MFES}" >> $GITHUB_OUTPUT
        fi
```

**Problems**:

- Manual parsing of git output
- Hardcoded shared package list
- No understanding of `package.json` dependencies
- Miss transitive dependencies

### Turborepo Workflow

```yaml
detect-changed-mfes-turbo:
  steps:
    - run: |
        # Turborepo handles everything
        turbo build --dry-run --filter='[HEAD^1]' 2>&1 | grep "apps/mfes"
```

**Benefits**:

- Turborepo reads `package.json` automatically
- Understands dependency graph
- Detects transitive dependencies
- No hardcoded lists to maintain

## Advanced Turborepo Features

### 1. Remote Caching (Optional)

Enable shared cache across CI runs and team members:

```bash
# In GitHub Actions
- name: Build with remote cache
  run: turbo build --filter="${{ matrix.mfe }}" --token=${{ secrets.TURBO_TOKEN }}
  env:
    TURBO_TEAM: your-team
```

**Benefits**:

- PR builds reuse cache from main branch
- Multiple workflow runs share cache
- Developer builds reuse CI cache

### 2. Scoped Builds

```bash
# Build only packages that changed since last deploy tag
turbo build --filter='...[last-deploy]'

# Build only MFEs (no packages)
turbo build --filter='./apps/mfes/*'

# Build specific MFE and its dependencies
turbo build --filter='@mfe-runtime/mfe-widget...'
```

### 3. Output Logs Control

```yaml
# Only show logs for packages that rebuilt (not cached)
- run: turbo build --output-logs=new-only
```

**Before**: 1000 lines of logs for cached builds  
**After**: Only logs for what actually rebuilt

### 4. Dependency Graph Visualization

```bash
# Generate dependency graph
turbo run build --graph

# Outputs dot file showing:
# - Which packages depend on what
# - Build order
# - Parallel opportunities
```

## Migration Path

### Phase 1: Drop-In Replacement (This PR)

- Replace git diff with `turbo build --dry-run --filter='[HEAD^1]'`
- Keep existing build commands
- Immediate benefits: intelligent detection, dependency awareness

### Phase 2: Enable Remote Caching (Future)

```yaml
# .github/workflows/deploy-mfes-turbo.yml
- uses: actions/cache@v3
  with:
    path: .turbo
    key: turbo-${{ runner.os }}-${{ github.sha }}
    restore-keys: turbo-${{ runner.os }}-
```

**Expected gains**: 30-50% faster builds from cache hits

### Phase 3: Turbo Remote Cache (Future)

Sign up for Vercel Remote Cache (free for open source):

```bash
npx turbo link
```

**Expected gains**: 50-80% faster builds, shared cache across team

## Real-World Example

### Scenario: Fix bug in mfe-widget

**Current Git-Based Workflow**:

1. Modify `apps/mfes/mfe-widget/src/components/Button.tsx`
2. Git diff detects: `apps/mfes/mfe-widget/**`
3. Workflow builds: mfe-widget
4. Build time: ~90s (deps install + build from scratch)

**Turborepo Workflow**:

1. Modify `apps/mfes/mfe-widget/src/components/Button.tsx`
2. Turbo detects: `@mfe-runtime/mfe-widget` changed
3. Turbo checks cache: dynamic-loader cached, events cached
4. Workflow builds: mfe-widget only (deps reused)
5. Build time: ~65s (28% faster)

### Scenario: Update shared package

**Current Git-Based Workflow**:

1. Modify `packages/dynamic-loader/src/loader.ts`
2. Git diff detects: `packages/dynamic-loader/**`
3. Workflow sees shared package → deploys ALL MFEs
4. Build time: ~180s (2 MFEs × 90s each, sequential)

**Turborepo Workflow**:

1. Modify `packages/dynamic-loader/src/loader.ts`
2. Turbo detects: dynamic-loader changed
3. Turbo finds dependents: mfe-widget, mfe-landing-page
4. Workflow builds: dynamic-loader, then both MFEs in parallel
5. Build time: ~110s (39% faster)

## Recommendation

**Adopt Turborepo workflow** because:

1. ✅ Smarter change detection (understands `package.json`)
2. ✅ Faster builds (caching, parallelization)
3. ✅ Less maintenance (no hardcoded dependency lists)
4. ✅ Future-proof (enables remote cache, advanced features)
5. ✅ Standard tool (used by Vercel, Shopify, others)

The workflow is already configured in `turbo.json` - we just need to use it!

## Testing the New Workflow

```bash
# 1. Test local detection
turbo build --dry-run --filter='[HEAD^1]'

# 2. Push change to mfe-widget
git commit -am "fix: widget bug"
git push origin main

# Expected: Only mfe-widget deploys (not mfe-landing-page)

# 3. Push change to shared package
# Edit packages/dynamic-loader/src/loader.ts
git commit -am "feat: improve loader"
git push origin main

# Expected: Both mfe-widget and mfe-landing-page deploy (parallel)
```

## References

- [Turborepo Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Turborepo Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Turborepo Remote Cache](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [GitHub Actions + Turborepo](https://turbo.build/repo/docs/ci/github-actions)
