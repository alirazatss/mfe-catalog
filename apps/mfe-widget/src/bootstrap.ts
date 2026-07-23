/**
 * Module Federation Bootstrap Entry Point
 *
 * This file is executed before the remote is shared with the host application.
 * It initializes shared dependencies and returns the module scope.
 */

import { StrictMode, createElement, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { MFEProps } from "@mfe-runtine/dynamic-loader";
import App from "./App.js";

export { CounterWidget } from "./components/CounterWidget.js";
export { App };

interface LifecycleProps extends MFEProps {
  user: ComponentProps<typeof App>["user"];
}

const roots = new Map<HTMLElement, Root>();

export function bootstrap(): Promise<void> {
  return Promise.resolve();
}

export async function mount(props: LifecycleProps): Promise<void> {
  roots.get(props.container)?.unmount();

  const root = createRoot(props.container);
  roots.set(props.container, root);
  root.render(
    createElement(
      StrictMode,
      null,
      createElement(App, {
        basePath: props.basePath ?? "/",
        router: "browser",
        isAuthenticated: props.isAuthenticated,
        user: props.user,
      }),
    ),
  );
}

export async function unmount(props: LifecycleProps): Promise<void> {
  roots.get(props.container)?.unmount();
  roots.delete(props.container);
}
