// Implements TSB-1: shell has no baked-in fallback remotes; manifest fetch failure propagates
// See openspec/changes/remote-config-environment-cleanup/specs/thin-shell-bootstrap/spec.md

import { describe, it, expect, beforeEach, afterEach, vi } from "vite-plus/test";
import { fetchManifest } from "./manifest.js";

const validManifest = {
  schemaVersion: "2.0.0",
  chrome: {},
  features: {
    "/widget": {
      mfe: "widget",
      entryUrl: "http://localhost:5174/remoteEntry.js",
    },
  },
};

describe("fetchManifest", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns the manifest on first-attempt success", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(validManifest), { status: 200 })) as any;

    const manifest = await fetchManifest();
    expect(manifest).toBeTruthy();
    expect(manifest?.features?.["/widget"]?.mfe).toBe("widget");
  });

  it("retries with backoff on HTTP failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("boom", { status: 500 }))
      .mockResolvedValueOnce(new Response("boom", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(validManifest), { status: 200 }));
    globalThis.fetch = fetchMock as any;

    const promise = fetchManifest();
    // Advance through backoff delays: 1s, 2s
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    const manifest = await promise;
    expect(manifest).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rejects after exhausting retries (TSB-1)", async () => {
    // Scenario: Fetch failure after retries rejects (no FALLBACK_REMOTES)
    // WHEN manifest fetch fails repeatedly
    // THEN fetchManifest rejects with error

    globalThis.fetch = vi
      .fn()
      .mockImplementation(async () => new Response("boom", { status: 500 })) as any;

    const promise = fetchManifest();
    // 4 attempts total, 3 backoff waits: 1s + 2s + 4s
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    await expect(promise).rejects.toThrow();
  });

  it("rejects when response is invalid JSON (TSB-1)", async () => {
    // Scenario: Invalid JSON response rejects instead of falling back
    // WHEN manifest fetch returns invalid JSON
    // THEN fetchManifest rejects with error

    globalThis.fetch = vi
      .fn()
      .mockImplementation(async () => new Response("not json", { status: 200 })) as any;

    const promise = fetchManifest();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    await expect(promise).rejects.toThrow();
  });

  it("rejects on network error (TSB-1)", async () => {
    // Scenario: Network error rejects instead of falling back
    // WHEN network fetch throws
    // THEN fetchManifest rejects with error

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      throw new Error("Network error");
    }) as any;

    const promise = fetchManifest();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    await expect(promise).rejects.toThrow();
  });

  it("rejects when response fails schema validation (TSB-1)", async () => {
    // Scenario: Valid JSON but invalid schema rejects
    // WHEN manifest fetch returns JSON that fails schema validation
    // THEN fetchManifest rejects with validation error

    globalThis.fetch = vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ wrongShape: true }), { status: 200 }),
      ) as any;

    const promise = fetchManifest();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    await expect(promise).rejects.toThrow("Manifest failed schema validation");
  });
});
