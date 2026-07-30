## ADDED Requirements

### Requirement: A single Azure Storage account SHALL host all environments; environments SHALL be separated by container

The system SHALL provision exactly one Azure Blob Storage account named `tssmfestorage`. Environment separation SHALL be enforced at the container level: dev artifacts SHALL live only in containers `mfes-dev` and `dev-shell`; prod artifacts SHALL live only in containers `mfes-prod` and `$web`. RBAC role assignments SHALL be scoped to individual containers, not to the storage account as a whole (see `github-actions-azure-oidc`).

#### Scenario: Dev workflow cannot write to prod containers

- **GIVEN** the dev workflow is authenticated via the `gha-mfe-dev` federated identity
- **WHEN** the workflow attempts to upload a blob to container `mfes-prod` or `$web` on `tssmfestorage`
- **THEN** the upload is rejected by Azure with an authorization error

#### Scenario: Prod workflow cannot write to dev containers

- **GIVEN** the prod workflow is authenticated via the `gha-mfe-prod` federated identity
- **WHEN** the workflow attempts to upload a blob to container `mfes-dev` or `dev-shell` on `tssmfestorage`
- **THEN** the upload is rejected by Azure with an authorization error

### Requirement: MFE artifacts SHALL be organized as `mfes-<env>/<mfe-name>/{v<version>|dev}/`

The system SHALL store MFE build artifacts under two containers: `mfes-prod` for prod, `mfes-dev` for dev. Prod artifacts SHALL live under `mfes-prod/<mfe-name>/v<version>/`; dev artifacts SHALL live under `mfes-dev/<mfe-name>/dev/`. The `<mfe-name>` segment SHALL match the MFE's directory name under `apps/mfes/`.

#### Scenario: Prod artifact path

- **WHEN** `mfe-widget-v1.2.0` is deployed to prod
- **THEN** `remoteEntry.js` is available at `https://tssmfestorage.blob.core.windows.net/mfes-prod/mfe-widget/v1.2.0/remoteEntry.js`

#### Scenario: Dev artifact path

- **WHEN** `mfe-widget` is deployed to dev
- **THEN** `remoteEntry.js` is available at `https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/dev/remoteEntry.js`

### Requirement: Prod shell SHALL be hosted from `$web`; dev shell SHALL be hosted from `dev-shell` container

The system SHALL enable Azure Blob static-website hosting on `tssmfestorage`, which creates the `$web` container. Shell prod artifacts SHALL live under `$web/v<version>/` (versioned copy) and `$web/` root (live copy served by the static-website endpoint). Shell dev artifacts SHALL live under `dev-shell/` and be served as raw blob URLs. The dev shell SHALL NOT use the `$web` container.

#### Scenario: Prod shell URL resolves from static-website endpoint root

- **GIVEN** shell `website-v1.0.0` has been deployed to prod
- **WHEN** a browser requests `https://tssmfestorage.z<region>.web.core.windows.net/`
- **THEN** the response is the deployed `index.html` from `$web/`

#### Scenario: Dev shell URL resolves via raw blob path

- **GIVEN** the dev shell has been deployed
- **WHEN** a browser requests `https://tssmfestorage.blob.core.windows.net/dev-shell/index.html`
- **THEN** the response is the deployed dev `index.html`

### Requirement: CORS SHALL permit `GET` and `OPTIONS` from any origin on both MFE containers

The system SHALL configure CORS on `tssmfestorage` to allow `GET` and `OPTIONS` methods from origin `*` with `Access-Control-Max-Age` of at least 3600 seconds, applied at the storage-account level so both `mfes-dev` and `mfes-prod` are covered. The shell running on any origin SHALL be able to fetch `remoteEntry.js` from either container without CORS errors.

#### Scenario: Cross-origin fetch of prod MFE succeeds

- **GIVEN** the shell is served from a different origin than the storage account
- **WHEN** the shell fetches `remoteEntry.js` from `mfes-prod`
- **THEN** the response contains `Access-Control-Allow-Origin: *`
- **AND** the browser does not raise a CORS error

#### Scenario: Cross-origin fetch of dev MFE succeeds

- **GIVEN** the dev shell is served from a different origin than the storage account
- **WHEN** the shell fetches `remoteEntry.js` from `mfes-dev`
- **THEN** the response contains `Access-Control-Allow-Origin: *`

### Requirement: Storage layout SHALL leave `sst` and `demo` environments as future additions without renaming existing containers

The system's container naming pattern (`mfes-<env>` for MFE artifacts; a per-env shell container reusing `$web` only for whichever environment holds prod-equivalent status) SHALL be additive. Adding a future `sst` environment SHALL require only creating new containers `mfes-sst` and `sst-shell` on the same storage account, adding a new AD app with container-scoped RBAC, and copy-pasting workflow jobs. Adding a future environment SHALL NOT require renaming any existing container, blob path, or workflow artifact.

#### Scenario: Adding a future environment is additive

- **GIVEN** the current layout has containers `mfes-dev`, `mfes-prod`, `dev-shell`, `$web`
- **WHEN** a future `sst` environment is added following the same container naming pattern (`mfes-sst`, `sst-shell`)
- **THEN** no existing container or blob path requires renaming
- **AND** no existing workflow file requires modification other than adding new jobs
