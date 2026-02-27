import { describe, it, expect, vi, beforeEach } from "vitest";
import { callGemini } from "@/lib/clients/gemini";
import { ApiError, RateLimitError } from "@/lib/utils/errors";

describe("callGemini", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const key = "test-key";
  const model = "gemini-3-flash-preview";
  const contents = [{ parts: [{ text: "Hello" }] }];

  it("returns text from a successful response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: "world" }] }, finishReason: "STOP" },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await callGemini(key, model, contents);
    expect(result).toBe("world");
  });

  it("throws RateLimitError on 429", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", { status: 429 }),
    );

    await expect(callGemini(key, model, contents)).rejects.toThrow(RateLimitError);
  });

  it("throws ApiError on 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("unauthorized", { status: 401 }),
    );

    await expect(callGemini(key, model, contents)).rejects.toThrow(ApiError);
  });

  it("throws on safety-blocked response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ finishReason: "SAFETY", content: { parts: [] } }],
        }),
        { status: 200 },
      ),
    );

    await expect(callGemini(key, model, contents)).rejects.toThrow("safety filters");
  });

  it("throws on empty candidates with block reason", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [],
          promptFeedback: { blockReason: "SAFETY" },
        }),
        { status: 200 },
      ),
    );

    await expect(callGemini(key, model, contents)).rejects.toThrow("safety filters");
  });

  it("sends correct headers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "ok" }] }, finishReason: "STOP" }],
        }),
        { status: 200 },
      ),
    );

    await callGemini(key, model, contents);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("gemini-3-flash-preview:generateContent"),
      expect.objectContaining({
        headers: expect.objectContaining({ "x-goog-api-key": "test-key" }),
      }),
    );
  });
});
