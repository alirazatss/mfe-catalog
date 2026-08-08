import { describe, it, expect } from "vite-plus/test";
import { createVitestConfig } from "../vitest";

describe("createVitestConfig", () => {
  it("returns valid vitest config with defaults", () => {
    const config = createVitestConfig();

    expect(config.test).toBeDefined();
    expect(config.test?.environment).toBe("happy-dom");
    expect(config.test?.globals).toBe(true);
    expect(config.test?.coverage?.provider).toBe("v8");
    expect(config.test?.coverage?.reporter).toEqual(["text", "json", "html"]);
  });

  it("includes standard exclusions", () => {
    const config = createVitestConfig();

    expect(config.test?.coverage?.exclude).toContain("dist/**");
    expect(config.test?.coverage?.exclude).toContain("node_modules/**");
    expect(config.test?.coverage?.exclude).toContain("**/*.test.ts");
    expect(config.test?.coverage?.exclude).toContain("**/*.test.tsx");
  });

  it("accepts custom coverage thresholds", () => {
    const config = createVitestConfig({
      coverageThresholds: {
        statements: 90,
        branches: 85,
        functions: 88,
        lines: 92,
      },
    });

    expect(config.test?.coverage?.thresholds).toEqual({
      statements: 90,
      branches: 85,
      functions: 88,
      lines: 92,
    });
  });

  it("accepts partial coverage thresholds", () => {
    const config = createVitestConfig({
      coverageThresholds: {
        statements: 95,
      },
    });

    expect(config.test?.coverage?.thresholds?.statements).toBe(95);
    expect(config.test?.coverage?.thresholds?.branches).toBe(75);
    expect(config.test?.coverage?.thresholds?.functions).toBe(80);
    expect(config.test?.coverage?.thresholds?.lines).toBe(80);
  });

  it("accepts custom setup file", () => {
    const config = createVitestConfig({
      setupFile: "./src/test/setup.ts",
    });

    expect(config.test?.setupFiles).toEqual(["./src/test/setup.ts"]);
  });

  it("accepts custom test name", () => {
    const config = createVitestConfig({
      name: "my-mfe",
    });

    expect(config.test?.name).toBe("my-mfe");
  });

  it("combines all options", () => {
    const config = createVitestConfig({
      name: "widget",
      setupFile: "./setup.ts",
      coverageThresholds: {
        statements: 95,
        branches: 90,
      },
    });

    expect(config.test?.name).toBe("widget");
    expect(config.test?.setupFiles).toEqual(["./setup.ts"]);
    expect(config.test?.coverage?.thresholds?.statements).toBe(95);
    expect(config.test?.coverage?.thresholds?.branches).toBe(90);
  });
});
