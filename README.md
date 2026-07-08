# Vite+ Monorepo with Module Federation

A Vite+ monorepo demonstrating **microfrontend architecture** using Module Federation.

## Architecture

This monorepo contains:

- **Host Application** (`apps/website`) - Main application that loads remote microfrontends
- **Remote Widget** (`apps/remote-widget`) - Standalone microfrontend exposing a CounterWidget component
- **Shared Packages** (`packages/utils`) - Common utilities

### Microfrontend Architecture

```
┌─────────────────────────────────────────┐
│         Host Application                │
│        (apps/website)                   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   Dynamically Loaded Remote     │   │
│  │   ┌─────────────────────────┐   │   │
│  │   │   CounterWidget         │   │   │
│  │   │   (remote-widget)       │   │   │
│  │   └─────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

The host and remote run on different ports during development:

- **Host**: `http://localhost:5173`
- **Remote**: `http://localhost:5174`

## Development

### Quick Start (Run Both Applications)

```bash
pnpm install
pnpm run dev:all
```

This starts both the host and remote applications concurrently.

### Run Applications Individually

**Host only:**

```bash
pnpm run dev:host
# or
pnpm dev
```

**Remote only:**

```bash
pnpm run dev:remote
```

### Development Workflow

1. Start the remote widget first (it must be running for the host to load it):

   ```bash
   pnpm run dev:remote
   ```

2. In a new terminal, start the host application:

   ```bash
   pnpm run dev:host
   ```

3. Open `http://localhost:5173` to see the host application with the remote widget loaded

4. Make changes to either application and see hot module replacement in action

## Building

### Build All Applications

```bash
pnpm run build
```

### Build Individually

```bash
pnpm run build:host     # Build host application
pnpm run build:remote   # Build remote widget
```

## Module Federation Setup

### Remote Configuration (`apps/remote-widget/vite.config.ts`)

```typescript
federation({
  name: "remoteWidget",
  filename: "remoteEntry.js",
  exposes: {
    "./CounterWidget": "./src/components/CounterWidget.ts",
  },
});
```

### Host Configuration (`apps/website/vite.config.ts`)

```typescript
federation({
  name: "host",
  remotes: {
    remoteWidget: {
      type: "module",
      name: "remoteWidget",
      entry: "http://localhost:5174/assets/remoteEntry.js",
      entryGlobalName: "remoteWidget",
      shareScope: "default",
    },
  },
});
```

## Project Structure

```
mf-mono/
├── apps/
│   ├── website/              # Host application
│   │   ├── src/
│   │   │   ├── main.ts       # Main entry with remote loader
│   │   │   ├── RemoteWidgetLoader.ts  # Remote loading logic
│   │   │   └── types/
│   │   │       └── remotes.d.ts  # TypeScript declarations for remotes
│   │   └── vite.config.ts    # Host federation config
│   │
│   └── remote-widget/        # Remote microfrontend
│       ├── src/
│       │   ├── components/
│       │   │   └── CounterWidget.ts  # Exposed component
│       │   ├── main.ts       # Standalone entry
│       │   └── types.d.ts    # Type declarations
│       └── vite.config.ts    # Remote federation config
│
├── packages/
│   └── utils/                # Shared utilities
│
├── openspec/                 # OpenSpec documentation
│   ├── specs/                # Feature specifications
│   └── changes/              # Change proposals
│
└── package.json              # Root package with dev scripts
```

## Testing

- Check everything is ready:

```bash
vp run ready
```

- Run the tests:

```bash
vp run -r test
```

## Features

### Module Federation

- ✅ Dynamic loading of remote microfrontends
- ✅ TypeScript support with type safety
- ✅ Hot module replacement for both host and remote
- ✅ Error boundaries with fallback UI
- ✅ Loading states
- ✅ Standalone remote development

### CounterWidget Component

- Interactive counter with increment/decrement
- Theme support (light/dark)
- CSS-in-JS for style isolation
- Event callbacks
- Full TypeScript API

## Technologies

- **Build Tool**: Vite + Vite Plus
- **Module Federation**: `@module-federation/vite`
- **Language**: TypeScript
- **Package Manager**: pnpm (workspaces)
- **Specification**: OpenSpec for requirements

## Documentation

- [Remote Widget README](./apps/remote-widget/README.md) - Remote application docs
- [OpenSpec Changes](./openspec/changes/module-federation-microfrontend/) - Feature specification

## Troubleshooting

### Remote widget not loading

1. Ensure the remote application is running on port 5174:

   ```bash
   pnpm run dev:remote
   ```

2. Check the browser console for errors

3. Verify the remote entry URL is accessible: `http://localhost:5174/assets/remoteEntry.js`

### TypeScript errors for remote modules

1. Ensure type declarations exist in `apps/website/src/types/remotes.d.ts`
2. Restart TypeScript server in your IDE

### Port conflicts

If ports 5173 or 5174 are already in use, update the ports in:

- `apps/website/vite.config.ts` (host port)
- `apps/remote-widget/vite.config.ts` (remote port)
- `apps/website/vite.config.ts` remotes configuration (remote entry URL)

## Learn More

- [Module Federation](https://module-federation.io/) - Official Module Federation docs
- [Vite](https://vite.dev/) - Vite documentation
- [Vite Plus](https://viteplus.dev/) - Vite Plus documentation
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) - Specification-driven development
