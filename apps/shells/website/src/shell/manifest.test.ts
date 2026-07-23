import { describe, it, expect, beforeEach, afterEach, vi } from "vite-plus/test";
import { fetchManifest } from "./manifest.js";
import { FALLBACK_REMOTES } from "../config/remotes.js";

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

  it("returns fallback config after exhausting retries", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(async () => new Response("boom", { status: 500 })) as any;

    const promise = fetchManifest();
    // 4 attempts total, 3 backoff waits: 1s + 2s + 4s
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);
    const manifest = await promise;
    expect(manifest).toEqual(FALLBACK_REMOTES);
  });

  it("returns fallback config when response is invalid JSON", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(async () => new Response("not json", { status: 200 })) as any;

    const promise = fetchManifest();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);
    const manifest = await promise;
    expect(manifest).toEqual(FALLBACK_REMOTES);
  });

  it("returns fallback config when JSON is valid but fails schema validation", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ wrongShape: true }), { status: 200 }),
      ) as any;

    const promise = fetchManifest();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);
    const manifest = await promise;
    expect(manifest).toEqual(FALLBACK_REMOTES);
  });
});
