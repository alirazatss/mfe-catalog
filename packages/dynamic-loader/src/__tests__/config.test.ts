import { describe, it, expect, vi, afterEach } from "vite-plus/test";
import { fetchConfig } from "../config.js";

describe("fetchConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch and validate config successfully", async () => {
    const validConfig = {
      chrome: {
        header: {
          mfe: "mfe-header",
          entryUrl: "https://cdn.example.com/mfe-header/remoteEntry.js",
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validConfig,
    });

    const result = await fetchConfig();

    expect(result).toEqual(validConfig);
    expect(global.fetch).toHaveBeenCalledWith("/remotes.config.json");
  });

  it("should use custom configPath", async () => {
    const validConfig = { chrome: {} };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validConfig,
    });

    await fetchConfig({ configPath: "/custom.json" });

    expect(global.fetch).toHaveBeenCalledWith("/custom.json");
  });

  it("should reject on HTTP error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(fetchConfig({ maxRetries: 0 })).rejects.toThrow("Failed to fetch config");
    await expect(fetchConfig({ maxRetries: 0 })).rejects.toThrow("HTTP 404");
  });

  it("should reject on 500 server error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(fetchConfig({ maxRetries: 0 })).rejects.toThrow("HTTP 500");
  });

  it("should reject on invalid JSON", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });

    await expect(fetchConfig({ maxRetries: 0 })).rejects.toThrow("Unexpected token");
  });

  it("should reject on validation failure", async () => {
    const invalidConfig = {
      chrome: {
        header: {
          // missing required 'mfe' field
          entryUrl: "https://cdn.example.com/mfe-header/remoteEntry.js",
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => invalidConfig,
    });

    await expect(fetchConfig({ maxRetries: 0 })).rejects.toThrow("validation failed");
  });

  it("should retry on network error", async () => {
    const validConfig = { chrome: {} };
    let callCount = 0;

    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 2) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({
        ok: true,
        json: async () => validConfig,
      });
    });

    const result = await fetchConfig({ maxRetries: 2, retryDelay: 10 });
    expect(result).toEqual(validConfig);
    expect(callCount).toBe(2); // Initial + 1 retry
  });

  it("should exhaust retries and throw last error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    await expect(fetchConfig({ maxRetries: 1, retryDelay: 10 })).rejects.toThrow("Network timeout");
    expect(global.fetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });
});
