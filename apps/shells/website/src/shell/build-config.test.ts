// Implements ESRC-2: build emits exactly one manifest selected by DEPLOY_ENV
// See openspec/changes/remote-config-environment-cleanup/specs/environment-specific-remote-config/spec.md

import { describe, it, expect, beforeAll, afterAll } from "vite-plus/test";
import { execSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

describe("Shell build config selection (ESRC-2)", () => {
  const distPath = join(__dirname, "../../dist");
  const configPath = join(__dirname, "../../config");

  function cleanDist() {
    if (existsSync(distPath)) {
      rmSync(distPath, { recursive: true, force: true });
    }
  }

  function runBuild(env?: string) {
    const envPrefix = env ? `DEPLOY_ENV=${env}` : "";
    try {
      execSync(`${envPrefix} pnpm run build`, {
        cwd: join(__dirname, "../.."),
        stdio: "pipe",
        encoding: "utf-8",
      });
    } catch (error) {
      // Capture build error for test assertions
      throw error;
    }
  }

  function getDistConfigFiles(): string[] {
    if (!existsSync(distPath)) return [];
    return readdirSync(distPath).filter((file) => file.match(/remotes\.config.*\.json$/));
  }

  beforeAll(() => {
    cleanDist();
  });

  afterAll(() => {
    cleanDist();
  });

  it("should emit dev manifest when DEPLOY_ENV is not set (ESRC-2)", () => {
    // Scenario: Default build emits dev manifest
    // WHEN vp build runs for the shell without DEPLOY_ENV set
    // THEN dist/remotes.config.json exists with content identical to config/remotes.config.dev.json
    // AND no other file matching remotes.config*.json exists in dist/

    runBuild();

    const distConfigPath = join(distPath, "remotes.config.json");
    const devConfigPath = join(configPath, "remotes.config.dev.json");

    expect(existsSync(distConfigPath), "dist/remotes.config.json should exist").toBe(true);

    const distContent = readFileSync(distConfigPath, "utf-8");
    const devContent = readFileSync(devConfigPath, "utf-8");

    expect(distContent).toBe(devContent);

    const configFiles = getDistConfigFiles();
    expect(configFiles).toEqual(["remotes.config.json"]);
  });

  it("should emit prod manifest when DEPLOY_ENV=prod (ESRC-2)", () => {
    // Scenario: Prod build emits prod manifest
    // WHEN the shell builds with DEPLOY_ENV=prod
    // THEN dist/remotes.config.json content is identical to config/remotes.config.prod.json

    cleanDist();
    runBuild("prod");

    const distConfigPath = join(distPath, "remotes.config.json");
    const prodConfigPath = join(configPath, "remotes.config.prod.json");

    expect(existsSync(distConfigPath), "dist/remotes.config.json should exist").toBe(true);

    const distContent = readFileSync(distConfigPath, "utf-8");
    const prodContent = readFileSync(prodConfigPath, "utf-8");

    expect(distContent).toBe(prodContent);

    const configFiles = getDistConfigFiles();
    expect(configFiles).toEqual(["remotes.config.json"]);
  });

  it("should fail build when DEPLOY_ENV references non-existent file (ESRC-2)", () => {
    // Scenario: Unknown environment fails the build
    // WHEN the shell builds with DEPLOY_ENV=staging and config/remotes.config.staging.json does not exist
    // THEN the build exits non-zero
    // AND the error message names the missing file path

    cleanDist();

    expect(() => {
      runBuild("staging");
    }).toThrow();

    // Build should not have created dist/remotes.config.json
    const distConfigPath = join(distPath, "remotes.config.json");
    expect(existsSync(distConfigPath)).toBe(false);
  });
});
