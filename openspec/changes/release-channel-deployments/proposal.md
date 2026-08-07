# Release Channel Deployments

## Why

The pipeline only understands two release states: `main` (dev channel) and prod tags. The team is adopting trunk-based development with versioned release branches (`release-4.10`, `release-4.11`) — fixes land on `main` first and are cherry-picked back, prod tags are cut from release branches. Today a push to a release branch deploys nothing, so release lines cannot be stabilized or tested independently before tagging. This change adds per-release-line deploy channels on top of the multi-shell pipeline.

This change builds directly on the archived `multi-shell-deployment-workflow` change — the reusable shell workflow and per-shell blob prefixes it introduced are the foundation for channels.

## What Changes

- Add a fourth blob path family: release channels. Pushes to `release-<major.minor>` deploy shells to `dev-shell/<shell-name>/release-<major.minor>/` and changed MFEs to `mfes-dev/<mfe-name>/release-<major.minor>/`, alongside the existing floating, `sha-`, and `pr-` families.
- Add a `channel` input to the reusable shell deploy workflow; callers map `release-*` branch triggers to it. Concurrency keys include the channel.
- Branch↔version validation: on a `release-<major.minor>` branch, the shell's `package.json` major.minor MUST match the branch name; prod tags remain `<shell-name>-v<semver>` cut from release branches.
- Channel-aware remote config generation: a release-channel shell build embeds `remotes.config.json` pointing at same-channel MFE URLs, falling back to the MFE's `dev/` pointer when that MFE has no release channel yet.
- PR previews for pull requests targeting `release-*` branches: same `pr-<n>/` mechanism, with unchanged MFEs falling back to the base branch's release channel (not `dev/`).
- Lifecycle policy: `release-` prefixed blobs expire 90 days after last modification (auto-reaps EOL lines); no back-merge cleanup workflow needed.
- Backport automation: labeling a merged `main` PR with `backport <release-branch>` opens a cherry-pick PR against that release branch automatically.

Out of scope: branch protection rules for `release-*` (repo settings, documented in runbook only); creating the first release branch; changes to prod deploy (`$web`) behavior; GitFlow-style `develop` branch support.

## Capabilities

### New Capabilities

- `backport-automation`: Label-driven cherry-pick automation that opens backport PRs from merged `main` PRs to release branches.

### Modified Capabilities

- `reusable-shell-deploy-workflow`: Gains a `channel` input, release-branch trigger mapping in callers, channel-scoped concurrency, and branch↔version validation.
- `mfe-deployment-pipeline`: Gains release-channel deploys — pushes to `release-*` deploy changed MFEs to `<mfe-name>/release-<major.minor>/`.
- `pr-preview-deployments`: Gains previews for PRs targeting release branches, with channel-correct fallback URLs.
- `config-generation`: Gains channel-aware URL generation (release channel URLs with dev fallback).
- `azure-blob-storage-layout`: Path families extended from three to four (adds release channels); lifecycle policy gains a 90-day `release-` rule.

## Impact

- `.github/workflows/deploy-shell.yml` (channel input), per-shell caller workflows (release-_ triggers), `deploy-mfes-turbo.yml` (release-_ triggers + channel destination), `deploy-previews.yml` (release-\* base branches + fallback logic), new `backport.yml`.
- `scripts/generate-config.ts` / `scripts/azure/generate-preview-config.ts` (channel-aware URL generation).
- Azure Storage lifecycle policy (new `release-` rule); provisioning runbook.
- Team process docs: release cut procedure, fix-on-main + cherry-pick rule, version bump discipline (branch gets `X.Y.0`, main bumps to next minor).
