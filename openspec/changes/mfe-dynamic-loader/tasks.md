# Implementation Tasks

## 1. Create Dynamic Loader Package Structure

- [ ] 1.1 Create `packages/dynamic-loader/` directory
- [ ] 1.2 Initialize package.json: name `@mf-mono/dynamic-loader`, version `0.1.0`
- [ ] 1.3 Add TypeScript config with strict mode
- [ ] 1.4 Add dependency: `@mf-mono/remote-config` (workspace protocol)
- [ ] 1.5 Create src/ structure: `DynamicLoader.ts`, `config.ts`, `events.ts`
- [ ] 1.6 Export DynamicLoader class from `index.ts`

**Depends on**: mfe-convention-and-packages complete  
**Estimate**: 1 hour

## 2. Implement Config Fetching

- [ ] 2.1 Implement `packages/dynamic-loader/src/config.ts`
- [ ] 2.2 Add `fetchConfig()` function to load JSON from `/remotes.config.json`
- [ ] 2.3 Implement environment detection (NODE_ENV) for config file selection
- [ ] 2.4 Implement fallback chain: `.{env}.json` → `.json`
- [ ] 2.5 Add retry logic (2 retries with 1-second delay)
- [ ] 2.6 Integrate validation using `@mf-mono/remote-config`
- [ ] 2.7 Cache validated config in memory
- [ ] 2.8 Write unit tests for config fetching

**Depends on**: Section 1  
**Estimate**: 3-4 hours

## 3. Implement Event System

- [ ] 3.1 Implement `packages/dynamic-loader/src/events.ts`
- [ ] 3.2 Create EventEmitter wrapper or simple pub/sub
- [ ] 3.3 Define event types (config-load-start, remote-load-success, etc.)
- [ ] 3.4 Export typed event emitter
- [ ] 3.5 Write unit tests for events

**Depends on**: Section 1  
**Estimate**: 1-2 hours

## 4. Implement Core Loader Class

- [ ] 4.1 Implement `packages/dynamic-loader/src/DynamicLoader.ts`
- [ ] 4.2 Add `init()` method to fetch and cache config
- [ ] 4.3 Implement `loadRemote(name)` method with dynamic import
- [ ] 4.4 Add remote lookup in cached config by name
- [ ] 4.5 Check `enabled` flag and skip disabled remotes
- [ ] 4.6 Emit events throughout lifecycle
- [ ] 4.7 Handle scope mapping (config.scope vs config.name)
- [ ] 4.8 Implement fallback URLs iteration
- [ ] 4.9 Add `getStatus()`, `preload()`, `clearCache()` methods
- [ ] 4.10 Write unit tests for loader (20+ scenarios)

**Depends on**: Sections 2 and 3  
**Estimate**: 6-8 hours

---

**Total**: 29 tasks, ~11-15 hours
