import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { HttpClient } from "../src/utils/http-client.js";

describe("HttpClient", () => {
  it("retries transient failures with backoff", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "busy" }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = new HttpClient({ concurrency: 1, timeoutMs: 1000, maxRetries: 2, backoffMs: 10, fetchImpl, sleep });
    await expect(client.request("https://example.com", {}, z.object({ ok: z.boolean() }))).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it("does not retry authentication failures", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "no" }), { status: 401 }));
    const client = new HttpClient({ concurrency: 1, timeoutMs: 1000, maxRetries: 2, backoffMs: 10, fetchImpl });
    await expect(client.request("https://example.com", {}, z.object({}))).rejects.toThrow("no");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
