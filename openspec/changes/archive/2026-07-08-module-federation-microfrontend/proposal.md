## Why

The monorepo currently runs a single website application without the ability to independently develop, deploy, and load frontend modules. As the application grows, teams need the ability to work on isolated features that can be deployed and updated independently without rebuilding the entire application. Module Federation enables true microfrontend architecture, allowing faster iteration cycles and better team autonomy.

## What Changes

- Enable Vite Module Federation plugin in the build configuration
- Create a new React microfrontend application (`apps/mfes/remote-widget`) that exposes a sample component
- Configure the main website (`apps/shells/website`) as a host application that can dynamically load remote modules
- Establish build and development workflow for both host and remote applications
- Add TypeScript support for federated modules with proper type declarations
- Configure runtime module loading with error boundaries and fallback UI

## Capabilities

### New Capabilities

- `module-federation-host`: Configuration and runtime loading of federated modules in the host application
- `module-federation-remote`: Exposing and bundling components as federated modules from remote applications
- `microfrontend-sample`: Sample React widget demonstrating end-to-end microfrontend integration

### Modified Capabilities

<!-- No existing capabilities are being modified -->

## Impact

**Affected Code:**

- `vite.config.ts` (root and app-level) - Module Federation plugin configuration
- `apps/shells/website/` - Host application setup with dynamic module loading
- New directory `apps/mfes/remote-widget/` - First microfrontend application
- Package dependencies - Add `@module-federation/vite` and related packages
- TypeScript configuration - Add type declarations for federated modules

**APIs & Contracts:**

- New module federation contracts defining exposed/consumed modules
- Runtime loading API for dynamic imports
- Shared dependency configuration (React, React-DOM)

**Development Workflow:**

- Developers need to run both host and remote apps concurrently during development
- Build process now includes federation manifest generation
- New deployment considerations for remote modules
