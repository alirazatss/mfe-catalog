# pr-preview-deployments Delta (release channels)

## ADDED Requirements

### Requirement: Pull requests targeting release branches SHALL receive previews with channel-correct fallbacks

The preview pipeline SHALL run for qualifying same-repo pull requests whose base branch matches `release-*`, using the same `pr-<n>/` prefixes as main-target previews. In the preview shell config, MFEs changed in the PR SHALL point at their `pr-<n>/` preview URLs; MFEs not changed in the PR SHALL point at the base branch's release channel URL (`<mfe-name>/release-<major.minor>/`), falling back to the MFE's `dev/` pointer when no channel build exists.

#### Scenario: Release-target PR gets a preview against channel baselines

- **GIVEN** a PR from a same-repo branch targets `release-4.10` and changes `mfe-widget`
- **WHEN** the preview pipeline completes
- **THEN** a preview shell is available under the shell's `pr-<n>/` prefix
- **AND** its config points `mfe-widget` at `mfe-widget/pr-<n>/`
- **AND** unchanged MFEs with a `release-4.10/` build point at that channel URL

#### Scenario: Unchanged MFE without a channel build falls back to dev

- **GIVEN** a PR targets `release-4.10` and `mfe-landing-page` has no `release-4.10/` build
- **WHEN** the preview config is generated
- **THEN** `mfe-landing-page` points at `mfe-landing-page/dev/remoteEntry.js`

#### Scenario: Release-target PR cleanup is identical to main-target cleanup

- **WHEN** a PR targeting `release-4.10` is closed
- **THEN** all `pr-<n>/` blobs for that PR are deleted using the existing cleanup workflow
- **AND** no `release-4.10/` channel blob is deleted
