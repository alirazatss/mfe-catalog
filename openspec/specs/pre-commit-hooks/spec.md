# pre-commit-hooks Specification

## Purpose

TBD - created by archiving change mvp-format-and-lint-gate. Update Purpose after archive.

## Requirements

### Requirement: Format violations batch-fixed with vp run format

The initial one-time format fix SHALL use `vp run format` to auto-fix all 105 files in the repository.

#### Scenario: vp run format fixes all violations

- **WHEN** run `vp run format`
- **THEN** all 105 files are reformatted and tool exits with 0

#### Scenario: All files then pass vp check

- **WHEN** after `vp run format` completes, run `vp check`
- **THEN** no format violations remain (exit code 0)

---
