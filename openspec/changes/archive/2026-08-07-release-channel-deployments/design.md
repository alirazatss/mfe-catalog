# Design: release-channel-deployments

## Context

The multi-shell change (archived `2026-08-07-multi-shell-deployment-workflow`) gave every shell a reusable deploy workflow and per-shell blob prefixes. The team's branching strategy is trunk-based: `main` is always releasable, `release-<major.minor>` branches are cut per release line, fixes land on `main` and are cherry-picked back, prod tags (`<shell>-v<semver>`) are cut from release branches. The pipeline must let each release line have its own deployed, testable state.

## Decisions

### D1: Channel = branch name, derived in callers (chosen) vs. computed in the reusable workflow

The reusable workflow stays policy-free: it takes a `channel` string input and maps it to a blob prefix. Callers derive the channel from `github.ref_name` in their `release-*` trigger. Alternative — parsing refs inside the reusable workflow — would couple it to branching policy and complicate `workflow_dispatch`/tag runs. Cost: each caller repeats one small expression; acceptable since callers are thin by design.

### D2: Channel-per-release-line prefixes (chosen) vs. per-branch containers vs. environments

`release-<major.minor>/` prefixes nested under existing per-shell/per-MFE prefixes reuse the multi-shell layout, the same OIDC role assignments, the same lifecycle policy mechanism, and the same static hosting. New containers per line would need provisioning + role assignment per release cut; GitHub environments per line would need repo-settings churn. Prefixes need zero provisioning on release cut.

### D3: MFE channel fallback resolves at config-generation time (chosen) vs. runtime fallback

When building a release-channel shell config, the generator checks whether each MFE has a build under the channel prefix (blob existence check) and emits either the channel URL or the `dev/` pointer URL. Alternative — the shell runtime trying the channel URL and falling back on 404 — adds latency, error-handling complexity, and violates the config-boot-validation model. Trade-off: a config generated before an MFE's first channel deploy keeps pointing at `dev/` until the shell redeploys; acceptable because any MFE cherry-pick onto the branch also retriggers nothing shell-side automatically — documented as "redeploy the shell after backporting an MFE fix" in the runbook, and mitigated because most release-branch pushes touching an MFE also update the shell config commit-wise rarely. The MFE deploy on a release branch MAY be followed by a manual shell redeploy (workflow_dispatch) when needed.

### D4: Lifecycle 90-day reaping (chosen) vs. explicit EOL cleanup workflow

A `release-` prefix rule (90 days after last modification) reaps dead lines with zero operational effort. An explicit "delete channel on branch deletion" workflow was rejected: branch deletion events are easy to miss, and premature deletion of a channel that QA still uses is worse than 90 days of cheap storage. Trade-off: dead channels linger up to 90 days.

### D5: Backport via label-driven cherry-pick workflow (chosen) vs. manual process vs. merge-back

Label-driven automation (`backport release-4.10`) keeps `main` as the single source of truth and makes backports auditable PRs with CI. Merging release branches back to `main` was rejected — it inverts fix direction and creates version-bump merge conflicts. Implementation uses a maintained backport action or a small script with `git cherry-pick -x`; conflict cases degrade to a comment on the source PR (never a broken PR).

### D6: Branch↔version validation lives in the reusable workflow

Same placement as the existing tag↔package.json validation, so one workflow owns all "ref agrees with version" checks. On `release-4.10`, shell `package.json` must be `4.10.*`. Release-cut procedure (documented, not automated here): branch gets `X.Y.0`, `main` bumps to `X.(Y+1).0-dev` or next minor.

## Risks & Mitigations

- **Config drift between channels**: a channel shell config can silently point at `dev/` MFEs. Mitigation: `build-info.json` under each channel records resolved MFE URLs; runbook covers verification after backports.
- **Lifecycle rule overlap**: nested `sha-` under `release-` matches both the 30-day sha rule and the 90-day release rule — deletion at the earlier (30-day) mark is intended; scenario documents it.
- **Orphaned channels after EOL**: bounded by the 90-day rule (D4).
- **Backport workflow permissions**: needs `contents: write` + `pull-requests: write`; scoped via `GITHUB_TOKEN` permissions block, no PATs.

## Migration Plan

Purely additive — no existing path, trigger, or config changes shape. Rollout: (1) lifecycle policy rule + runbook update; (2) `channel` input + validation in `deploy-shell.yml`, `release-*` triggers in callers and `deploy-mfes-turbo.yml`; (3) channel-aware config generation; (4) release-target PR previews; (5) backport workflow. Verifiable end-to-end only after the first real release branch is cut (out of scope), so acceptance uses a throwaway `release-0.0` branch deleted after verification.
