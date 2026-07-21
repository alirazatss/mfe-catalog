## 1. Manifest Schema & Validation

- [x] 1.1 Create `manifest.schema.json` with complete schema definition
- [x] 1.2 Add JSON schema validation to existing schema directory structure
- [x] 1.3 Create TypeScript types from manifest schema
- [x] 1.4 Write unit tests for manifest schema validation
- [x] 1.5 Document manifest format in README

**Depends on**: None (starting point)  
**Skill**: Backend developer or frontend developer  
**Estimate**: 2-3 hours

---

## 2. Manifest Generation Script

- [x] 2.1 Create `scripts/generate-manifest.ts` file
- [x] 2.2 Implement manifest structure generation from discovered MFEs
- [x] 2.3 Add SRI hash computation (SHA-384) for remoteEntry.js files
- [x] 2.4 Add git metadata extraction (commit SHA, timestamp)
- [x] 2.5 Implement environment-specific URL generation (dev/staging/prod)
- [x] 2.6 Add manifest JSON schema validation before output
- [x] 2.7 Write manifest to `manifest.production.json` (gitignored)
- [x] 2.8 Add CLI flags: `--env`, `--output`, `--cdn-base-url`
- [x] 2.9 Write unit tests for manifest generation logic
- [x] 2.10 Add integration test with sample MFE directory

**Depends on**: Section 1 (manifest schema)  
**Skill**: Use #file:~/.agents/skills/backend-developer/SKILL.md  
**Estimate**: 6-8 hours

---

## 3. Update Config Generation for Dual Format

- [ ] 3.1 Refactor `scripts/generate-config.ts` to support output format selection
- [ ] 3.2 Extract common MFE discovery logic into shared function
- [ ] 3.3 Implement remotes.config.json generation (existing format)
- [ ] 3.4 Implement manifest.json generation (new format)
- [ ] 3.5 Add `--format` flag to choose output (config | manifest)
- [ ] 3.6 Update package.json scripts: `generate:config` and `generate:manifest`
- [ ] 3.7 Update tests to cover both output formats
- [ ] 3.8 Ensure development workflow still generates remotes.config.json

**Depends on**: Section 2 (manifest generation)  
**Skill**: Use #file:~/.agents/skills/backend-developer/SKILL.md  
**Estimate**: 4-5 hours

---

## 4. Dynamic Loader Manifest Support

- [ ] 4.1 Add manifest parsing logic to dynamic-loader
- [ ] 4.2 Implement manifest-to-config transformation function
- [ ] 4.3 Update `loader.init()` to accept optional manifest parameter
- [ ] 4.4 Add localStorage caching for fetched manifest (24h TTL)
- [ ] 4.5 Implement cache expiration and fallback logic
- [ ] 4.6 Add SRI integrity attribute to script tags when available
- [ ] 4.7 Update loader to validate manifest schema on fetch
- [ ] 4.8 Add manifest version compatibility check
- [ ] 4.9 Write unit tests for manifest parsing and transformation
- [ ] 4.10 Write integration tests for manifest-based loading
- [ ] 4.11 Update dynamic-loader README with manifest documentation

**Depends on**: Section 1 (manifest schema)  
**Skill**: Use #file:~/.agents/skills/backend-developer/SKILL.md  
**Estimate**: 6-7 hours

---

## 5. Shell Bootstrap Manifest Integration

- [ ] 5.1 Update `apps/website/src/config/remotes.ts` to fetch manifest
- [ ] 5.2 Add environment-based manifest URL selection (dev/prod)
- [ ] 5.3 Implement manifest fetch with retry logic (3 attempts, exponential backoff)
- [ ] 5.4 Add timeout handling (10 second max)
- [ ] 5.5 Implement localStorage cache fallback on fetch failure
- [ ] 5.6 Add error UI for manifest fetch failures with retry button
- [ ] 5.7 Update shell initialization to wait for manifest before rendering
- [ ] 5.8 Add manifest polling for updates (every 5 minutes)
- [ ] 5.9 Display notification when new manifest version detected
- [ ] 5.10 Test with mock manifest URLs in development
- [ ] 5.11 Update website README with manifest bootstrap documentation

**Depends on**: Section 4 (dynamic loader manifest support)  
**Skill**: Use #file:~/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 5-6 hours

---

## 6. Versioning Infrastructure

