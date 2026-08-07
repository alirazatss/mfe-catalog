#!/usr/bin/env node
/**
 * Portable validator CLI for app-config.json
 *
 * Validates an app config document against the app-config schema using ajv.
 * Accepts schema and document as file paths or HTTP(S) URLs.
 * Zero imports from shell/app internals - fully portable.
 *
 * Usage:
 *   tsx scripts/validate-app-config.ts <schema> <document>
 *
 * Examples:
 *   tsx scripts/validate-app-config.ts packages/app-config/schema.json apps/shells/website/public/app-config.json
 *   tsx scripts/validate-app-config.ts packages/app-config/schema.json apps/shells/ccis/public/app-config.json
 *   tsx scripts/validate-app-config.ts https://example.com/schema.json ./config.json
 *
 * Exit codes:
 *   0 - Valid
 *   1 - Invalid (validation errors)
 *   2 - Error (file not found, parse error, etc.)
 *
 * Implements: AVT-1 (Portable validator with file + URL support)
 * Implements: multi-shell-tooling: all-shells default scenario (when wrapped in a loop)
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  schemaVersion?: string;
}

/**
 * Load content from file path or HTTP(S) URL
 */
async function loadContent(source: string): Promise<string> {
  // Check if it's a URL
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.text();
  }

  // Otherwise, treat as file path
  try {
    return readFileSync(resolve(source), "utf-8");
  } catch (err) {
    throw new Error(`Failed to read file: ${(err as NodeJS.ErrnoException).message}`);
  }
}

/**
 * Parse JSON content with helpful error messages
 */
function parseJSON(content: string, source: string): unknown {
  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Invalid JSON in ${source}: ${(err as Error).message}`);
  }
}

/**
 * Validate document against schema using ajv
 */
function validateWithAjv(schema: unknown, document: unknown): ValidationResult {
  const ajv = new Ajv({ allErrors: true, verbose: true });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(document);

  if (valid) {
    // Extract schema version from document if available
    const schemaVersion =
      document && typeof document === "object" && "schemaVersion" in document
        ? (document.schemaVersion as string)
        : undefined;

    return { valid: true, schemaVersion };
  }

  // Format validation errors with JSON paths
  const errors = (validate.errors ?? []).map((err) => {
    const path = err.instancePath || "(root)";
    const message = err.message || "validation failed";
    return `${path}: ${message}`;
  });

  return { valid: false, errors };
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error("Usage: validate-app-config <schema> <document>");
    console.error("");
    console.error("  <schema>   Path or URL to JSON Schema");
    console.error("  <document> Path or URL to document to validate");
    console.error("");
    console.error("Examples:");
    console.error("  tsx scripts/validate-app-config.ts schema.json config.json");
    console.error(
      "  tsx scripts/validate-app-config.ts https://example.com/schema.json config.json",
    );
    process.exit(2);
  }

  const [schemaSource, documentSource] = args;

  try {
    // Load and parse schema
    const schemaContent = await loadContent(schemaSource);
    const schema = parseJSON(schemaContent, schemaSource);

    // Load and parse document
    const documentContent = await loadContent(documentSource);
    const document = parseJSON(documentContent, documentSource);

    // Validate
    const result = validateWithAjv(schema, document);

    if (result.valid) {
      console.log(
        `✓ Valid${result.schemaVersion ? ` (schema version: ${result.schemaVersion})` : ""}`,
      );
      process.exit(0);
    } else {
      console.error("✗ Validation failed:");
      for (const error of result.errors ?? []) {
        console.error(`  - ${error}`);
      }
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(2);
  }
}

main();
