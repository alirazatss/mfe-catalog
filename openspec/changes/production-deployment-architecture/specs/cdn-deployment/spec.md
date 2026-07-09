## ADDED Requirements

### Requirement: Versioned Asset Paths

The system SHALL store MFE assets in versioned CDN paths.

#### Scenario: Version-based path structure

- **WHEN** deploying mfe-widget version 1.2.3
- **THEN** all assets SHALL be uploaded to path "/<mfe-name>/1.2.3/"
- **AND** remoteEntry.js SHALL be at "/<mfe-name>/1.2.3/remoteEntry.js"

#### Scenario: Immutable versioned assets

- **WHEN** assets are uploaded to versioned path
- **THEN** CDN SHALL serve with Cache-Control: immutable, max-age=31536000
- **AND** existing versioned assets SHALL never be overwritten

---

### Requirement: CDN Upload Script

The system SHALL provide a script to upload build artifacts to CDN.

#### Scenario: Upload directory to CDN

- **WHEN** running `pnpm deploy:cdn --mfe=mfe-widget --version=1.2.3`
- **THEN** script SHALL upload all files from apps/mfe-widget/dist/ to CDN
- **AND** SHALL preserve directory structure under /<mfe-name>/<version>/

#### Scenario: Upload with progress reporting

- **WHEN** uploading files to CDN
- **THEN** script SHALL display progress for each file
- **AND** SHALL report total uploaded size and duration

#### Scenario: Upload failure handling

- **WHEN** CDN upload fails for any file
- **THEN** script SHALL exit with non-zero code
- **AND** SHALL log error details for failed file

---

### Requirement: Multi-CDN Support

The system SHALL support deploying to different CDN providers.

#### Scenario: AWS S3 + CloudFront deployment

- **WHEN** CDN_PROVIDER environment variable is set to "aws"
- **THEN** script SHALL upload to S3 bucket
- **AND** SHALL invalidate CloudFront cache after upload

#### Scenario: Cloudflare R2 deployment

- **WHEN** CDN_PROVIDER is set to "cloudflare"
- **THEN** script SHALL upload to R2 bucket
- **AND** SHALL purge Cloudflare cache after upload

#### Scenario: Generic S3-compatible storage

- **WHEN** CDN_PROVIDER is set to "s3"
- **THEN** script SHALL use generic S3 API with configurable endpoint

---

### Requirement: Asset Integrity Verification

The system SHALL verify uploaded assets match local builds.

#### Scenario: Compute file hashes before upload

- **WHEN** preparing to upload assets
- **THEN** script SHALL compute SHA-256 hash of each file
- **AND** SHALL store hashes for verification

#### Scenario: Verify uploaded file integrity

- **WHEN** file upload completes
- **THEN** script SHALL fetch file from CDN
- **AND** SHALL verify its hash matches local file hash
- **AND** SHALL fail deployment if hashes don't match

---

### Requirement: CDN Cache Invalidation

The system SHALL invalidate CDN caches for updated paths.

#### Scenario: Invalidate manifest after update

- **WHEN** new manifest.json is uploaded
- **THEN** script SHALL invalidate /manifest.json in CDN cache
- **AND** new manifest SHALL be served immediately

#### Scenario: Skip invalidation for versioned assets

- **WHEN** uploading versioned MFE assets
- **THEN** script SHALL NOT invalidate those paths
- **AND** SHALL rely on versioned URLs for cache busting

---

### Requirement: CDN Configuration Management

The system SHALL manage CDN-specific configuration.

#### Scenario: CORS headers on CDN

- **WHEN** MFE assets are served from CDN
- **THEN** CDN SHALL return Access-Control-Allow-Origin: \*
- **AND** SHALL support cross-origin requests from shell domain

#### Scenario: Content-Type headers

- **WHEN** serving remoteEntry.js
- **THEN** CDN SHALL return Content-Type: application/javascript
- **WHEN** serving CSS files
- **THEN** CDN SHALL return Content-Type: text/css

#### Scenario: Gzip/Brotli compression

- **WHEN** serving text assets (JS, CSS, HTML, JSON)
- **THEN** CDN SHALL apply gzip or brotli compression
- **AND** SHALL respect Accept-Encoding header from client

---

### Requirement: CDN Regional Distribution

The system SHALL deploy assets to multiple CDN regions.

#### Scenario: Multi-region upload

- **WHEN** deploying to production
- **THEN** assets SHALL be replicated to CDN edge locations globally
- **AND** users SHALL receive assets from nearest geographic region

#### Scenario: Regional failover

- **WHEN** primary CDN region is unavailable
- **THEN** requests SHALL automatically failover to next nearest region
- **AND** shell applications SHALL continue loading MFEs

---

### Requirement: Deployment Cleanup

The system SHALL manage old versions and prevent unbounded storage growth.

#### Scenario: Retain N recent versions

- **WHEN** deployment cleanup runs
- **THEN** script SHALL keep 10 most recent versions of each MFE
- **AND** SHALL delete older versions from CDN

#### Scenario: Never delete active versions

- **WHEN** cleanup identifies versions to delete
- **THEN** script SHALL check if version is referenced in any manifest
- **AND** SHALL skip deletion if version is actively used

#### Scenario: Manual cleanup override

- **WHEN** running cleanup with --keep-all flag
- **THEN** script SHALL NOT delete any versions
- **WHEN** running cleanup with --keep=N flag
- **THEN** script SHALL keep N most recent versions
