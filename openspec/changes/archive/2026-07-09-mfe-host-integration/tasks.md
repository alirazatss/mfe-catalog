# Implementation Tasks

## 1. Add Dynamic Loader Dependency

- [x] 1.1 Update `apps/shells/website/package.json` to add `@mfe-runtine/dynamic-loader` dependency
- [x] 1.2 Run `pnpm install` to link workspace package

**Depends on**: mfe-dynamic-loader complete  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 5 minutes

## 2. Initialize Dynamic Loader

- [x] 2.1 Update `apps/shells/website/src/config/remotes.ts` to import DynamicLoader
- [x] 2.2 Initialize loader: `const loader = new DynamicLoader(); await loader.init();`
- [x] 2.3 Export loader instance for use in other modules
- [x] 2.4 Add event listeners for logging (console.log on events)

**Depends on**: Section 1  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 1 hour

## 3. Update Remote Loading

- [x] 3.1 Update `apps/shells/website/src/RemoteWidgetLoader.ts` to use loader
- [x] 3.2 Replace `import("remoteWidget/CounterWidget")` with `loader.loadRemote('mfe-widget')`
- [x] 3.3 Update remote name from "remoteWidget" to "mfe-widget"
- [x] 3.4 Handle loader Promise (loading states, errors)

**Depends on**: Section 2  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 1-2 hours

## 4. Update Error Handling

- [x] 4.1 Update error boundary to show specific loader error messages
- [x] 4.2 Add message when config fails to load (with fallback info)
- [x] 4.3 Add message when remote not found in config
- [x] 4.4 Add message when remote is disabled
- [x] 4.5 Log all loader events appropriately (log/warn/error)
- [x] 4.6 Test error scenarios

**Depends on**: Section 3  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 2-3 hours

## 5. Maintain Static Config Fallback

- [x] 5.1 Keep static `vite.config.ts` remotes (commented, documented)
- [x] 5.2 Document fallback strategy in code comments
- [x] 5.3 Test fallback: delete config, verify static config used

**Depends on**: Section 4  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 30 minutes

## 6. Integration Testing

- [x] 6.1 Test: Config loads successfully
- [x] 6.2 Test: mfe-widget loads via dynamic loader
- [x] 6.3 Test: Widget renders in host
- [x] 6.4 Test: Hot reload works
- [x] 6.5 Test: Error scenarios (config missing, remote disabled)

**Depends on**: Section 5  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/tester/SKILL.md  
**Estimate**: 1-2 hours

---

**Total**: 22 tasks, ~6-9 hours
**Status**: ✅ All tasks completed
