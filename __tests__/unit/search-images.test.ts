import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchReferenceImages } from "@/lib/pipeline/search-images";

vi.mock("@/lib/clients/serper", () => ({
  searchImages: vi.fn(),
}));

import { searchImages } from "@/lib/clients/serper";
const mockSearchImages = vi.mocked(searchImages);

describe("searchReferenceImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns search results", async () => {
    const images = [
      { title: "Photo", imageUrl: "https://img.com/1.jpg", link: "https://site.com" },
    ];
    mockSearchImages.mockResolvedValue(images);

    const result = await searchReferenceImages("key", "query", 5);
    expect(result).toEqual(images);
  });

  it("throws PipelineError when no images found", async () => {
    mockSearchImages.mockResolvedValue([]);

    await expect(
      searchReferenceImages("key", "nothing"),
    ).rejects.toThrow("No images found");
  });

  it("passes count to serper", async () => {
    mockSearchImages.mockResolvedValue([
      { title: "A", imageUrl: "https://a.jpg", link: "https://a.com" },
    ]);

    await searchReferenceImages("key", "query", 3);
    expect(mockSearchImages).toHaveBeenCalledWith("key", "query", 3);
  });
});
