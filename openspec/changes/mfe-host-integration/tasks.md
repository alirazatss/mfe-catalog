# Implementation Tasks

## 1. Add Dynamic Loader Dependency

- [ ] 1.1 Update `apps/website/package.json` to add `@mf-mono/dynamic-loader` dependency
- [ ] 1.2 Run `pnpm install` to link workspace package

**Depends on**: mfe-dynamic-loader complete  
**Estimate**: 5 minutes

## 2. Initialize Dynamic Loader

- [ ] 2.1 Update `apps/website/src/config/remotes.ts` to import DynamicLoader
- [ ] 2.2 Initialize loader: `const loader = new DynamicLoader(); await loader.init();`
- [ ] 2.3 Export loader instance for use in other modules
- [ ] 2.4 Add event listeners for logging (console.log on events)

**Depends on**: Section 1  
**Estimate**: 1 hour

## 3. Update Remote Loading

- [ ] 3.1 Update `apps/website/src/RemoteWidgetLoader.ts` to use loader
- [ ] 3.2 Replace `import("remoteWidget/CounterWidget")` with `loader.loadRemote('mfe-widget')`
- [ ] 3.3 Update remote name from "remoteWidget" to "mfe-widget"
- [ ] 3.4 Handle loader Promise (loading states, errors)

**Depends on**: Section 2  
**Estimate**: 1-2 hours

## 4. Update Error Handling

- [ ] 4.1 Update error boundary to show specific loader error messages
- [ ] 4.2 Add message when config fails to load (with fallback info)
- [ ] 4.3 Add message when remote not found in config
- [ ] 4.4 Add message when remote is disabled
- [ ] 4.5 Log all loader events appropriately (log/warn/error)
- [ ] 4.6 Test error scenarios

**Depends on**: Section 3  
**Estimate**: 2-3 hours

## 5. Maintain Static Config Fallback

- [ ] 5.1 Keep static `vite.config.ts` remotes (commented, documented)
- [ ] 5.2 Document fallback strategy in code comments
- [ ] 5.3 Test fallback: delete config, verify static config used

**Depends on**: Section 4  
**Estimate**: 30 minutes

## 6. Integration Testing

- [ ] 6.1 Test: Config loads successfully
- [ ] 6.2 Test: mfe-widget loads via dynamic loader
- [ ] 6.3 Test: Widget renders in host
- [ ] 6.4 Test: Hot reload works
- [ ] 6.5 Test: Error scenarios (config missing, remote disabled)

**Depends on**: Section 5  
**Estimate**: 1-2 hours

---

**Total**: 22 tasks, ~6-9 hours
