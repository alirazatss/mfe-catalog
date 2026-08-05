// Implements AAR-1: JSON Schema generation
// See openspec/changes/app-config-contract/specs/app-config-schema-artifact/spec.md

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { appConfigSchema, schemaVersion } from "../src/index.js";

// Generate JSON Schema from Zod schema
const jsonSchema = zodToJsonSchema(appConfigSchema, {
  name: "AppConfig",
  $refStrategy: "none",
});

// Add schemaVersion to the schema metadata
const schemaWithVersion = {
  ...jsonSchema,
  $comment: `Generated from Zod schema. Schema version: ${schemaVersion}`,
};

// Write to package root
const schemaPath = join(process.cwd(), "schema.json");
writeFileSync(schemaPath, JSON.stringify(schemaWithVersion, null, 2) + "\n");

console.log(`✓ Generated schema.json (version ${schemaVersion})`);
