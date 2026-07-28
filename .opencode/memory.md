# OpenCode Project Memory

This file contains durable, OpenCode-specific working conventions for this repository. It is not the source of truth for product requirements or architecture.

## Source Precedence

When information conflicts, use this order:

1. The user's current request
2. `AGENTS.md` and applicable agent instructions
3. Accepted ADRs in `docs/adr/`
4. Active OpenSpec artifacts in `openspec/changes/`
5. `CONTEXT.md` for shared terminology and architecture
6. `README.md`, roadmaps, and package documentation
7. This memory file

Do not copy architectural descriptions or active task status into this file. Link to their authoritative documents so they do not drift.

## Project Identity

- Project and package scope: `mfe-runtine` / `@mfe-runtine/*`
- The spelling `runtine` is intentional.
- Repository structure:
  - Shell applications: `apps/shells/*`
  - Micro-frontends: `apps/mfes/mfe-*`
  - Reusable libraries: `packages/*`
- Architecture and glossary: `CONTEXT.md`
- Architectural decisions: `docs/adr/`
- Specifications and changes: `openspec/`

## Architecture Guardrails

- Shells are thin orchestration hosts and must not own feature business logic.
- MFEs expose lifecycle modules and are selected through runtime manifests.
- Keep the shell runtime, lifecycle contract, and manifest model independent of the application bundler.
- Cross-MFE communication uses explicit contracts such as props, navigation adapters, and the event bus.
- Authentication, navigation, loading, and failure behavior belong to their established adapters and packages rather than application-specific copies.
- Preserve independently deployable shell and MFE artifacts.

Read `CONTEXT.md` and the relevant ADR before making an architectural change. Do not treat this summary as a replacement for either.

## Toolchain

- Use Vite+ through the `vp` CLI.
- Use pnpm workspaces and Turbo through repository scripts.
- Do not substitute raw npm or yarn commands for repository package operations.
- Run `vp install` after dependency or lockfile changes.
- Prefer repository scripts because they preserve package-local configuration:
  - Checks: `vp check`
  - Tests: `vp run test`
  - Build: `vp run build`
- Use a focused package or app task first when validating a narrow change.

## Module Federation

- Federation integration uses `@module-federation/vite`.
- Remote applications expose `./lifecycle`.
- React and React DOM are shared as singleton dependencies where applicable.
- Runtime remote selection is owned by the manifest and dynamic loader, not static host configuration.
- A federation upgrade must validate both a remote production build and a fresh shell production build.

## OpenSpec Workflow

- Inspect `openspec/changes/` before starting behavior-changing feature work.
- Use the local OpenSpec skills in `.opencode/skills/` when their workflow matches the request.
- Requirements belong in OpenSpec artifacts; implementation decisions with lasting architectural impact belong in ADRs.
- Do not record active-change completion percentages here.

## Editing And Validation

- Keep changes scoped to the requested behavior.
- Preserve user changes in a dirty worktree.
- Do not commit or create branches unless the user explicitly requests it.
- After editing, run the narrowest executable check that can falsify the change.
- Before completion, run the relevant repository checks and report any warnings or unavailable validation.

## Maintenance

Update this file only when a durable OpenCode working convention changes. Update `CONTEXT.md`, ADRs, OpenSpec, or package documentation for changes to architecture, requirements, status, or public usage.
