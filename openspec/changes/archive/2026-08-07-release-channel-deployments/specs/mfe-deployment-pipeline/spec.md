# mfe-deployment-pipeline Delta (release channels)

## ADDED Requirements

### Requirement: MFE pipeline SHALL deploy changed MFEs to release channels on release-branch pushes

The unified MFE deployment workflow SHALL also trigger on pushes to `release-*` branches. For each MFE changed on that push (turbo-based change detection, same as `main`), the build SHALL be uploaded to `<mfe-name>/release-<major.minor>/` in the dev container, where `<major.minor>` is derived from the branch name. The floating `<mfe-name>/dev/` pointer and immutable `sha-` publication rules from `main` SHALL NOT be modified by release-branch runs; the channel prefix SHALL receive its own nested `sha-<short-sha>/` immutable copy and `build-info.json`.

#### Scenario: Cherry-picked MFE fix deploys to the release channel

- **GIVEN** a fix to `mfe-widget` is cherry-picked onto `release-4.10`
- **WHEN** the push lands on `release-4.10`
- **THEN** `mfe-widget` is built and uploaded to `mfes-dev/mfe-widget/release-4.10/`
- **AND** an immutable copy lands at `mfes-dev/mfe-widget/release-4.10/sha-<short-sha>/`
- **AND** `mfes-dev/mfe-widget/dev/` is not modified

#### Scenario: Unchanged MFEs are not deployed to the channel

- **WHEN** a push to `release-4.10` changes only `mfe-widget`
- **THEN** no upload occurs under `mfes-dev/mfe-landing-page/release-4.10/`

#### Scenario: Channel deploys serialize per MFE and channel

- **WHEN** two commits changing `mfe-widget` land on `release-4.10` in quick succession
- **THEN** their deploy jobs run sequentially under a concurrency group keyed by MFE and channel with `cancel-in-progress: false`
