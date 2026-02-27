import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyImages } from "@/lib/pipeline/verify-image";

vi.mock("@/lib/clients/gemini", () => ({
  callGemini: vi.fn(),
}));

vi.mock("@/lib/utils/image", () => ({
  fetchImageAsBase64: vi.fn(),
}));

import { callGemini } from "@/lib/clients/gemini";
import { fetchImageAsBase64 } from "@/lib/utils/image";

const mockCallGemini = vi.mocked(callGemini);
const mockFetchImage = vi.mocked(fetchImageAsBase64);

const images = [
  { title: "A", imageUrl: "https://img.com/a.jpg", link: "https://a.com" },
  { title: "B", imageUrl: "https://img.com/b.jpg", link: "https://b.com" },
  { title: "C", imageUrl: "https://img.com/c.jpg", link: "https://c.com" },
];

describe("verifyImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns first verified image", async () => {
    mockFetchImage.mockResolvedValue({ base64: "abc123", mimeType: "image/jpeg" });
    mockCallGemini
      .mockResolvedValueOnce("no")
      .mockResolvedValueOnce("yes");

    const result = await verifyImages("key", "model", "test subject", images);
    expect(result).not.toBeNull();
    expect(result!.imageUrl).toBe("https://img.com/b.jpg");
    expect(mockCallGemini).toHaveBeenCalledTimes(2);
  });

  it("returns null when none are verified", async () => {
    mockFetchImage.mockResolvedValue({ base64: "abc123", mimeType: "image/jpeg" });
    mockCallGemini.mockResolvedValue("no");

    const result = await verifyImages("key", "model", "test subject", images);
    expect(result).toBeNull();
  });

  it("skips images that fail to download", async () => {
    mockFetchImage
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ base64: "abc", mimeType: "image/png" });
    mockCallGemini.mockResolvedValue("yes");

    const result = await verifyImages("key", "model", "test", images);
    expect(result).not.toBeNull();
    expect(result!.imageUrl).toBe("https://img.com/c.jpg");
    expect(mockCallGemini).toHaveBeenCalledTimes(1);
  });

  it("skips images where Gemini throws", async () => {
    mockFetchImage.mockResolvedValue({ base64: "abc", mimeType: "image/jpeg" });
    mockCallGemini
      .mockRejectedValueOnce(new Error("safety"))
      .mockResolvedValueOnce("yes");

    const result = await verifyImages("key", "model", "test", images);
    expect(result!.imageUrl).toBe("https://img.com/b.jpg");
  });

  it("calls onProgress callback", async () => {
    mockFetchImage.mockResolvedValue({ base64: "abc", mimeType: "image/jpeg" });
    mockCallGemini.mockResolvedValue("yes");

    const onProgress = vi.fn();
    await verifyImages("key", "model", "test", images, onProgress);
    expect(onProgress).toHaveBeenCalledWith(1, 3);
  });
});
