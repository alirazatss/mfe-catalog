# Implementation Tasks

## 1. Add React Router Dependencies

- [ ] 1.1 Add `react-router-dom@^6.28.0` to `apps/website/package.json`
- [ ] 1.2 Add `@types/react-router-dom` to website dev dependencies
- [ ] 1.3 Add `react-router-dom` to pnpm catalog for future MFEs
- [ ] 1.4 Run `pnpm install` to update lockfile

**Depends on**: None  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 15 minutes

## 2. Create Router Configuration Infrastructure

- [ ] 2.1 Create `apps/website/src/router/types.ts` with route config types
- [ ] 2.2 Create `apps/website/src/router/routes.tsx` with route definitions
- [ ] 2.3 Create `apps/website/src/router/guards.ts` with guard utilities
- [ ] 2.4 Create `apps/website/src/router/index.ts` exporting router instance
- [ ] 2.5 Define RouteConfig type with path, mfeName, basePath, guards fields

**Depends on**: Section 1  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 1-2 hours

## 3. Implement Shell Router with MFE Routes

- [ ] 3.1 Create `apps/website/src/router/routes.tsx` with BrowserRouter setup
- [ ] 3.2 Add route `/` → HomePage component
- [ ] 3.3 Add route `/widget/*` → lazy-loaded mfe-widget
- [ ] 3.4 Integrate dynamic loader with React.lazy() for MFE loading
- [ ] 3.5 Add Suspense boundary with custom LoadingSpinner component
- [ ] 3.6 Add ErrorBoundary component for route errors
- [ ] 3.7 Export router instance from `apps/website/src/router/index.ts`

**Depends on**: Section 2  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 2-3 hours

## 4. Create Route Loader Functions

- [ ] 4.1 Create `apps/website/src/router/loaders.ts`
- [ ] 4.2 Implement `loadMFERoute(mfeName: string)` function
- [ ] 4.3 Integrate with dynamic loader: `await loader.loadRemote(mfeName)`
- [ ] 4.4 Extract module from container: `container.get("./App")`
- [ ] 4.5 Return lazy component factory compatible with React.lazy()
- [ ] 4.6 Add error handling for remote not found
- [ ] 4.7 Add error handling for module fetch failures

**Depends on**: Section 3  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 1-2 hours

## 5. Update Main Entry to Use Router

- [ ] 5.1 Update `apps/website/src/main.ts` to import router
- [ ] 5.2 Replace direct rendering with `<RouterProvider router={router} />`
- [ ] 5.3 Keep `initializeRemotes()` call before RouterProvider
- [ ] 5.4 Remove old RemoteWidgetLoader logic (now handled by router)
- [ ] 5.5 Test that app loads with router

**Depends on**: Section 4  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 30 minutes

## 6. Update MFE-Widget to Accept basePath

- [ ] 6.1 Update `apps/mfe-widget/src/components/CounterWidget.ts` signature
- [ ] 6.2 Add `basePath` prop with type `string` and default `"/"`
- [ ] 6.3 Update any internal links to use basePath (if applicable)
- [ ] 6.4 Add TypeScript interface for CounterWidget props including basePath
- [ ] 6.5 Test widget works with basePath="/widget" from shell
- [ ] 6.6 Test widget works standalone with basePath="/"

**Depends on**: Section 5  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 1 hour

## 7. Implement Route Guards

- [ ] 7.1 Create `apps/website/src/router/guards/requireAuth.ts`
- [ ] 7.2 Create `apps/website/src/router/guards/requireRole.ts`
- [ ] 7.3 Implement `requireAuth()` guard function (check auth status)
- [ ] 7.4 Implement `requireRole(role: string)` guard function
- [ ] 7.5 Add redirect to `/auth/login` with `redirect` query param
- [ ] 7.6 Export guards from `apps/website/src/router/guards/index.ts`
- [ ] 7.7 Add guard types to route configuration

**Depends on**: Section 3  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 2 hours

