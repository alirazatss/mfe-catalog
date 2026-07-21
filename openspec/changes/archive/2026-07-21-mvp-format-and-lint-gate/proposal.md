## Why

The repository check gate (`vp check`) fails with 105 files having formatting violations. This blocks MVP release because the main quality gate must be passing; an MVP branch shipping with a broken linter/formatter invites technical debt and prevents CI/CD integration. Fix must be one-time batch + infrastructure to prevent recurrence.

## What Changes

- Run `vp run format` once to auto-fix all 105 files in batch
- Add pre-commit hook to lint and format staged files before commit
- Document format/lint conventions in CONTRIBUTING.md
- Ensure CI/CD runs `vp check` before merging (future; tracked separately)

## Capabilities

### New Capabilities

- `pre-commit-hooks`: Local git hooks to enforce formatting on commit
- `ci-format-validation`: CI/CD integration for format checks (future; defer to post-MVP)

### Modified Capabilities

None

## Impact

- **Affected code**: 105 files across the workspace
- **Affected tools**: Oxfmt, Oxlint (already installed via vite-plus)
- **Dependencies**: None (vp already included)
- **Breaking**: None (formatting only)
- **Target result**: `vp check` → exit 0 (all files compliant)

---

## Acceptance Criteria

- [ ] Run `vp run format` and verify no errors
- [ ] All 105 files reformatted
- [ ] `vp check` exits with 0
- [ ] Pre-commit hook installed and functional
- [ ] CONTRIBUTING.md documents format expectations
- [ ] No formatting drift on subsequent commits
