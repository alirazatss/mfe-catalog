# Format and Lint Gate - Design

## Design Summary

Fix 105 files with format violations by batch-running `vp run format`, then prevent recurrence with a pre-commit git hook that checks staged files before commit.

## Architecture

### One-Time Batch Fix

**Command**: `vp run format`

**What it does**: Oxfmt (installed by vite-plus) reformats all JavaScript/TypeScript files per project conventions.

**Output**: All 105 files rewritten to match format standard.

**No configuration needed**: vite-plus handles format config automatically.

### Pre-Commit Hook

**Tool**: Native git hook (shell script) or husky (optional).

**Recommended**: Native shell hook for simplicity (no external dependency).

**Location**: `.git/hooks/pre-commit`

**Behavior**:

1. Detect staged files: `git diff --cached --name-only`
2. Filter to .ts/.tsx/.js/.jsx files
3. Run `vp check` on those files
4. If violations found, exit with non-zero code (blocks commit)
5. If compliant, exit with 0 (allows commit)

**Setup script**: Create `.githooks/pre-commit` in repo and document in CONTRIBUTING.md:

```bash
git config core.hooksPath .githooks
```

### Documentation Update

**File**: `CONTRIBUTING.md` (create if doesn't exist)

**Content**:

- Format expectations and tools (Oxfmt)
- How to install pre-commit hook
- Bypass option: `git commit --no-verify`
- List of files currently format-compliant

## Trade-offs

| Option                         | Pros                      | Cons               | Choice                |
| ------------------------------ | ------------------------- | ------------------ | --------------------- |
| husky vs native hook           | Popular, cross-platform   | Extra dependency   | Native hook (simpler) |
| Check all files vs staged only | Comprehensive             | Slow on large repo | Staged only           |
| Oxfmt vs Prettier              | Included in vp, Rust-fast | Less familiar      | Oxfmt                 |

## Backward Compatibility

- Format change affects all files but is non-breaking (style only)
- Existing commits unaffected
- Future commits will be format-checked

## Risk Mitigation

- **Risk**: Pre-commit hook too slow, developers bypass it
- **Mitigation**: Hook only checks staged files (~200ms), very fast

- **Risk**: Developers still have format violations in unstaged work
- **Mitigation**: Document that unstaged violations don't block commit; developers should run `vp format` in branches

## Success Metrics

- All 105 files pass `vp check`
- Pre-commit hook blocks non-compliant commits
- Pre-commit hook does not block compliant commits
- Hook runtime <500ms for typical 5-file commit
