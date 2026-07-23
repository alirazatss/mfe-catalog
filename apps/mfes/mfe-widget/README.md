# Remote Widget - Microfrontend

A vanilla TypeScript microfrontend application that demonstrates Module Federation with Vite.

## Overview

This application exposes a `CounterWidget` component that can be consumed by the host application via Module Federation. It can also run standalone for development and testing.

## Features

- **Standalone Mode**: Run independently with demo UI
- **Module Federation**: Expose CounterWidget for remote consumption
- **TypeScript**: Full type safety with declaration files
- **Theming**: Supports light and dark themes
- **Scoped Styles**: CSS-in-JS approach prevents style conflicts

## Development

### Run Standalone

```bash
pnpm run dev:remote
# or from root
cd apps/mfes/remote-widget
pnpm dev
```

The app will start on `http://localhost:5174`

### Build for Production

```bash
pnpm run build:remote
# or from root
cd apps/mfes/remote-widget
pnpm build
```

## Exposed Modules

This remote application exposes the following modules via Module Federation:

| Module Path                  | Export                | Description                   |
| ---------------------------- | --------------------- | ----------------------------- |
| `remoteWidget/CounterWidget` | `CounterWidget` class | Interactive counter component |

## Usage from Host Application

### Import the Component

```typescript
import { CounterWidget } from "remoteWidget/CounterWidget";

// Create instance
const container = document.getElementById("widget-container");
const widget = new CounterWidget(container, {
  initialValue: 10,
  theme: "light",
  onCountChange: (count) => console.log("Count:", count),
});
```

### Component API

```typescript
interface CounterWidgetOptions {
  initialValue?: number; // Default: 0
  theme?: "light" | "dark"; // Default: 'light'
  onCountChange?: (count: number) => void; // Callback on value change
}

class CounterWidget {
  constructor(container: HTMLElement, options?: CounterWidgetOptions);

  // Methods
  increment(): void;
  decrement(): void;
  reset(): void;
  getValue(): number;
  setValue(value: number): void;
  setTheme(theme: "light" | "dark"): void;
  destroy(): void;
}
```

## Module Federation Configuration

The widget is configured in `vite.config.ts`:

```typescript
federation({
  name: "remoteWidget",
  filename: "remoteEntry.js",
  exposes: {
    "./CounterWidget": "./src/components/CounterWidget.ts",
  },
});
```

## Architecture

```
remote-widget/
├── src/
│   ├── components/
│   │   └── CounterWidget.ts    # Main widget component
│   ├── main.ts                 # Standalone entry point
│   └── types.d.ts              # TypeScript declarations
├── vite.config.ts              # Vite + Module Federation config
└── package.json
```

## Type Safety

Type definitions are exported in `src/types.d.ts` and should be copied to consuming applications for full TypeScript support.

## Testing

Run the widget in standalone mode to test:

1. Counter increment/decrement functionality
2. Reset button
3. Theme switching
4. Style isolation

## Notes

- The widget uses inline styles to ensure CSS isolation
- No external dependencies required (vanilla TypeScript)
- Compatible with any Module Federation host (Vite, Webpack, Rspack)
