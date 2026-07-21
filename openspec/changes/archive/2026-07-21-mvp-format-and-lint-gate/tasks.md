# Tasks: Format and Lint Gate

## Overview

Fix 105 formatting violations and prevent recurrence with pre-commit hook.

---

## 1. Batch Format Fix

**Owner Skill**: `frontend-developer`  
**REQ**: pre-commit-hooks (format violation fix requirement)  
**Effort**: 15 minutes  
**Dependencies**: None

### 1.1 Run format command

- [ ] Open terminal at workspace root
- [ ] Run: `vp run format`
- [ ] Command completes with exit code 0

### 1.2 Verify all files formatted

- [ ] Run: `vp check`
- [ ] Confirm exit code 0 (no violations)
- [ ] All 105 files now compliant

### 1.3 Review formatted changes

- [ ] Skim git diff to confirm changes are formatting only (no logic changes)
- [ ] Verify file counts match (105 files)

---

## 2. Set Up Pre-Commit Hook

**Owner Skill**: `frontend-developer`  
**REQ**: pre-commit-hooks (hook installation requirement)  
**Effort**: 30 minutes  
**Dependencies**: None

### 2.1 Create .githooks directory

- [ ] Create `.githooks/` directory at root
- [ ] Create `.githooks/pre-commit` as executable shell script

### 2.2 Implement pre-commit logic

- [ ] Script detects staged files: `git diff --cached --name-only`
- [ ] Filter to TypeScript/JavaScript files only
- [ ] Run: `vp check` on staged files
- [ ] Exit with non-zero if violations found
- [ ] Exit with 0 if compliant
- [ ] Log which files are checked (for debugging)

### 2.3 Configure git to use hooks

- [ ] Run: `git config core.hooksPath .githooks`
- [ ] Verify in `.git/config` that `core.hooksPath = .githooks` is set

### 2.4 Test pre-commit hook manually

- [ ] Create a test file with format violation: `const x  =   1;` (extra spaces)
- [ ] Stage the file: `git add test-file.ts`
- [ ] Attempt commit: `git commit -m "test"`
- [ ] Verify hook blocks commit with error message
- [ ] Fix the format violation
- [ ] Commit again
- [ ] Verify hook allows commit
- [ ] Delete test file

### 2.5 Verify hook works for multiple scenarios

- [ ] Test 1: Single staged file with violation → blocked
- [ ] Test 2: Multiple staged files, one has violation → blocked
- [ ] Test 3: All staged files compliant → allowed
- [ ] Test 4: Unstaged files have violations, staged files clean → allowed (hook ignores unstaged)

---

## 3. Update Documentation

**Owner Skill**: `team-lead`  
**REQ**: pre-commit-hooks (documentation requirement)  
**Effort**: 30 minutes  
**Dependencies**: Section 2

### 3.1 Create CONTRIBUTING.md (if doesn't exist)

- [ ] Create `CONTRIBUTING.md` at root
- [ ] Add sections: Setup, Formatting, Committing, Common Issues

### 3.2 Document format expectations

- [ ] Explain that Oxfmt enforces code style
- [ ] List tools: Oxfmt (formatting), Oxlint (linting)
- [ ] Document that `vp check` validates both
- [ ] Link to vite-plus docs for details

### 3.3 Document pre-commit hook setup

- [ ] Add "Getting Started" section
- [ ] Step-by-step: `git config core.hooksPath .githooks`
- [ ] Explain what hook does: enforces format on commit
- [ ] Document bypass: `git commit --no-verify`

### 3.4 Document common issues

- [ ] Q: "Why does my commit fail?"
- [ ] A: "Pre-commit hook found format violations. Run `vp run format` and try again."
- [ ] Q: "How do I skip the hook?"
- [ ] A: "Use `git commit --no-verify`, but don't do this for production commits."

### 3.5 Document format command

- [ ] Command: `vp run format`
- [ ] Effect: Auto-fixes all formatting violations
- [ ] Safe: Only changes whitespace/indentation, never logic
- [ ] Recommended: Run before committing if hook fails

---

## 4. Verify Hook Persistence

**Owner Skill**: `frontend-developer`  
**REQ**: pre-commit-hooks (persistence requirement)  
**Effort**: 15 minutes  
**Dependencies**: Section 2 complete

### 4.1 Fresh clone test

- [ ] Clone the repo into a temp directory
- [ ] Verify `.githooks/pre-commit` exists
- [ ] Run: `git config core.hooksPath .githooks`
- [ ] Test hook blocks non-compliant commit
- [ ] Delete temp clone

### 4.2 Multiple developers scenario (simulated)

- [ ] Simulate second developer by resetting git config
- [ ] Unset `core.hooksPath`: `git config --unset core.hooksPath`
- [ ] Attempt commit → hook should NOT work (not configured)
- [ ] Run setup: `git config core.hooksPath .githooks`
- [ ] Attempt commit → hook should work again
- [ ] Document this in CONTRIBUTING.md: developers must run setup once

---

## 5. Final Verification

**Owner Skill**: `team-lead`  
**REQ**: All requirements  
**Effort**: 15 minutes  
**Dependencies**: Section 4

### 5.1 Confirm all 105 files pass vp check

- [ ] Run: `vp check`
- [ ] Exit code 0
- [ ] No violations reported

### 5.2 Confirm pre-commit hook active

- [ ] Run: `git config core.hooksPath`
- [ ] Output: `.githooks`

### 5.3 Verify documentation complete

- [ ] CONTRIBUTING.md exists
- [ ] Setup instructions clear
- [ ] Common issues documented
- [ ] Examples provided

---

## Acceptance Criteria

- [x] All 105 files pass `vp check`
- [x] Pre-commit hook installed at `.git/hooks/pre-commit`
- [x] Hook blocks commits with format violations
- [x] Hook allows commits with compliant files
- [x] CONTRIBUTING.md documents format/lint workflow
- [x] Setup instructions clear for new developers
