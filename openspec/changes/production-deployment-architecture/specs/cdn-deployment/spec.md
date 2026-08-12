## ADDED Requirements

> Note: This capability is scoped to the Azure Blob Storage account (`tssmfestorage`) already provisioned by `azure-blob-deployment-pipeline`. It does not introduce a second cloud provider, a CDN edge layer, or new credentials — it adds the `manifest.json` artifact and its lifecycle management on top of the existing MFE upload mechanism (`az storage blob upload-batch` via OIDC-authenticated GitHub Actions).

### Requirement: Versioned Asset Paths

The system SHALL store MFE assets in versioned Azure Blob Storage paths.

#### Scenario: Version-based path structure

- **WHEN** deploying mfe-widget version 1.2.3
- **THEN** all assets SHALL be uploaded to blob path "mfes-prod/mfe-widget/v1.2.3/"
- **AND** remoteEntry.js SHALL be at "mfes-prod/mfe-widget/v1.2.3/remoteEntry.js"

#### Scenario: Immutable versioned assets

- **WHEN** assets are uploaded to a versioned path
- **THEN** the blob SHALL be served with Cache-Control: public, max-age=31536000, immutable
- **AND** existing versioned assets SHALL never be overwritten (enforced by the existing `--overwrite false` deploy-prod behavior)

---

### Requirement: Manifest Upload via Existing Deploy Workflow

The system SHALL upload `manifest.json` using the existing Azure Blob deploy mechanism rather than a new, separate upload script or provider abstraction.

#### Scenario: Upload manifest to Azure Blob Storage

- **WHEN** the `update-manifest` job in `.github/workflows/deploy-mfes.yml` runs
- **THEN** it SHALL upload `manifest.json` via `az storage blob upload --overwrite` to `mfes-<env>/manifest.json`
- **AND** SHALL authenticate using the existing `gha-mfe-dev`/`gha-mfe-prod` OIDC identities (no new credentials)

#### Scenario: Upload failure handling

- **WHEN** the manifest upload fails
- **THEN** the job SHALL exit with non-zero exit code
- **AND** SHALL log error details for the failed upload
- **AND** SHALL retry up to 3 times before failing the job

---

### Requirement: Asset Integrity Verification

The system SHALL verify uploaded manifest and MFE assets match local builds.

#### Scenario: Compute file hashes before upload

- **WHEN** preparing to upload the manifest
- **THEN** the generator SHALL compute a SHA-384 hash of each referenced remoteEntry.js
- **AND** SHALL store hashes in the manifest's `integrity` field

#### Scenario: Verify uploaded file integrity

- **WHEN** the manifest upload completes
- **THEN** the workflow SHALL re-fetch the uploaded `manifest.json` from `tssmfestorage`
- **AND** SHALL verify its hash matches the locally generated file
- **AND** SHALL fail deployment if hashes don't match

---

### Requirement: Manifest Cache Behavior

The system SHALL use a short, mutable cache lifetime for the manifest instead of an invalidation mechanism.

#### Scenario: Manifest served with short cache lifetime

- **WHEN** `manifest.json` is uploaded
- **THEN** the blob SHALL be set with Cache-Control: public, max-age=60
- **AND** clients SHALL observe the new manifest within 60 seconds without any explicit invalidation step

#### Scenario: Versioned assets unaffected

- **WHEN** uploading versioned MFE assets
- **THEN** their immutable Cache-Control headers SHALL be left unchanged
- **AND** no invalidation step SHALL run for versioned paths (they never change content)

---

### Requirement: Blob Configuration Reuse

The system SHALL reuse the account-level configuration already established by `azure-blob-deployment-pipeline` rather than defining new CORS or content-type rules.

#### Scenario: CORS already covers manifest fetches

- **WHEN** the shell fetches `manifest.json` cross-origin from `tssmfestorage.blob.core.windows.net`
- **THEN** the existing account-level CORS rule (`GET`/`OPTIONS` from `*`) SHALL permit the request
- **AND** no new CORS rule SHALL need to be added

#### Scenario: Content-Type headers

- **WHEN** uploading `manifest.json`
- **THEN** the upload SHALL set Content-Type: application/json
- **WHEN** serving remoteEntry.js
- **THEN** the existing upload step SHALL continue to set Content-Type: application/javascript

---

### Requirement: Deployment Cleanup

The system SHALL manage old versions and prevent unbounded storage growth in the `mfes-prod` container.

#### Scenario: Retain N recent versions

- **WHEN** the cleanup script runs
- **THEN** it SHALL keep the 10 most recent versions of each MFE (via `az storage blob list --prefix <mfe-name>/v`)
- **AND** SHALL delete older versions from `mfes-prod` via `az storage blob delete-batch`

#### Scenario: Never delete active versions

- **WHEN** cleanup identifies versions to delete
- **THEN** it SHALL check if the version is referenced in the current `manifest.json` or `remotes.config.prod.json`
- **AND** SHALL skip deletion if the version is actively used

#### Scenario: Manual cleanup override

- **WHEN** running cleanup with --keep-all flag
- **THEN** the script SHALL NOT delete any versions
- **WHEN** running cleanup with --keep=N flag
- **THEN** the script SHALL keep N most recent versions
