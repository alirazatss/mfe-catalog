# Pre-Commit Hooks

## ADDED Requirements

### Requirement: Pre-commit hook installed to enforce format compliance

A git pre-commit hook SHALL be installed that runs `vp check` on staged files and prevents commit if formatting violations are found.

#### Scenario: Commit rejected with format violations

- **WHEN** developer stages a file with formatting violations and runs `git commit`
- **THEN** pre-commit hook runs `vp check` on staged files and exits with non-zero code, blocking the commit

#### Scenario: Commit succeeds with compliant files

- **WHEN** developer stages properly formatted files and runs `git commit`
- **THEN** pre-commit hook runs `vp check`, finds no violations, and allows commit to proceed

#### Scenario: Developer can bypass hook if needed

- **WHEN** developer needs to bypass pre-commit check (e.g., WIP commit)
- **THEN** developer can use `git commit --no-verify` to skip the hook

---

### Requirement: Hook is scoped to staged files only

The pre-commit hook SHALL only check staged files (`git diff --cached`), not the entire repository, to keep hook fast.

#### Scenario: Hook checks only staged changes

- **WHEN** developer stages one file and leaves others unstaged
- **THEN** hook only runs format check on the staged file

#### Scenario: Hook ignores uncommitted changes in working directory

- **WHEN** developer has unstaged changes with format violations
- **THEN** those unstaged violations do not prevent commit if staged files are compliant

---

### Requirement: Hook setup documented in CONTRIBUTING.md

Documentation SHALL explain how to install the pre-commit hook and what it validates.

#### Scenario: Developer can set up hook from README

- **WHEN** developer reads CONTRIBUTING.md setup section
- **THEN** instructions clearly explain running setup script or manual installation

#### Scenario: Documentation explains hook behavior

- **WHEN** developer reads CONTRIBUTING.md
- **THEN** expectations about format violations and bypass options are documented

---

## ADDED Requirements

### Requirement: Format violations batch-fixed with vp run format

The initial one-time format fix SHALL use `vp run format` to auto-fix all 105 files in the repository.

#### Scenario: vp run format fixes all violations

- **WHEN** run `vp run format`
- **THEN** all 105 files are reformatted and tool exits with 0

#### Scenario: All files then pass vp check

- **WHEN** after `vp run format` completes, run `vp check`
- **THEN** no format violations remain (exit code 0)

---

## Impact

- **Files affected**: 105 files (one-time fix)
- **Ongoing impact**: Pre-commit hook adds 2-5 seconds to each commit (acceptable)
- **Tools used**: vite-plus (vp check/format), husky or shell hook
- **Dependency additions**: None (vp already included)
- **Production impact**: Zero