- [ ] 6.1 Document semantic versioning policy in CONTRIBUTING.md
- [ ] 6.2 Add PR check script to validate version bumps in changed MFEs
- [ ] 6.3 Create `scripts/check-version-bump.ts` script
- [ ] 6.4 Add version bump check to GitHub Actions PR workflow
- [ ] 6.5 Add `.changeset` or conventional commits configuration (optional)
- [ ] 6.6 Document version bump workflow in README

**Depends on**: None  
**Skill**: DevOps engineer or backend developer  
**Estimate**: 3-4 hours

---

## 7. CDN Upload Script

- [ ] 7.1 Create `scripts/deploy-to-cdn.ts` script
- [ ] 7.2 Implement multi-CDN provider support (AWS S3, Cloudflare R2)
- [ ] 7.3 Add CLI arguments: `--mfe`, `--version`, `--provider`, `--bucket`
- [ ] 7.4 Implement directory upload with progress reporting
- [ ] 7.5 Set correct Content-Type headers per file extension
- [ ] 7.6 Set immutable cache headers for versioned assets
- [ ] 7.7 Implement file integrity verification after upload
- [ ] 7.8 Add retry logic for failed uploads (3 attempts)
- [ ] 7.9 Implement CDN cache invalidation for manifest updates
- [ ] 7.10 Write unit tests for upload logic (mocked CDN client)
- [ ] 7.11 Document CDN configuration in README

**Depends on**: None  
**Skill**: DevOps engineer or backend developer with cloud experience  
**Estimate**: 6-8 hours

---

## 8. GitHub Actions CI/CD Pipeline

- [ ] 8.1 Create `.github/workflows/deploy-mfes.yml` workflow file
- [ ] 8.2 Implement change detection job using Turborepo filter
- [ ] 8.3 Add matrix strategy for parallel MFE deployment
- [ ] 8.4 Implement build step with production optimizations
- [ ] 8.5 Add CDN upload step calling deploy-to-cdn script
- [ ] 8.6 Implement SRI hash computation and verification
- [ ] 8.7 Add git tag creation step (format: `<mfe-name>-v<version>`)
- [ ] 8.8 Implement manifest update job (atomic, after all MFEs succeed)
- [ ] 8.9 Add manifest upload to CDN step
- [ ] 8.10 Implement failure notification (Slack/Discord webhook)
- [ ] 8.11 Add success notification with deployment summary
- [ ] 8.12 Implement workflow_dispatch for manual deployments
- [ ] 8.13 Add environment-specific deployment (staging/production branches)
- [ ] 8.14 Test workflow on staging branch first
- [ ] 8.15 Document CI/CD workflow in README

**Depends on**: Sections 2, 3, 7 (manifest generation, config generation, CDN upload)  
**Skill**: DevOps engineer  
**Estimate**: 8-10 hours

---

## 9. CDN Infrastructure Setup

- [ ] 9.1 Provision CDN bucket (AWS S3 + CloudFront or Cloudflare R2)
- [ ] 9.2 Configure CORS headers for cross-origin requests
- [ ] 9.3 Enable Gzip/Brotli compression for text assets
- [ ] 9.4 Set up CDN custom domain (cdn.example.com)
- [ ] 9.5 Configure SSL/TLS certificate
- [ ] 9.6 Test manual file upload and download
- [ ] 9.7 Verify HTTPS and CORS headers work correctly
- [ ] 9.8 Set up CDN access credentials
- [ ] 9.9 Add credentials to GitHub Secrets (CDN_ACCESS_KEY, CDN_SECRET_KEY, etc.)
- [ ] 9.10 Document CDN configuration in infrastructure docs

**Depends on**: None (parallel with development)  
**Owner**: DevOps/Infrastructure team  
**Estimate**: 4-6 hours

---

## 10. Rollback Tooling

- [ ] 10.1 Create `scripts/rollback-mfe.ts` script
- [ ] 10.2 Implement CLI to rollback MFE to specific version
- [ ] 10.3 Fetch previous manifest from CDN or S3 version history
- [ ] 10.4 Update manifest with specified previous version
- [ ] 10.5 Upload updated manifest to CDN
- [ ] 10.6 Add validation to ensure rollback version exists on CDN
- [ ] 10.7 Create GitHub Action for one-click rollback
- [ ] 10.8 Document rollback procedure in RUNBOOK.md
- [ ] 10.9 Test rollback on staging environment

**Depends on**: Sections 2, 7 (manifest generation, CDN upload)  
**Skill**: DevOps engineer or backend developer  
**Estimate**: 4-5 hours

---

## 11. CDN Cleanup Script

