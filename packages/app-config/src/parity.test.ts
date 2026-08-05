// Implements AAR-1: Zod↔ajv parity test
// See openspec/changes/app-config-contract/specs/app-config-schema-artifact/spec.md

import { describe, it, expect } from "vite-plus/test";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { parseAppConfig } from "./index.js";
import schema from "../schema.json";

describe("Zod-ajv parity", () => {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validateWithAjv = ajv.compile(schema);

  const fixtures = {
    valid: [
      {
        name: "complete valid config",
        data: {
          schemaVersion: "0.1.0",
          apiBaseUrl: "https://api.example.com",
          logoutUrl: "https://example.com/logout",
          auth: {
            keycloakUrl: "https://auth.example.com",
            realm: "mfe-realm",
            clientId: "mfe-client",
          },
        },
      },
    ],
    invalid: [
      {
        name: "missing apiBaseUrl",
        data: {
          schemaVersion: "0.1.0",
          logoutUrl: "https://example.com/logout",
          auth: {
            keycloakUrl: "https://auth.example.com",
            realm: "mfe-realm",
            clientId: "mfe-client",
          },
        },
      },
      {
        name: "invalid URL format",
        data: {
          schemaVersion: "0.1.0",
          apiBaseUrl: "not-a-url",
          logoutUrl: "https://example.com/logout",
          auth: {
            keycloakUrl: "https://auth.example.com",
            realm: "mfe-realm",
            clientId: "mfe-client",
          },
        },
      },
      {
        name: "mismatched schemaVersion",
        data: {
          schemaVersion: "9.9.9",
          apiBaseUrl: "https://api.example.com",
          logoutUrl: "https://example.com/logout",
          auth: {
            keycloakUrl: "https://auth.example.com",
            realm: "mfe-realm",
            clientId: "mfe-client",
          },
        },
      },
      {
        name: "missing auth object",
        data: {
          schemaVersion: "0.1.0",
          apiBaseUrl: "https://api.example.com",
          logoutUrl: "https://example.com/logout",
        },
      },
      {
        name: "empty realm",
        data: {
          schemaVersion: "0.1.0",
          apiBaseUrl: "https://api.example.com",
          logoutUrl: "https://example.com/logout",
          auth: {
            keycloakUrl: "https://auth.example.com",
            realm: "",
            clientId: "mfe-client",
          },
        },
      },
    ],
  };

  // AAR-1: Valid fixtures pass both validators
  describe("valid fixtures", () => {
    fixtures.valid.forEach(({ name, data }) => {
      it(`${name}: both accept`, () => {
        const zodResult = parseAppConfig(data);
        const ajvResult = validateWithAjv(data);

        expect(zodResult.success).toBe(true);
        expect(ajvResult).toBe(true);
      });
    });
  });

  // AAR-1: Invalid fixtures fail both validators
  describe("invalid fixtures", () => {
    fixtures.invalid.forEach(({ name, data }) => {
      it(`${name}: both reject`, () => {
        const zodResult = parseAppConfig(data);
        const ajvResult = validateWithAjv(data);

        expect(zodResult.success).toBe(false);
        expect(ajvResult).toBe(false);
      });
    });
  });
});
