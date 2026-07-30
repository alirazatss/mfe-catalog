<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

## Project Context for Agents

This section is durable, team-visible context. Session-specific state (which task groups are in flight right now, etc.) lives in `.session-context.md` (local-only, gitignored).

### What this repo is

Micro-frontend monorepo (`mfe-catalog`) with:

- **Shell:** `apps/shells/website` (the host app users hit)
- **MFEs:** `apps/mfes/mfe-widget`, `apps/mfes/mfe-landing-page`
- **Shared packages:** `packages/*` — `auth`, `auth-ui`, `dynamic-loader`, `events`, `monorepo-tools`, `remote-config`, `shell-runtime`, `utils`

Naming convention: workspace packages are `@mfe-runtime/*`. The root `package.json` name is `mfe-runtine` (pre-existing typo, cosmetic only, do not rename in unrelated PRs).

### Deployment target

Azure Blob Storage, single storage account (`tssmfestorage`), container-based env separation. GitHub Actions with OIDC federated identity, no long-lived Azure secrets. Full design in `openspec/changes/azure-blob-deployment-pipeline/` — spec is merged to `main` and treated as ground truth.

### Workflow: OpenSpec + spec-executor

Feature work follows a two-phase model:

1. **Specification phase.** Use `spec-writer` skill to produce an OpenSpec change under `openspec/changes/<change-id>/` with `proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`. Task decomposition MUST be parallel-safe (each task group declares "Owns files" and "Depends on"). Spec ships as its own PR against `main` and is human-reviewed before any implementation.

2. **Implementation phase.** Use `spec-executor` skill (`/Users/ali.raza/.agents/skills/spec-executor/SKILL.md`) once the spec is merged. One task group per agent invocation, each in its own git worktree, each producing its own PR against `main`. Delivery mode configured in local `.env` (`spec_executor_delivery=push-and-pr` for normal flow).

Skills involved:

- Spec authoring: `spec-writer`, `spec-writer-openspec-cli`, `spec-writer-requirement-quality`, `spec-writer-task-mapping`, `grill-with-docs`
- Implementation: `spec-executor` (creates worktrees, opens PRs, halts on ambiguity — never modifies spec files)
- Execution owners referenced in `tasks.md`: `backend-developer`, `frontend-developer`, `tester`, `architect`, `team-lead`

Do NOT use the built-in `openspec-apply-change` for this repo — it walks all tasks in one go without worktrees or PRs, which violates the parallel-safe workflow.

### Baseline expectations before any agent run

- `main` is clean and in sync with `origin/main`
- `pnpm test` green (turbo runs across all packages)
- `pnpm build` green
- `pnpm exec vp check` green (0 errors; some pre-existing warnings tolerated)
- `pnpm -r exec tsc --noEmit` green
- CI on `main` green (Lint, Type Check, Unit Tests, Build, Integration Tests must pass; E2E currently non-blocking, tracked as GitHub issue #4)

If any of the above is red on a fresh checkout, fix that in its own PR before invoking `spec-executor` — the skill's Step 5 requires a green baseline.

### Local files not in git

- `.env` — worktree_path, spec_executor_delivery. Excluded via `.git/info/exclude` (not tracked `.gitignore`).
- `.session-context.md` — living session state, agent memory across restarts. Gitignored locally.

### Test invocation cheat sheet

- Unit tests: `pnpm test` (runs `turbo test`)
- Type check: `pnpm -r exec tsc --noEmit`
- Lint: `pnpm exec vp lint` or `vp check`
- Build: `pnpm build` (runs `turbo build`)
- Integration: `pnpm test:integration` (requires `pnpm build` first)
- E2E: `pnpm test:e2e` (Playwright; currently non-blocking, see issue #4)

Do NOT run `vp test` at the monorepo root — it scoops up files (Playwright specs, `_legacy` leftovers) that don't belong to vitest. Use `pnpm test` / `turbo test` at the root, or `vp test` inside a specific package.
