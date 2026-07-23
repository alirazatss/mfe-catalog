# @mfe-runtine/dynamic-loader

Runtime dynamic loader for Module Federation micro-frontends. Fetches generated `remotes.config.json` at runtime and dynamically loads remotes with retry logic, events, and caching.

## Features

- ✅ **Auto-discovery**: Fetches generated `remotes.config.json` at runtime
- ✅ **Retry logic**: Exponential backoff for network failures (2 retries)
- ✅ **Event system**: Lifecycle events for telemetry and debugging
- ✅ **Caching**: Memory-based config and remote container caching
- ✅ **Feature toggles**: Respect `enabled` flag in config
- ✅ **Preloading**: Preload remotes before they're needed
- ✅ **Singleton pattern**: Single global loader instance
- ✅ **Framework-agnostic**: Core package works without React

## Installation

```bash
pnpm add @mfe-runtine/dynamic-loader
```

## Usage

### Basic Usage

```typescript
import loader from "@mfe-runtine/dynamic-loader";

// Initialize loader (fetches config)
await loader.init();

// Load a remote
const container = await loader.loadRemote("mfe-widget");

// Use the remote (Module Federation)
const factory = await container.get("./App");
const Component = factory();
```

### With Event Listeners

```typescript
import loader from "@mfe-runtine/dynamic-loader";

// Listen to lifecycle events
loader.on("config:fetch:success", ({ config }) => {
  console.log("Config loaded:", config);
});

loader.on("remote:load:success", ({ name, container }) => {
  console.log(`Remote ${name} loaded`);
});

loader.on("remote:load:error", ({ name, error }) => {
  console.error(`Failed to load ${name}:`, error);
});

await loader.init();
```

### Preloading for Performance

```typescript
import loader from "@mfe-runtine/dynamic-loader";

await loader.init();

// Preload remote during app initialization
await loader.preload("mfe-analytics");

// Later, when needed, loads instantly
const container = await loader.loadRemote("mfe-analytics");
```

### Custom Config Path

```typescript
import loader from "@mfe-runtine/dynamic-loader";

await loader.init({
  configPath: "/custom-config.json",
  maxRetries: 3,
  retryDelay: 2000,
});
```

### Checking Status

```typescript
import loader from "@mfe-runtine/dynamic-loader";

const status = loader.getStatus();
console.log(status);
// {
//   initialized: true,
//   configLoaded: true,
//   remotesLoaded: ["mfe-widget", "mfe-analytics"]
// }
```

### Clear Cache

```typescript
import loader from "@mfe-runtine/dynamic-loader";

// Clear all cached data
loader.clearCache();

// Next init() will refetch config
await loader.init();
```

## API Reference

### `loader.init(options?): Promise<void>`

Fetch and cache the remote config.

**Options:**

- `configPath`: Config file path (default: `/remotes.config.json`)
- `maxRetries`: Maximum retry attempts (default: `2`)
- `retryDelay`: Base delay between retries in ms (default: `1000`)

**Events:**

- `config:fetch:start`
- `config:fetch:success`
- `config:fetch:error`

### `loader.loadRemote(name: string): Promise<Container>`

Load a remote by name. Returns Module Federation container.

**Throws:**

- `Error` if remote not found in config
- `Error` if remote is disabled
- `Error` if script loading fails

**Events:**

- `remote:load:start`
- `remote:load:success`
- `remote:load:error`

### `loader.preload(name: string): Promise<void>`

Preload a remote without initializing Module Federation.

**Events:**

- `remote:preload:success`

### `loader.getStatus(): LoaderStatus`

Get current loader state.

**Returns:**

```typescript
{
  initialized: boolean;
  configLoaded: boolean;
  remotesLoaded: string[];
}
```

### `loader.clearCache(): void`

Clear all cached config and remote containers.

### `loader.on(event, listener): () => void`

Register an event listener. Returns unsubscribe function.

**Events:**

- `config:fetch:start`
- `config:fetch:success` → `{ config: RemoteConfig }`
- `config:fetch:error` → `{ error: Error }`
- `remote:load:start` → `{ name: string }`
- `remote:load:success` → `{ name: string, container: any }`
- `remote:load:error` → `{ name: string, error: Error }`
- `remote:preload:success` → `{ name: string }`

### `loader.off(event, listener): void`

Remove an event listener.

## Error Handling

```typescript
import loader from "@mfe-runtine/dynamic-loader";

try {
  await loader.init();
} catch (error) {
  console.error("Failed to load config:", error);
  // Fallback behavior
}

try {
  const container = await loader.loadRemote("mfe-widget");
} catch (error) {
  console.error("Failed to load remote:", error);
  // Show error UI or fallback component
}
```

## Environment Detection

The loader requires a browser environment (window and document). It will throw an error if used in Node.js:

```typescript
// ❌ Throws: "DynamicLoader requires browser environment"
const loader = new DynamicLoader();
```

## Integration with Module Federation

The loader works with Webpack Module Federation Plugin v2:

```javascript
// webpack.config.js
import { ModuleFederationPlugin } from "@module-federation/enhanced";

export default {
  plugins: [
    new ModuleFederationPlugin({
      name: "host",
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
      },
    }),
  ],
};
```

## TypeScript Support

Full TypeScript support with type definitions included.

```typescript
import type {
  LoaderStatus,
  LoaderEventType,
  LoaderEventData,
  Container,
} from "@mfe-runtine/dynamic-loader";
```

## Testing

Run tests:

```bash
pnpm test
```

## License

MIT
