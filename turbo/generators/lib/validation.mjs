// Implements app-scaffolding: name validation and collision check
// See openspec/changes/mfe-shell-scaffolding/specs/app-scaffolding/spec.md

import { existsSync } from "node:fs";
import { join } from "node:path";

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * Validate MFE/shell name against the required pattern: ^[a-z][a-z0-9-]*$
 *
 * Implements app-scaffolding: MFE generator requirement (name validation)
 */
export function validateName(name) {
  if (!name || name.trim() === "") {
    return { valid: false, error: "Name cannot be empty" };
  }

  if (!NAME_PATTERN.test(name)) {
    return {
      valid: false,
      error: "Name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens",
    };
  }

  return { valid: true };
}

/**
 * Check if an MFE or shell with the given name already exists
 *
 * Implements app-scaffolding: collision check requirement
 */
export function checkCollision(name) {
  const workspaceRoot = process.cwd();

  // Check MFE collision
  const mfePath = join(workspaceRoot, "apps/mfes", name);
  if (existsSync(mfePath)) {
    return { valid: false, error: `MFE '${name}' already exists at ${mfePath}` };
  }

  // Check shell collision
  const shellPath = join(workspaceRoot, "apps/shells", name);
  if (existsSync(shellPath)) {
    return { valid: false, error: `Shell '${name}' already exists at ${shellPath}` };
  }

  return { valid: true };
}