## 8. Create Cross-MFE Navigation Utilities

- [ ] 8.1 Create `packages/routing-utils/` package (optional shared package)
- [ ] 8.2 Create `apps/website/src/router/navigation.ts` for utilities
- [ ] 8.3 Implement `navigateTo(path: string, state?: any)` helper function
- [ ] 8.4 Helper SHALL dispatch CustomEvent `mfe:navigate`
- [ ] 8.5 Add path validation (ensure starts with `/`, no external URLs)
- [ ] 8.6 Add query parameter building from object
- [ ] 8.7 Export utilities from `apps/website/src/router/index.ts`

**Depends on**: Section 3  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 1-2 hours

## 9. Register Navigation Event Listeners in Shell

- [ ] 9.1 Update `apps/website/src/router/index.ts` or root component
- [ ] 9.2 Add useEffect hook to register `mfe:navigate` listener
- [ ] 9.3 Listener SHALL call `router.navigate(event.detail.path)`
- [ ] 9.4 Add path validation before navigating
- [ ] 9.5 Add cleanup function to remove listener on unmount
- [ ] 9.6 Add development logging for navigation events

**Depends on**: Section 8  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 1 hour

## 10. Create Layout Components

- [ ] 10.1 Create `apps/website/src/components/Layout.tsx` with header/footer
- [ ] 10.2 Add navigation menu with links to routes
- [ ] 10.3 Add `<Outlet />` for nested routes
- [ ] 10.4 Create `LoadingSpinner.tsx` component for Suspense fallback
- [ ] 10.5 Create `ErrorBoundary.tsx` component for route errors
- [ ] 10.6 Style components to match design system

**Depends on**: Section 3  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 2 hours

## 11. Add TypeScript Declarations for Router

- [ ] 11.1 Create `apps/website/src/types/router.d.ts`
- [ ] 11.2 Add types for MFE component props (including basePath)
- [ ] 11.3 Add types for route configuration
- [ ] 11.4 Add types for guard functions
- [ ] 11.5 Update `remotes.d.ts` to include basePath in MFE exports

**Depends on**: Section 6  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 30 minutes

## 12. Update Dynamic Loader for Router Integration

- [ ] 12.1 Update `packages/dynamic-loader/src/DynamicLoader.ts`
- [ ] 12.2 Add `preload(name: string)` method for route preloading
- [ ] 12.3 Enhance caching to prevent duplicate concurrent loads
- [ ] 12.4 Add status method to include loadedRemotes and failedRemotes
- [ ] 12.5 Ensure loader works with React.lazy() Promise interface
- [ ] 12.6 Add tests for concurrent loadRemote() calls

**Depends on**: Section 4  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 2-3 hours

## 13. Create Example MFE with Internal Routing

- [ ] 13.1 Update `apps/mfe-widget/` to have multiple "pages"
- [ ] 13.2 Add `router` prop to CounterWidget (accepts "browser" or "memory")
- [ ] 13.3 Implement MemoryRouter when integrated (router="memory")
- [ ] 13.4 Implement BrowserRouter when standalone (router="browser")
- [ ] 13.5 Create multiple routes: `/`, `/settings`, `/about`
- [ ] 13.6 Test MFE works integrated at `/widget/*` with basePath="/widget"
- [ ] 13.7 Test MFE works standalone at `/` with basePath="/"

**Depends on**: Section 6  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 2-3 hours

## 14. Implement Route-Based Code Splitting

- [ ] 14.1 Verify each MFE loads as separate chunk in network tab
- [ ] 14.2 Verify initial bundle does NOT include MFE code
- [ ] 14.3 Verify MFE loaded only when route accessed
- [ ] 14.4 Add route.lazy() if needed for further code splitting
- [ ] 14.5 Test production build bundle sizes

**Depends on**: Section 13  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 1 hour

## 15. Add Development Logging

