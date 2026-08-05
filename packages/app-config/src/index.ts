// Implements ACS-1: Zod schema is the single source of truth for app config
// See openspec/changes/app-config-contract/specs/app-config-schema/spec.md

import { z } from "zod";

// ACS-2: App config document declares a semver schemaVersion
// Note: This will be read from package.json at build time
export const schemaVersion = "0.1.0";

// ACS-1: Zod schema definition
export const appConfigSchema = z.object({
  schemaVersion: z.literal(schemaVersion),
  apiBaseUrl: z.string().url(),
  logoutUrl: z.string().url(),
  auth: z.object({
    keycloakUrl: z.string().url(),
    realm: z.string().min(1),
    clientId: z.string().min(1),
  }),
});

// ACS-1: Inferred TypeScript type
export type AppConfig = z.infer<typeof appConfigSchema>;

// ACS-3: Runtime parse helper with result type
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Array<{ path: string; message: string }> };

/**
 * Validates arbitrary input against the app config schema.
 *
 * @param input - Arbitrary input to validate
 * @returns Success result with typed AppConfig, or failure result with all field errors
 *
 * Implements ACS-3: Runtime parse helper reports actionable errors
 */
export function parseAppConfig(input: unknown): ParseResult<AppConfig> {
  const result = appConfigSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // ACS-3: Report all field errors with paths
  const errors = result.error.errors.map((err) => ({
    path: err.path.join("."),
    message: err.message,
  }));

  return { success: false, errors };
}

// ACS-4: Async loader error categories
export type LoadErrorCategory = "fetch" | "parse" | "validation";

export class LoadError extends Error {
  constructor(
    public category: LoadErrorCategory,
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "LoadError";
  }
}

export interface LoadOptions {
  signal?: AbortSignal;
}

/**
 * Fetches and validates app config from a URL.
 *
 * @param url - URL to fetch config from
 * @param options - Optional fetch options
 * @returns Promise resolving to typed AppConfig
 * @throws {LoadError} Categorized error (fetch, parse, or validation)
 *
 * Implements ACS-4: Async loader fetches and validates config from a URL
 */
export async function loadAppConfig(url: string, options?: LoadOptions): Promise<AppConfig> {
  let response: Response;

  // Fetch with error categorization
  try {
    response = await fetch(url, { signal: options?.signal });
  } catch (err) {
    throw new LoadError("fetch", `Failed to fetch config from ${url}`, err);
  }

  // Check HTTP status
  if (!response.ok) {
    throw new LoadError("fetch", `HTTP ${response.status} when fetching config from ${url}`);
  }

  // Parse JSON
  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    throw new LoadError("parse", `Invalid JSON in config from ${url}`, err);
  }

  // Validate against schema
  const parseResult = parseAppConfig(json);
  if (!parseResult.success) {
    const errorDetails = parseResult.errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    throw new LoadError("validation", `Config validation failed: ${errorDetails}`);
  }

  return parseResult.data;
}
