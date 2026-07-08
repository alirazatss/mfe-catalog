# Implementation Tasks

## 1. Install Turborepo and Setup Base Configuration

- [x] 1.1 Install Turborepo: `pnpm add -Dw turbo`
- [x] 1.2 Create `turbo.json` with basic pipeline (build, dev, test tasks)
- [x] 1.3 Update root `package.json` scripts to use `turbo` commands
- [x] 1.4 Test Turborepo: `turbo build` should build both website and remote-widget
- [x] 1.5 Verify caching: run `turbo build` twice, second run should be instant (cached)
- [x] 1.6 Add `.turbo/` to `.gitignore`

**Status**: ✅ COMPLETED  
**Verification**: Run `pnpm build` twice - second run completes in ~7ms with "FULL TURBO"
