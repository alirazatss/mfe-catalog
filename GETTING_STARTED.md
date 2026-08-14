# Getting Started with the Micro-Frontend Shell

A practical guide to running and developing with the dynamic micro-frontend system.

## Prerequisites

- **Node.js** 22.18.0 or later (check `.nvmrc` for pinned version)
- **pnpm** 11.10.0 or later (the workspace package manager)
- A terminal (bash, zsh, or similar)

To verify your setup:

```bash
node --version    # Should be v22.18.0 or higher
pnpm --version    # Should be 11.10.0 or higher
```

## Installation

Clone the repository and install dependencies:

```bash
# Clone the repository (if you haven't already)
git clone <repo-url> mfe-runtine
cd mfe-runtine

# Install all workspace dependencies
pnpm install

# Verify the setup
pnpm ready  # Runs type check, tests, and builds
```

This installs dependencies for the host, all micro-frontends, and shared packages in one step.

## Running the Project

### Option 1: Start Everything (Recommended for Development)

```bash
pnpm dev:all
```

This starts:

- **Host (Shell)** at `http://localhost:5173`
- **mfe-widget** at `http://localhost:5174`

Open `http://localhost:5173` in your browser. The shell loads the micro-frontend automatically.

### Option 2: Run Host and Micro-Frontends Separately

Start the shell (host):

```bash
pnpm dev:host
# or
pnpm dev
```

In another terminal, start the micro-frontend:

```bash
pnpm dev:remote
# or
pnpm turbo dev --filter '@mfe-runtine/mfe-widget'
```

### Option 3: Run Only Specific Apps

Start just the host:

```bash
pnpm dev:host
```

Start only micro-frontends:

```bash
pnpm dev:mfe
```

Start a specific MFE by name:

```bash
pnpm turbo dev --filter mfe-widget
```

## Understanding the Shell and Micro-Frontends

### The Shell (Host)

The **shell** is the main application container that:

- Runs on port **5173**
- Loads and manages micro-frontends
- Provides a consistent navigation and layout
- Handles shared concerns like authentication

Think of it as the "outer frame" where micro-frontends are loaded and displayed.

### Micro-Frontends (MFEs)

A **micro-frontend** is an independently developed and deployed feature. Each MFE:

- Has its own port (e.g., `mfe-widget` on port 5174)
- Is developed and tested independently
- Gets loaded dynamically by the shell at runtime
- Exposes React components or other features

In this setup, `mfe-widget` is a counter example you can load and interact with.

## How the Shell Works

### 1. Automatic Discovery

When you build or run the project, the monorepo automatically discovers all micro-frontends by scanning `apps/mfes/mfe-*` directories.

### 2. Configuration Generation

A `remotes.config.json` file is auto-generated that tells the shell:

- Which micro-frontends are available
- Where each MFE is located (localhost in dev, CDN in prod)
- Which features each MFE exposes

You don't need to edit this file—it's regenerated each time you build.

### 3. Dynamic Loading

When the shell starts, it:

1. Fetches the `remotes.config.json`
2. Loads micro-frontends on demand
3. Mounts them into designated slots on the page
4. Handles errors if a micro-frontend fails to load

## Using the Shell

### In Development

1. Open `http://localhost:5173` in your browser
2. The shell displays the main interface
3. Interact with loaded micro-frontends as normal components
4. Changes to either the shell or MFEs auto-reload via HMR

### The Shell Layout

The shell provides a basic layout with:

- A header area (can be customized with Chrome MFEs)
- A main content area (where feature MFEs load)
- A sidebar (can be customized with Chrome MFEs)
- A footer (can be customized with Chrome MFEs)

Currently, the setup includes a simple widget MFE you can interact with.

## Development Workflow

### Working on the Shell

1. Open `apps/shells/website/src/` to modify shell code
2. Make your changes (layout, navigation, shared services)
3. Changes auto-reload in the browser
4. If changes affect micro-frontend loading, also restart MFEs

### Working on a Micro-Frontend

