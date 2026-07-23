## 1. Project Dependencies and Configuration

- [ ] 1.1 Install `@module-federation/vite` package in root package.json
- [ ] 1.2 Install `@module-federation/vite` in apps/shells/website package.json
- [ ] 1.3 Update pnpm-lock.yaml with new dependencies

**Depends on**: None  
**Skill**: Use #file:~/.agents/skills/architect/SKILL.md  
**Estimate**: 30 minutes

## 2. Remote Widget Application Setup

- [ ] 2.1 Create apps/mfes/remote-widget directory structure
- [ ] 2.2 Create apps/mfes/remote-widget/package.json with React and Vite dependencies
- [ ] 2.3 Create apps/mfes/remote-widget/vite.config.ts with federation plugin configuration
- [ ] 2.4 Create apps/mfes/remote-widget/tsconfig.json for TypeScript configuration
- [ ] 2.5 Create apps/mfes/remote-widget/index.html as entry point
- [ ] 2.6 Create apps/mfes/remote-widget/src/main.tsx for standalone rendering

**Depends on**: Section 1 (dependencies installed)  
**Skill**: Use #file:~/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 1-2 hours

## 3. Sample Widget Component Implementation

- [ ] 3.1 Create apps/mfes/remote-widget/src/components/CounterWidget.tsx with counter logic
- [ ] 3.2 Add state management for increment/decrement functionality
- [ ] 3.3 Create apps/mfes/remote-widget/src/components/CounterWidget.module.css for scoped styling
- [ ] 3.4 Add TypeScript prop interface for widget customization (initialValue, theme)
- [ ] 3.5 Create apps/mfes/remote-widget/src/components/ErrorBoundary.tsx for error handling
- [ ] 3.6 Add error boundary wrapper around CounterWidget
- [ ] 3.7 Create apps/mfes/remote-widget/src/types.d.ts for TypeScript declarations

**Depends on**: Section 2 (remote app structure ready)  
**Skill**: Use #file:~/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 2-3 hours

## 4. Remote Federation Configuration

- [ ] 4.1 Configure federation plugin in apps/mfes/remote-widget/vite.config.ts to expose CounterWidget
- [ ] 4.2 Set remote name as "remoteWidget" in federation config
- [ ] 4.3 Configure shared dependencies (react, react-dom) as singleton
- [ ] 4.4 Set remote dev server port to 5174
- [ ] 4.5 Configure remote build output with remoteEntry.js
- [ ] 4.6 Add remote development script to apps/mfes/remote-widget/package.json

**Depends on**: Section 3 (widget component ready)  
**Skill**: Use #file:~/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 1-2 hours

## 5. Host Application Federation Configuration

- [ ] 5.1 Configure federation plugin in apps/shells/website/vite.config.ts as host
- [ ] 5.2 Add remote "remoteWidget" with URL http://localhost:5174/assets/remoteEntry.js for dev
- [ ] 5.3 Configure shared dependencies (react, react-dom) to match remote
- [ ] 5.4 Set host dev server port to 5173 (default)
- [ ] 5.5 Configure production remote URL pattern (environment variable support)

**Depends on**: Section 4 (remote federation configured)  
**Skill**: Use #file:~/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 1 hour

## 6. Host Application Integration

- [ ] 6.1 Create apps/shells/website/src/types/remotes.d.ts with module declarations for remoteWidget
- [ ] 6.2 Create apps/shells/website/src/components/RemoteWidgetLoader.tsx for dynamic import
- [ ] 6.3 Add React.lazy and Suspense wrapper for remote loading
- [ ] 6.4 Create error boundary for remote loading failures
- [ ] 6.5 Add loading fallback UI component
- [ ] 6.6 Add error fallback UI component
- [ ] 6.7 Integrate RemoteWidgetLoader into main App component or demo page

**Depends on**: Section 5 (host federation configured)  
**Skill**: Use #file:~/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 2-3 hours