- [ ] 15.1 Log navigation events in dev mode (`import.meta.env.DEV`)
- [ ] 15.2 Log route matches and MFE loads
- [ ] 15.3 Log guard execution (pass/fail)
- [ ] 15.4 Ensure production mode has NO logging
- [ ] 15.5 Add console.group for hierarchical logs

**Depends on**: Section 9  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 1 hour

## 16. Create Route Guards Tests

- [ ] 16.1 Create `apps/website/src/router/guards/__tests__/requireAuth.test.ts`
- [ ] 16.2 Test guard passes with authenticated user
- [ ] 16.3 Test guard redirects unauthenticated user to `/auth/login`
- [ ] 16.4 Test guard preserves original path in redirect param
- [ ] 16.5 Create tests for `requireRole` guard
- [ ] 16.6 Test role guard with valid and invalid roles

**Depends on**: Section 7  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/tester/SKILL.md  
**Estimate**: 2 hours

## 17. Create Integration Tests for Routing

- [ ] 17.1 Create `apps/website/src/__tests__/routing.integration.test.ts`
- [ ] 17.2 Test navigation from `/` to `/widget` loads MFE
- [ ] 17.3 Test deep linking to `/widget/settings` works
- [ ] 17.4 Test back button navigates correctly
- [ ] 17.5 Test cross-MFE navigation via events
- [ ] 17.6 Test lazy loading (MFE not loaded until route accessed)
- [ ] 17.7 Test error boundary catches MFE load failures

**Depends on**: Section 13  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/tester/SKILL.md  
**Estimate**: 3-4 hours

## 18. Update Documentation

- [ ] 18.1 Update `README.md` with routing architecture section
- [ ] 18.2 Document how to add new routes
- [ ] 18.3 Document basePath contract for MFEs
- [ ] 18.4 Document cross-MFE navigation pattern
- [ ] 18.5 Document route guards usage
- [ ] 18.6 Add examples of standalone MFE development
- [ ] 18.7 Update troubleshooting section with routing issues

**Depends on**: Section 17  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 2 hours

## 19. Create Migration Guide

- [ ] 19.1 Create `docs/MIGRATION_TO_ROUTING.md`
- [ ] 19.2 Document breaking changes from Phase 4 to Phase 5
- [ ] 19.3 Provide step-by-step migration for existing MFEs
- [ ] 19.4 Add code examples for before/after
- [ ] 19.5 Document how to test MFEs during migration

**Depends on**: Section 18  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 1-2 hours

## 20. End-to-End Testing

- [ ] 20.1 Start all dev servers: `pnpm turbo dev --filter=website --filter=@mf-mono/mfe-widget`
- [ ] 20.2 Test navigation: `/` → `/widget` → `/widget/settings`
- [ ] 20.3 Test back/forward buttons work correctly
- [ ] 20.4 Test deep linking to `/widget/settings` from fresh browser
- [ ] 20.5 Test cross-MFE navigation (if second MFE created)
- [ ] 20.6 Test route guards (if implemented)
- [ ] 20.7 Test production build and verify code splitting

**Depends on**: Section 19  
**Skill**: Use #file:/Users/ali.raza/.agents/skills/tester/SKILL.md  
**Estimate**: 2 hours

---

**Total**: 20 sections, ~75 tasks, estimated 30-40 hours

## Implementation Notes

- Sections 1-6 are core routing infrastructure (must complete first)
- Sections 7-9 add route guards and cross-MFE navigation (can be done in parallel)
- Sections 10-15 are enhancements and polish
- Sections 16-20 are testing and documentation

## Verification Checklist

After implementation, verify:

- [ ] Shell owns top-level routes
- [ ] MFEs receive basePath prop
- [ ] MFEs manage their own sub-routes
- [ ] Lazy loading works (network tab shows deferred MFE loads)
- [ ] Route guards enforce auth/authz
- [ ] Cross-MFE navigation via events works
- [ ] Browser history (back/forward) works correctly
- [ ] Deep linking works for all routes
- [ ] MFEs run standalone with basePath="/"
- [ ] Production build has code-split MFE bundles