- [ ] 11.1 Create `scripts/cleanup-cdn.ts` script
- [ ] 11.2 Implement logic to list all versions of each MFE on CDN
- [ ] 11.3 Determine N most recent versions to keep (default: 10)
- [ ] 11.4 Check if versions are referenced in any manifest before deletion
- [ ] 11.5 Implement dry-run mode to preview deletions
- [ ] 11.6 Add CLI flags: `--keep`, `--keep-all`, `--dry-run`
- [ ] 11.7 Implement batch deletion with progress reporting
- [ ] 11.8 Add cron job or scheduled GitHub Action for periodic cleanup
- [ ] 11.9 Document cleanup policy in README

**Depends on**: Section 7 (CDN upload script)  
**Skill**: DevOps engineer or backend developer  
**Estimate**: 3-4 hours

---

## 12. Testing & Validation

- [ ] 12.1 Write integration test for full deployment flow (local)
- [ ] 12.2 Test manifest generation with multiple MFEs
- [ ] 12.3 Test manifest fetching and parsing in shell
- [ ] 12.4 Test MFE loading from CDN URLs in shell
- [ ] 12.5 Test SRI hash verification (both valid and invalid)
- [ ] 12.6 Test manifest caching and expiration
- [ ] 12.7 Test manifest fetch failure fallback to cache
- [ ] 12.8 Test version pinning (load specific old version)
- [ ] 12.9 Test rollback procedure on staging
- [ ] 12.10 Perform end-to-end staging deployment test
- [ ] 12.11 Load test CDN with realistic traffic patterns
- [ ] 12.12 Verify CDN cache headers and immutability

**Depends on**: All previous sections  
**Skill**: Use #file:~/.agents/skills/tester/SKILL.md  
**Estimate**: 8-10 hours

---

## 13. Monitoring & Observability

- [ ] 13.1 Add telemetry for manifest fetch success/failure rates
- [ ] 13.2 Add metrics for MFE load times from CDN
- [ ] 13.3 Add SRI hash mismatch error tracking
- [ ] 13.4 Set up CDN bandwidth and request monitoring
- [ ] 13.5 Create dashboard for deployment pipeline metrics
- [ ] 13.6 Set up alerts for manifest fetch failure spikes
- [ ] 13.7 Add logging for manifest updates in CI pipeline
- [ ] 13.8 Document monitoring setup in README

**Depends on**: Section 12 (testing complete)  
**Owner**: DevOps/SRE team  
**Estimate**: 4-5 hours

---

## 14. Documentation & Training

- [ ] 14.1 Update main README.md with deployment architecture overview
- [ ] 14.2 Document manifest structure and schema in docs/MANIFEST.md
- [ ] 14.3 Create DEPLOYMENT.md guide for deploying MFEs
- [ ] 14.4 Create ROLLBACK.md runbook for emergency rollbacks
- [ ] 14.5 Document version bumping workflow in CONTRIBUTING.md
- [ ] 14.6 Add troubleshooting guide for common deployment issues
- [ ] 14.7 Create architecture diagram showing deployment flow
- [ ] 14.8 Record demo video of deployment workflow
- [ ] 14.9 Conduct team training session on new deployment process
- [ ] 14.10 Update onboarding docs for new developers

**Depends on**: All previous sections  
**Skill**: Technical writer or team lead  
**Estimate**: 6-8 hours

---

## 15. Production Rollout

- [ ] 15.1 Deploy pipeline to main branch
- [ ] 15.2 Deploy first MFE (mfe-widget) to production CDN
- [ ] 15.3 Verify manifest updates correctly on CDN
- [ ] 15.4 Deploy shell application to production with manifest fetching
- [ ] 15.5 Monitor manifest fetch success rate for first 24 hours
- [ ] 15.6 Monitor MFE load times and error rates
- [ ] 15.7 Verify rollback procedure works in production
- [ ] 15.8 Gradually onboard remaining MFEs to new deployment flow
- [ ] 15.9 Remove old static config fallbacks after stabilization
- [ ] 15.10 Conduct post-launch retrospective

**Depends on**: All previous sections  
**Skill**: Team lead coordinating with DevOps and frontend teams  
**Estimate**: Full week (iterative rollout)

---

## Total Effort Estimate

- **Development**: ~55-70 hours
- **Infrastructure**: ~8-11 hours
- **Testing**: ~8-10 hours
- **Documentation**: ~6-8 hours
- **Rollout**: ~20-30 hours

**Total**: ~100-130 hours (~3-4 weeks for a team of 2-3 developers)