## 7. TypeScript Type Definitions

- [ ] 7.1 Generate .d.ts file for CounterWidget component
- [ ] 7.2 Copy type definitions to apps/shells/website/src/types/remoteWidget.d.ts
- [ ] 7.3 Ensure TypeScript compiler recognizes remote module types
- [ ] 7.4 Test IDE autocomplete for CounterWidget props in host application
- [ ] 7.5 Document type definition update process in README

**Depends on**: Section 6 (integration complete)  
**Skill**: Use #file:~/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 1 hour

## 8. Development Workflow Setup

- [ ] 8.1 Add "dev:remote" script to root package.json to run remote-widget dev server
- [ ] 8.2 Add "dev:host" script to root package.json to run website dev server
- [ ] 8.3 Add "dev:all" script to run both host and remote concurrently
- [ ] 8.4 Test concurrent development servers startup
- [ ] 8.5 Verify hot module replacement works in both host and remote
- [ ] 8.6 Test making changes to remote widget and seeing updates in host

**Depends on**: Section 7 (types configured)  
**Skill**: Use #file:~/.agents/skills/architect/SKILL.md  
**Estimate**: 1 hour

## 9. Production Build Configuration

- [ ] 9.1 Test production build of remote-widget application
- [ ] 9.2 Verify remoteEntry.js is generated in dist/assets/
- [ ] 9.3 Test production build of website application
- [ ] 9.4 Verify host bundle references remote correctly
- [ ] 9.5 Configure build output paths for remote deployment
- [ ] 9.6 Add build scripts for remote and host in root package.json
- [ ] 9.7 Test production builds work together (serve both locally)

**Depends on**: Section 8 (development workflow working)  
**Skill**: Use #file:~/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 2 hours

## 10. Testing and Validation

- [ ] 10.1 Create unit tests for CounterWidget component using Vitest
- [ ] 10.2 Create unit tests for error boundary component
- [ ] 10.3 Test remote widget loads successfully in host (manual testing)
- [ ] 10.4 Test error boundary triggers when remote fails to load
- [ ] 10.5 Test widget state management (increment/decrement)
- [ ] 10.6 Test prop passing from host to remote widget
- [ ] 10.7 Test theme customization via props
- [ ] 10.8 Verify no React version conflicts in browser console
- [ ] 10.9 Test HMR in development mode for both host and remote
- [ ] 10.10 Validate TypeScript compilation with no errors

**Depends on**: Section 9 (production build working)  
**Skill**: Use #file:~/.agents/skills/tester/SKILL.md  
**Estimate**: 3-4 hours

## 11. Documentation

- [ ] 11.1 Create apps/mfes/remote-widget/README.md with setup instructions
- [ ] 11.2 Document how to create new remote applications
- [ ] 11.3 Document how to consume remote modules in host
- [ ] 11.4 Add troubleshooting section for common Module Federation issues
- [ ] 11.5 Document development workflow (running host + remote concurrently)
- [ ] 11.6 Document production build and deployment requirements
- [ ] 11.7 Add architecture diagram showing host and remote relationship
- [ ] 11.8 Update root README.md with microfrontend architecture overview

**Depends on**: Section 10 (testing complete)  
**Owner**: Technical writer or frontend developer  
**Estimate**: 2-3 hours

## 12. Code Review and Cleanup

- [ ] 12.1 Review all vite.config.ts files for consistency
- [ ] 12.2 Remove any console.log statements used for debugging
- [ ] 12.3 Ensure all components have proper TypeScript types
- [ ] 12.4 Run `vp check` to lint and format all code
- [ ] 12.5 Verify no TypeScript errors with `vp build`
- [ ] 12.6 Check for unused dependencies
- [ ] 12.7 Ensure error messages are user-friendly
- [ ] 12.8 Verify all tasks from specs are implemented

**Depends on**: Section 11 (documentation complete)  
**Skill**: Use #file:~/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 1-2 hours
