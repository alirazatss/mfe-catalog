/**
 * @mfe-runtime/dynamic-loader — MFE Lifecycle Helper
 *
 * Implements dynamic-loader / MFE lifecycle helper.
 * See openspec/changes/shared-boilerplate-packages/specs/dynamic-loader/spec.md
 *
 * Creates bootstrap/mount/unmount functions conformant with ADR-0007 MFE lifecycle contract,
 * with per-container React root management and StrictMode wrapping.
 */

import { StrictMode, createElement, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { MFEProps } from "./types";

export interface MFELifecycleConfig<TProps = Record<string, unknown>> {
  /**
   * The React component to render as the MFE root
   */
  Component: ComponentType<TProps>;
}

export interface MFELifecycle {
  bootstrap(): Promise<void>;
  mount(props: MFEProps): Promise<void>;
  unmount(props: MFEProps): Promise<void>;
}

/**
 * Create MFE lifecycle functions with automatic React root management.
 *
 * Returns bootstrap, mount, and unmount functions that handle:
 * - Per-container React root management (one root per container)
 * - StrictMode wrapping
 * - Automatic cleanup on remount
 * - Extended prop forwarding to the component
 *
 * @param config - Configuration with the component to render
 * @returns MFE lifecycle functions (bootstrap, mount, unmount)
 *
 * @example
 * ```ts
 * import { createMFELifecycle } from "@mfe-runtime/dynamic-loader/lifecycle";
 * import App from "./App";
 *
 * export const { bootstrap, mount, unmount } = createMFELifecycle({ Component: App });
 * ```
 */
export function createMFELifecycle<TProps = Record<string, unknown>>(
  config: MFELifecycleConfig<TProps>,
): MFELifecycle {
  const { Component } = config;
  const roots = new Map<HTMLElement, Root>();

  return {
    bootstrap(): Promise<void> {
      return Promise.resolve();
    },

    async mount(props: MFEProps): Promise<void> {
      // Clean up existing root if remounting into same container
      const existingRoot = roots.get(props.container);
      if (existingRoot) {
        existingRoot.unmount();
        roots.delete(props.container);
      }

      // Create new root and render component with StrictMode
      const root = createRoot(props.container);
      roots.set(props.container, root);

      root.render(
        createElement(StrictMode, null, createElement(Component, props as unknown as TProps)),
      );
    },

    async unmount(props: MFEProps): Promise<void> {
      const root = roots.get(props.container);
      if (root) {
        root.unmount();
        roots.delete(props.container);
      }
    },
  };
}