1. Open `apps/mfes/mfe-widget/src/` (or the MFE you're developing)
2. Make your changes (components, features, logic)
3. Changes auto-reload in the MFE's own browser tab
4. The shell automatically loads the updated version

### Example: Modifying the Widget

```bash
# Terminal 1: Start everything
pnpm dev:all

# Terminal 2: In another session, edit the widget
# Open apps/mfes/mfe-widget/src/components/CounterWidget.tsx
# Make changes to the counter
# Save and watch it reload automatically
```

## Generating Configuration

The configuration is automatically generated during development and build, but you can regenerate it manually:

```bash
# Generate config for development (uses localhost)
pnpm generate:config

# Dry-run (preview without writing)
pnpm tsx scripts/generate-config.ts --dry-run

# Generate for production (includes git hash for cache-busting)
NODE_ENV=production pnpm generate:config
```

## Running Tests

Run all tests across the monorepo:

```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage report
pnpm test:coverage

# Run with interactive UI
pnpm test:ui
```

Test a specific package:

```bash
pnpm turbo test --filter '@mfe-runtine/dynamic-loader'
pnpm turbo test --filter website
```

## Building for Production

Build all packages and applications:

```bash
# Full build with type check and tests
pnpm ready

# Just build (no checks)
pnpm build

# Build specific apps
pnpm build:host
pnpm build:remote
```

Outputs:

- Host builds to `apps/shells/website/dist/`
- MFEs build to `apps/mfes/mfe-widget/dist/`
- Packages build to `packages/*/dist/`

## Adding a New Micro-Frontend

To add a new micro-frontend to the shell:

1. **Create the MFE directory**:

```bash
mkdir apps/mfes/mfe-myfeature
cd apps/mfes/mfe-myfeature
```

2. **Create `package.json`**:

```json
{
  "name": "@mfe-runtine/mfe-myfeature",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest"
  },
  "dependencies": {
    "react": "catalog:"
  },
  "devDependencies": {
    "@module-federation/vite": "catalog:",
    "vite": "catalog:"
  }
}
```

3. **Create `vite.config.ts`** with Module Federation config (see `apps/mfes/mfe-widget/vite.config.ts` as a template)

4. **Create `src/main.tsx`** with your component

5. **Run the generator**:

```bash
pnpm generate:config
```

6. **Start the shell and your new MFE**:

```bash
pnpm dev:all
# or
pnpm dev:host  # In terminal 1
pnpm turbo dev --filter mfe-myfeature  # In terminal 2
```

The shell will automatically discover and load your new micro-frontend.

## Troubleshooting

### Port Already in Use

If a port is already in use, check what's running:

```bash
# macOS/Linux
lsof -i :5173  # For the host
lsof -i :5174  # For mfe-widget

# Windows
netstat -ano | findstr :5173
```

Kill the process or use a different terminal session.

### Config File Not Generated

If `remotes.config.json` is missing:

```bash
# Manually regenerate it
pnpm generate:config

# Then restart the dev server
pnpm dev:all
```

### Micro-Frontend Not Loading

1. Verify the MFE is running on its assigned port
2. Check browser console for errors
3. Generate a local override config for debugging:
   ```bash
   pnpm exec tsx scripts/generate-config.ts --environment local --shell website
   ```
4. Check `apps/shells/website/remotes.config.local.json` (if generated) or `config/remotes.config.dev.json`
5. Restart both the shell and the MFE

### Tests Failing

Ensure all dependencies are installed:

```bash
pnpm install

# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Common Commands Reference

| Command                | Purpose                                |
| ---------------------- | -------------------------------------- |
| `pnpm install`         | Install all dependencies               |
| `pnpm dev:all`         | Start shell + all MFEs                 |
| `pnpm dev:host`        | Start only the shell                   |
| `pnpm dev:mfe`         | Start all MFEs                         |
| `pnpm test`            | Run all tests                          |
| `pnpm build`           | Build everything                       |
| `pnpm generate:config` | Regenerate MFE configuration           |
| `pnpm ready`           | Full validation (check + test + build) |

## Environment Variables

Development variables can be set in `.env.local` (create if it doesn't exist):

```bash
# Example .env.local
VITE_API_BASE=http://localhost:3000
VITE_AUTH_URL=http://localhost:8080
```

These are available in code as `import.meta.env.VITE_*`.

## Next Steps

1. **Explore the codebase**: Start with `apps/shells/website/src/main.ts` to understand how the shell initializes
2. **Read the specs**: Check `openspec/specs/` for detailed feature specifications
3. **Review architecture**: See `CONTEXT.md` for terminology and architectural decisions
4. **Try modifications**: Edit the widget counter in `apps/mfes/mfe-widget/src/components/CounterWidget.tsx` and watch it reload

## Getting Help

- **Architecture questions**: See [CONTEXT.md](CONTEXT.md)
- **Project roadmap**: See [ROADMAP.md](ROADMAP.md)
- **Specifications**: Browse [openspec/](openspec/) for detailed specs
- **Code organization**: Check [README.md](README.md) for project structure details

## Additional Resources

- [Vite+ Documentation](https://viteplus.dev/guide/)
- [Module Federation Docs](https://webpack.js.org/concepts/module-federation/)
- [Turborepo Guide](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
