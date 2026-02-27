import { describe, it, expect, vi, beforeEach } from "vitest";
import { inferMimeType, fetchImageAsBase64 } from "@/lib/utils/image";

describe("inferMimeType", () => {
  it("uses content-type header when available", () => {
    expect(inferMimeType("https://example.com/img", "image/png")).toBe("image/png");
  });

  it("strips charset from content-type", () => {
    expect(inferMimeType("https://example.com/img", "image/jpeg; charset=utf-8")).toBe("image/jpeg");
  });

  it("falls back to URL extension", () => {
    expect(inferMimeType("https://example.com/photo.png", null)).toBe("image/png");
  });

  it("handles URL with query params", () => {
    expect(inferMimeType("https://example.com/photo.webp?w=100", null)).toBe("image/webp");
  });

  it("defaults to image/jpeg for unknown", () => {
    expect(inferMimeType("https://example.com/image", null)).toBe("image/jpeg");
  });

  it("ignores non-image content-type", () => {
    expect(inferMimeType("https://example.com/photo.png", "text/html")).toBe("image/png");
  });
});

describe("fetchImageAsBase64", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns base64 and mimeType for a valid image", async () => {
    const fakeImageData = new Uint8Array(200).fill(0xff);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(fakeImageData, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );

    const result = await fetchImageAsBase64("https://example.com/photo.jpg");
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe("image/jpeg");
    expect(result!.base64).toBeTruthy();
  });

  it("returns null for non-200 responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 404 }),
    );

    const result = await fetchImageAsBase64("https://example.com/missing.jpg");
    expect(result).toBeNull();
  });

  it("returns null for non-image content-type", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    const result = await fetchImageAsBase64("https://example.com/page");
    expect(result).toBeNull();
  });

  it("returns null for very small responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array(10), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );

    const result = await fetchImageAsBase64("https://example.com/tiny.jpg");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const result = await fetchImageAsBase64("https://example.com/photo.jpg");
    expect(result).toBeNull();
  });
});
