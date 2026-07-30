## ADDED Requirements

### Requirement: GitHub Actions SHALL authenticate to Azure exclusively via OIDC federated identity

The system SHALL NOT store any Azure access key, connection string, or SAS token in GitHub repository secrets, environment secrets, or organization secrets. All Azure authentication SHALL occur via GitHub's OIDC token exchange with Azure AD federated credentials. The `azure/login` action SHALL be invoked with `client-id`, `tenant-id`, and `subscription-id` supplied as (non-secret) repository or environment variables.

#### Scenario: No Azure credentials stored as secrets

- **WHEN** the repository's secrets are enumerated
- **THEN** no secret name matches `AZURE_STORAGE_KEY`, `AZURE_CONNECTION_STRING`, `AZURE_SAS_TOKEN`, or `AZURE_CLIENT_SECRET`

#### Scenario: Workflow authenticates via OIDC

- **WHEN** a deploy workflow runs
- **THEN** it invokes `azure/login` with `client-id`, `tenant-id`, `subscription-id` and no `client-secret`
- **AND** it requests an ID token via `permissions: id-token: write`

### Requirement: One federated identity SHALL exist per environment with RBAC scoped to that environment's containers

The system SHALL provision exactly one Azure AD application per environment (`gha-mfe-dev`, `gha-mfe-prod`). Each application SHALL hold the `Storage Blob Data Contributor` role assignment **scoped to the container level** (not the storage account level), and only on that environment's containers. `gha-mfe-dev` SHALL be assigned Contributor on `mfes-dev` and `dev-shell` only. `gha-mfe-prod` SHALL be assigned Contributor on `mfes-prod` and `$web` only. Neither application SHALL hold any account-level role or any role on the other environment's containers.

#### Scenario: Dev identity has no prod access

- **WHEN** RBAC assignments for `gha-mfe-dev` are inspected
- **THEN** it has `Storage Blob Data Contributor` scoped to containers `mfes-dev` and `dev-shell` only
- **AND** it has no role assignment on containers `mfes-prod` or `$web`
- **AND** it has no account-level role assignment on `tssmfestorage`

#### Scenario: Prod identity has no dev access

- **WHEN** RBAC assignments for `gha-mfe-prod` are inspected
- **THEN** it has `Storage Blob Data Contributor` scoped to containers `mfes-prod` and `$web` only
- **AND** it has no role assignment on containers `mfes-dev` or `dev-shell`
- **AND** it has no account-level role assignment on `tssmfestorage`

### Requirement: Prod federated credential SHALL restrict issuance to tag refs matching `*-v*`

The system SHALL configure the federated credential for `gha-mfe-prod` with a subject condition of `repo:<owner>/<repo>:ref:refs/tags/*-v*`. Token issuance SHALL fail for any push, pull request, or workflow_dispatch event, and for any tag that does not match the pattern.

#### Scenario: Prod token issuance succeeds for matching tag

- **GIVEN** the tag `mfe-widget-v1.2.0` is pushed
- **WHEN** the workflow requests an Azure AD token via OIDC for the prod identity
- **THEN** the token is issued

#### Scenario: Prod token issuance fails for push to main

- **GIVEN** a push to `main` triggers a workflow that attempts to obtain a prod token
- **WHEN** the workflow requests an Azure AD token via OIDC for the prod identity
- **THEN** the token exchange fails

#### Scenario: Prod token issuance fails for non-matching tag

- **GIVEN** a tag `release-2026-08` is pushed
- **WHEN** the workflow requests an Azure AD token via OIDC for the prod identity
- **THEN** the token exchange fails

### Requirement: Dev federated credential SHALL restrict issuance to `main` branch and workflow_dispatch on `main`

The system SHALL configure the federated credential for `gha-mfe-dev` with a subject condition that permits token issuance for pushes and `workflow_dispatch` events on the `main` branch, and SHALL NOT permit issuance for pull request events or for pushes/dispatches on any other branch.

#### Scenario: Dev token issuance succeeds for push to main

- **GIVEN** a push to `main` triggers a deploy workflow
- **WHEN** the workflow requests an Azure AD token via OIDC for the dev identity
- **THEN** the token is issued

#### Scenario: Dev token issuance fails for pull request

- **GIVEN** a pull request from a feature branch triggers a workflow that attempts to obtain a dev token
- **WHEN** the workflow requests an Azure AD token via OIDC for the dev identity
- **THEN** the token exchange fails
