## ADDED Requirements

> Note: This capability extends the existing `.github/workflows/deploy-mfes.yml` (authored and owned by `azure-blob-deployment-pipeline`). It does not introduce a new workflow file, new triggers, or new credentials — only an additional `update-manifest` job appended to that workflow's existing jobs.

### Requirement: Turborepo Change Detection

The existing pipeline SHALL use Turborepo to detect which micro-frontends have changed.

#### Scenario: Detect changed MFEs

- **WHEN** a commit is pushed to main branch
- **THEN** the pipeline SHALL run `turbo run build --filter=[HEAD^1]`
- **AND** SHALL identify which MFE packages have changed since last deploy

#### Scenario: No changes detected

- **WHEN** a commit contains only documentation changes
- **THEN** Turborepo SHALL report no affected MFE packages
- **AND** pipeline SHALL skip MFE deployment steps

#### Scenario: Multiple MFEs changed

- **WHEN** a commit affects mfe-widget and mfe-products
- **THEN** pipeline SHALL deploy both MFEs
- **AND** SHALL update manifest with both new versions

Note: `azure-blob-deployment-pipeline`'s currently shipped `detect-changed-mfes` job uses git-diff based detection; migrating it to Turborepo filters is tracked in that change's task group 7 and is not duplicated by this requirement.

---

### Requirement: Selective MFE Deployment

The system SHALL deploy only micro-frontends that have changed.

#### Scenario: Deploy only changed MFE

- **WHEN** only mfe-widget has changes
- **THEN** pipeline SHALL build and deploy only mfe-widget
- **AND** SHALL NOT rebuild or redeploy mfe-products

#### Scenario: Shared dependency changes

- **WHEN** packages/dynamic-loader changes
- **THEN** pipeline SHALL detect all MFEs depending on it
- **AND** SHALL deploy all affected MFEs

---

### Requirement: GitHub Actions Workflow Triggers

The existing pipeline SHALL continue to trigger on the same Git events already established by `azure-blob-deployment-pipeline`.

#### Scenario: Trigger on main branch push

- **WHEN** code is pushed to main branch
- **THEN** the deployment workflow SHALL trigger automatically

#### Scenario: Trigger on version tags

- **WHEN** a git tag matching "mfe-\*-v\*" pattern is pushed
- **THEN** the deployment workflow SHALL trigger for that specific MFE

#### Scenario: Manual workflow dispatch

- **WHEN** user manually triggers workflow via GitHub UI
- **THEN** user SHALL select which MFEs to deploy
- **AND** pipeline SHALL deploy selected MFEs regardless of changes

---

### Requirement: Build Artifact Creation

The pipeline SHALL create production-optimized build artifacts.

#### Scenario: Production build with optimization

- **WHEN** building an MFE for deployment
- **THEN** pipeline SHALL run `turbo run build --filter=<mfe-name>`
- **AND** output SHALL be production-optimized with minification and tree-shaking

#### Scenario: Build artifact validation

- **WHEN** build completes
- **THEN** pipeline SHALL verify remoteEntry.js exists in dist/
- **AND** SHALL fail deployment if remoteEntry.js is missing

#### Scenario: Source map generation

- **WHEN** building for production
- **THEN** pipeline SHALL generate source maps
- **AND** SHALL upload source maps separately with restricted access

---

### Requirement: Azure Blob Storage Upload Process

The existing pipeline SHALL continue to upload build artifacts to `tssmfestorage` with versioned paths (already shipped by `azure-blob-deployment-pipeline`); this requirement documents the invariant this change relies on rather than re-implementing it.

#### Scenario: Upload to versioned path

- **WHEN** deploying mfe-widget version 1.2.3
- **THEN** pipeline SHALL upload dist/ contents to "mfes-prod/mfe-widget/v1.2.3/"
- **AND** remoteEntry.js SHALL be accessible at that blob path

#### Scenario: Upload verification

- **WHEN** files are uploaded to `tssmfestorage`
- **THEN** pipeline SHALL verify each file by fetching its URL
- **AND** SHALL fail deployment if any file is not reachable

#### Scenario: Immutable cache headers

- **WHEN** uploading versioned assets
- **THEN** the blob SHALL be set with Cache-Control: public, max-age=31536000, immutable
- **AND** versioned URLs SHALL never change content

---

### Requirement: Manifest Update After Deployment

The pipeline SHALL update the manifest after successful MFE deployment, via a new job appended to the existing workflow.

#### Scenario: Update manifest with new version

- **WHEN** mfe-widget 1.2.3 is successfully deployed
- **THEN** the `update-manifest` job SHALL update manifest.json
- **AND** SHALL change the mfe-widget entry to point to version 1.2.3

#### Scenario: Atomic manifest update

- **WHEN** deploying multiple MFEs in one matrix run
- **THEN** manifest SHALL be updated only after ALL MFEs in that run deploy successfully
- **AND** SHALL NOT partially update manifest if any deployment fails

#### Scenario: Manifest upload to Azure Blob Storage

- **WHEN** manifest is updated
- **THEN** pipeline SHALL upload new manifest.json to `mfes-<env>/manifest.json` using the existing OIDC identity
- **AND** SHALL set Cache-Control with 60 second max-age

---

### Requirement: Deployment Rollback Support

The pipeline SHALL support rolling back to previous MFE versions without deleting any deployed assets.

#### Scenario: Rollback via manifest revert

- **WHEN** user reverts manifest to previous commit
- **THEN** pipeline SHALL deploy that manifest version
- **AND** shell applications SHALL load previous MFE versions

#### Scenario: Keep old versions in Azure Blob Storage

- **WHEN** deploying a new MFE version
- **THEN** pipeline SHALL NOT delete previous versions from `mfes-prod`
- **AND** old versions SHALL remain accessible for rollback

---

### Requirement: Deployment Notifications

The pipeline SHALL notify on deployment success or failure.

#### Scenario: Success notification

- **WHEN** MFE deployment completes successfully
- **THEN** pipeline SHALL post message to configured Slack/Discord channel (if configured; otherwise this is a follow-up, not a blocker)
- **AND** message SHALL include MFE name, version, and deployment URL

#### Scenario: Failure notification

- **WHEN** deployment fails
- **THEN** pipeline SHALL post error message with logs link
- **AND** SHALL notify relevant team via GitHub PR comment if triggered by PR

---

### Requirement: Deployment Security

The pipeline SHALL implement security controls consistent with the OIDC-only, no-stored-secrets model `azure-blob-deployment-pipeline` already established.

#### Scenario: OIDC-based Azure authentication, no stored secrets

- **WHEN** pipeline needs Azure Blob Storage access
- **THEN** authentication SHALL use the existing `gha-mfe-dev`/`gha-mfe-prod` federated OIDC identities
- **AND** no storage account keys or connection strings SHALL be stored as GitHub Secrets

#### Scenario: SRI hash generation

- **WHEN** uploading remoteEntry.js
- **THEN** pipeline SHALL compute SHA-384 hash
- **AND** SHALL include hash in manifest integrity field

#### Scenario: Restricted branch deployment

- **WHEN** workflow is triggered
- **THEN** production deployment SHALL only occur from main branch or a matching version tag
- **AND** feature branches SHALL deploy to the `mfes-dev` container only
