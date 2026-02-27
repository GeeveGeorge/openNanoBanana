import { describe, it, expect, vi, beforeEach } from "vitest";
import { runPipeline } from "@/lib/pipeline";
import type { PipelineEvent } from "@/lib/pipeline/types";

vi.mock("@/lib/pipeline/extract-query", () => ({
  extractSearchQuery: vi.fn(),
}));
vi.mock("@/lib/pipeline/search-images", () => ({
  searchReferenceImages: vi.fn(),
}));
vi.mock("@/lib/pipeline/verify-image", () => ({
  verifyImages: vi.fn(),
}));
vi.mock("@/lib/pipeline/generate-image", () => ({
  generateImage: vi.fn(),
}));

import { extractSearchQuery } from "@/lib/pipeline/extract-query";
import { searchReferenceImages } from "@/lib/pipeline/search-images";
import { verifyImages } from "@/lib/pipeline/verify-image";
import { generateImage } from "@/lib/pipeline/generate-image";

const mockExtract = vi.mocked(extractSearchQuery);
const mockSearch = vi.mocked(searchReferenceImages);
const mockVerify = vi.mocked(verifyImages);
const mockGenerate = vi.mocked(generateImage);

describe("runPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const request = {
    prompt: "hkust entrance piazza in cyberpunk future",
    geminiApiKey: "gem-key",
    serperApiKey: "serp-key",
    runpodApiKey: "rp-key",
    runpodEndpointId: "nano-banana-pro-edit",
  };

  const config = { geminiModel: "gemini-3-flash-preview" };

  it("runs full pipeline and emits events in order", async () => {
    mockExtract.mockResolvedValue({ searchQuery: "hkust entrance piazza", subjectType: "an outdoor plaza" });
    mockSearch.mockResolvedValue([
      { title: "HKUST", imageUrl: "https://img.com/hkust.jpg", link: "https://hkust.hk" },
    ]);
    mockVerify.mockResolvedValue({
      imageUrl: "https://img.com/hkust.jpg",
      base64: "abc",
      mimeType: "image/jpeg",
    });
    mockGenerate.mockResolvedValue({
      imageUrl: "https://result.runpod.ai/out.jpg",
      cost: 0.02,
    });

    const events: PipelineEvent[] = [];
    const emit = (event: PipelineEvent) => events.push(event);

    await runPipeline(request, emit, config);

    const stages = events.map((e) => e.stage);
    expect(stages).toContain("extracting_query");
    expect(stages).toContain("searching_images");
    expect(stages).toContain("verifying_images");
    expect(stages).toContain("generating_image");
    expect(stages).toContain("complete");

    const completeEvent = events.find((e) => e.stage === "complete");
    expect(completeEvent?.data?.resultUrl).toBe("https://result.runpod.ai/out.jpg");

    // Verify subjectType is passed to verifyImages (not the search query)
    expect(mockVerify).toHaveBeenCalledWith(
      "gem-key",
      "gemini-3-flash-preview",
      "an outdoor plaza",
      expect.any(Array),
      expect.any(Function),
    );
  });

  it("throws PipelineError when verification fails", async () => {
    mockExtract.mockResolvedValue({ searchQuery: "query", subjectType: "a thing" });
    mockSearch.mockResolvedValue([
      { title: "A", imageUrl: "https://a.jpg", link: "https://a.com" },
    ]);
    mockVerify.mockResolvedValue(null);

    const events: PipelineEvent[] = [];
    await expect(
      runPipeline(request, (e) => events.push(e), config),
    ).rejects.toThrow("None of the found images match");
  });
});
