import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchImages } from "@/lib/clients/serper";
import { ApiError, RateLimitError } from "@/lib/utils/errors";

describe("searchImages", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const key = "test-serper-key";

  it("returns parsed image results", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          images: [
            { title: "Photo 1", imageUrl: "https://img.com/1.jpg", link: "https://site.com/1" },
            { title: "Photo 2", imageUrl: "https://img.com/2.jpg", link: "https://site.com/2" },
          ],
        }),
        { status: 200 },
      ),
    );

    const results = await searchImages(key, "test query", 5);
    expect(results).toHaveLength(2);
    expect(results[0].imageUrl).toBe("https://img.com/1.jpg");
    expect(results[1].title).toBe("Photo 2");
  });

  it("returns empty array when no images found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ images: [] }), { status: 200 }),
    );

    const results = await searchImages(key, "nonexistent thing");
    expect(results).toEqual([]);
  });

  it("throws RateLimitError on 429", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", { status: 429 }),
    );

    await expect(searchImages(key, "query")).rejects.toThrow(RateLimitError);
  });

  it("throws ApiError on 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("unauthorized", { status: 401 }),
    );

    await expect(searchImages(key, "query")).rejects.toThrow(ApiError);
  });

  it("sends correct request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ images: [] }), { status: 200 }),
    );

    await searchImages(key, "my query", 3);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://google.serper.dev/images",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ q: "my query", num: 3 }),
      }),
    );
  });
});
