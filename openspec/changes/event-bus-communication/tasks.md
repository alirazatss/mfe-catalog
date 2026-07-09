## 1. Event Bus Package Setup

- [ ] 1.1 Create `packages/events/` directory structure
- [ ] 1.2 Create `packages/events/package.json` with zero dependencies
- [ ] 1.3 Create `packages/events/tsconfig.json` extending base config
- [ ] 1.4 Add build script to package.json
- [ ] 1.5 Add `@mf-mono/events` to workspace in pnpm-workspace.yaml

**Depends on**: None (starting point)  
**Skill**: Backend developer or frontend developer  
**Estimate**: 30 minutes

---

## 2. EventBus Class Implementation

- [ ] 2.1 Create `packages/events/src/EventBus.ts` extending native EventTarget
- [ ] 2.2 Implement `emit<T>(eventName: string, data?: T)` method
- [ ] 2.3 Implement `on<T>(eventName, handler)` method returning cleanup function
- [ ] 2.4 Implement `once<T>(eventName, handler)` method using { once: true } option
- [ ] 2.5 Export singleton instance: `export const eventBus = new EventBus()`
- [ ] 2.6 Add JSDoc comments for all public methods

**Depends on**: Section 1 (package setup)  
**Skill**: Frontend developer  
**Estimate**: 1-2 hours

---

## 3. Event Types and Constants

- [ ] 3.1 Create `packages/events/src/eventTypes.ts`
- [ ] 3.2 Define `MFE_EVENTS` constant object with auth event names
- [ ] 3.3 Add navigation event names to MFE_EVENTS
- [ ] 3.4 Add error event names to MFE_EVENTS
- [ ] 3.5 Define `MFEEventMap` interface mapping event names to payload types
- [ ] 3.6 Add JSDoc documentation for each event explaining when it's emitted

**Depends on**: None (can be parallel with Section 2)  
**Skill**: Frontend developer  
**Estimate**: 1 hour

---

## 4. Type-Safe Helper Functions

- [ ] 4.1 Create type-safe `emitMFEEvent<K>()` function in eventTypes.ts
- [ ] 4.2 Create type-safe `onMFEEvent<K>()` function in eventTypes.ts
- [ ] 4.3 Test TypeScript autocomplete works for event names
- [ ] 4.4 Test TypeScript autocomplete works for payload data
- [ ] 4.5 Test compile errors on wrong payload types

**Depends on**: Sections 2 and 3 (EventBus and types ready)  
**Skill**: Frontend developer  
**Estimate**: 1 hour

---

## 5. Package Exports

- [ ] 5.1 Create `packages/events/src/index.ts`
- [ ] 5.2 Export EventBus class and eventBus singleton
- [ ] 5.3 Export MFE_EVENTS constants
- [ ] 5.4 Export MFEEventMap type
- [ ] 5.5 Export emitMFEEvent and onMFEEvent helpers
- [ ] 5.6 Build package and verify exports work

**Depends on**: Sections 2, 3, 4 (all implementations ready)  
**Skill**: Frontend developer  
**Estimate**: 30 minutes

---

## 6. Unit Tests

- [ ] 6.1 Write test for eventBus singleton (same instance everywhere)
- [ ] 6.2 Write test for emit() dispatches CustomEvent
- [ ] 6.3 Write test for on() receives emitted event
- [ ] 6.4 Write test for cleanup function removes listener
- [ ] 6.5 Write test for once() fires only one time
- [ ] 6.6 Write test for multiple listeners on same event
- [ ] 6.7 Write test for emitMFEEvent type safety (use @ts-expect-error for invalid payloads)
- [ ] 6.8 Write test for onMFEEvent cleanup

**Depends on**: Section 5 (package ready)  
**Skill**: Tester  
**Estimate**: 2 hours

---

## 7. Migrate Navigation Events

- [ ] 7.1 Update `apps/website/src/utils/navigation.ts` to use eventBus.emit
- [ ] 7.2 Update `apps/website/src/components/NavigationEventListener.tsx` to use eventBus.on
- [ ] 7.3 Add cleanup function return in NavigationEventListener useEffect
- [ ] 7.4 Update `apps/mfe-widget/src/utils/navigation.ts` to use eventBus.emit
- [ ] 7.5 Test cross-MFE navigation still works
- [ ] 7.6 Remove direct CustomEvent usage (verify no magic strings remain)

**Depends on**: Section 5 (event bus package ready)  
**Skill**: Frontend developer  
**Estimate**: 1-2 hours

---

## 8. Add Auth Event Integration

- [ ] 8.1 Update AuthProvider to emit MFE_EVENTS.AUTH_LOGIN on successful login
- [ ] 8.2 Update AuthProvider to emit MFE_EVENTS.AUTH_LOGOUT on logout
- [ ] 8.3 Update tokenManager to emit MFE_EVENTS.AUTH_TOKEN_REFRESHED on refresh
- [ ] 8.4 Update tokenManager to emit MFE_EVENTS.AUTH_SESSION_EXPIRED on refresh failure
- [ ] 8.5 Update shell App.tsx to listen for AUTH_SESSION_EXPIRED and call logout
- [ ] 8.6 Test logout event received by MFEs (add console.log in mfe-widget for testing)

**Depends on**: Section 7 (migration complete) AND auth-token-management implementation  
**Skill**: Frontend developer  
**Estimate**: 1-2 hours

---

## 9. Documentation

- [ ] 9.1 Create `packages/events/README.md` with API documentation
- [ ] 9.2 Document eventBus.emit(), on(), once() methods
- [ ] 9.3 Document emitMFEEvent and onMFEEvent helpers
- [ ] 9.4 Add React usage example with useEffect cleanup
- [ ] 9.5 Document standard event catalog (all events in MFE_EVENTS)
- [ ] 9.6 Add section on preventing memory leaks
- [ ] 9.7 Add troubleshooting section (event not received, listener not cleaning up)

**Depends on**: Section 8 (all features implemented)  
**Skill**: Technical writer or frontend developer  
**Estimate**: 2 hours

---

## 10. Integration Testing

- [ ] 10.1 Test shell emits event, MFE receives it
- [ ] 10.2 Test MFE emits event, shell receives it
- [ ] 10.3 Test cleanup function removes listener (unmount component, verify handler not called)
- [ ] 10.4 Test once() fires only one time
- [ ] 10.5 Test multiple MFEs can listen to same event
- [ ] 10.6 Test navigation events work end-to-end
- [ ] 10.7 Test auth events work end-to-end

**Depends on**: Sections 7 and 8 (migration and auth events ready)  
**Skill**: Tester  
**Estimate**: 2 hours

---

## Total Effort Estimate

- **Setup**: ~30 minutes
- **EventBus Implementation**: ~1-2 hours
- **Types and Helpers**: ~2 hours
- **Exports**: ~30 minutes
- **Unit Tests**: ~2 hours
- **Migration**: ~1-2 hours
- **Auth Integration**: ~1-2 hours
- **Documentation**: ~2 hours
- **Integration Tests**: ~2 hours

**Total**: ~12-15 hours (~2 days for 1 developer)
