/**
 * @mfe-runtime/shell-kit
 *
 * Shared shell utilities for runtime config, slots, error rendering, auth bridge, and config loaders.
 *
 * See openspec/changes/shared-boilerplate-packages/specs/shell-kit/spec.md
 */

export { createRuntimeConfig } from "./runtime-config";
export type { RuntimeConfigOptions } from "./runtime-config";

export { createSlotRenderers } from "./slots";
export type { SlotRenderers } from "./slots";

export { createCriticalErrorRenderer } from "./critical-error";
export type { CriticalErrorRenderer } from "./critical-error";

export { setupAuthBridge } from "./auth-bridge";
export type { TokenManager, MFEAuthBridge } from "./auth-bridge";

export { loadManifest, loadShellAppConfig } from "./loaders";
export type { ShellAppConfig } from "./loaders";
