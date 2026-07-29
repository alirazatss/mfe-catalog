/**
 * Module Federation Bootstrap Entry Point
 *
 * This file is executed before the remote is shared with the host application.
 * It initializes shared dependencies and returns the module scope.
 */

import { StrictMode, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { MFEProps } from "@mfe-runtime/dynamic-loader";
import { LandingPage } from "./modules/landing-page/pages/LandingPage";
import "./index.css";

export { LandingPage };

const roots = new Map<HTMLElement, Root>();

export function bootstrap(): Promise<void> {
  return Promise.resolve();
}

export async function mount(props: MFEProps): Promise<void> {
  roots.get(props.container)?.unmount();

  const root = createRoot(props.container);
  roots.set(props.container, root);
  root.render(createElement(StrictMode, null, createElement(LandingPage)));
}

export async function unmount(props: MFEProps): Promise<void> {
  roots.get(props.container)?.unmount();
  roots.delete(props.container);
}
