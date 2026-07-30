## ADDED Requirements

### Requirement: Shell prod deploy SHALL publish to a versioned path in `$web` AND overwrite the `$web` root

The system SHALL, on a shell prod deploy triggered by tag `website-v<semver>`, upload the shell build output to container `$web` at path `v<version>/` on `tssmfestorage` using conditional upload (fail-if-exists), and SHALL additionally copy the same build to the `$web/` root path, replacing any prior root contents. The Azure Blob static-website endpoint SHALL serve the root copy.

#### Scenario: First tag deploy publishes version and root

- **GIVEN** no blobs exist under `$web/v1.0.0/` on `tssmfestorage`
- **WHEN** the tag `website-v1.0.0` is pushed and the workflow runs
- **THEN** the build output is uploaded to `$web/v1.0.0/`
- **AND** the same build is copied to `$web/` root
- **AND** requests to the static-website endpoint return the newly deployed `index.html`

#### Scenario: Re-tagging an existing version fails

- **GIVEN** `$web/v1.0.0/index.html` already exists on `tssmfestorage`
- **WHEN** the tag `website-v1.0.0` is pushed again
- **THEN** the versioned upload step exits non-zero
- **AND** the `$web/` root is not modified

### Requirement: Shell tag version SHALL match `package.json` version

The system SHALL, before uploading, extract the semver from the `website-v<semver>` tag and compare it against `apps/shells/website/package.json`. If they differ, the workflow SHALL fail before uploading any artifact.

#### Scenario: Version mismatch aborts deploy

- **GIVEN** the tag is `website-v1.0.0` and `apps/shells/website/package.json` has `"version": "0.9.0"`
- **WHEN** the workflow runs its validation step
- **THEN** the step exits non-zero
- **AND** no blob is uploaded

### Requirement: Merging a change to `remotes.config.prod.json` on `main` SHALL redeploy the `$web` root without cutting a new version

The system SHALL, when a merge to `main` modifies `apps/shells/website/public/remotes.config.prod.json` (and no shell tag is pushed), rebuild the shell against the newest committed config and copy the resulting build to `$web/` root only. It SHALL NOT write to any `$web/v<version>/` path.

#### Scenario: Config-only merge redeploys root

- **GIVEN** the current shell tag is `website-v1.0.0` and `$web/v1.0.0/` exists
- **WHEN** a merge to `main` updates `remotes.config.prod.json` and no new shell tag is pushed
- **THEN** the workflow rebuilds the shell using the updated config
- **AND** the build is copied to `$web/` root, replacing prior root contents
- **AND** no new `$web/v<version>/` path is created

#### Scenario: Config-only merge does not modify existing versioned paths

- **GIVEN** `$web/v1.0.0/` exists on `tssmfestorage`
- **WHEN** a config-only redeploy runs
- **THEN** all blobs under `$web/v1.0.0/` remain byte-for-byte unchanged

### Requirement: Shell dev deploy SHALL run on push to `main` and overwrite the `dev-shell` container root

The system SHALL, on push to `main` that modifies the shell source or its config files, upload the shell build output to container `dev-shell` root on `tssmfestorage`, replacing prior contents. The dev shell SHALL NOT be uploaded to `$web`. Dev shell blobs SHALL have `Cache-Control: no-cache, must-revalidate`.

#### Scenario: Push to main deploys dev shell to dev-shell container

- **GIVEN** the shell source is modified on a commit merged to `main`
- **WHEN** the workflow runs
- **THEN** the build output is uploaded to container `dev-shell` on `tssmfestorage`
- **AND** no blob is uploaded to `$web`
- **AND** each blob response carries `Cache-Control: no-cache, must-revalidate`

#### Scenario: Dev shell URL resolves via raw blob path

- **GIVEN** the dev shell has been deployed
- **WHEN** a browser requests `https://tssmfestorage.blob.core.windows.net/dev-shell/index.html`
- **THEN** the response is the deployed dev `index.html`

### Requirement: Prod shell builds SHALL bundle `remotes.config.prod.json`; dev shell builds SHALL bundle `remotes.config.dev.json`

The system SHALL, at build time, select `remotes.config.<env>.json` matching the target environment and place it at the path the shell reads at runtime (`remotes.config.json`). The other environment's config SHALL NOT appear in the deployed artifact.

#### Scenario: Prod build contains prod config

- **WHEN** the shell is built for `prod`
- **THEN** the deployed artifact contains a `remotes.config.json` equal to the repository's `remotes.config.prod.json` at the built commit
- **AND** no file named `remotes.config.dev.json` appears in the deployed artifact

#### Scenario: Dev build contains dev config

- **WHEN** the shell is built for `dev`
- **THEN** the deployed artifact contains a `remotes.config.json` equal to the repository's `remotes.config.dev.json` at the built commit
