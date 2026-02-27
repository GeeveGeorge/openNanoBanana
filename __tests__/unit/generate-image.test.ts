import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateImage } from "@/lib/pipeline/generate-image";

vi.mock("@/lib/clients/runpod", () => ({
  submitAndPoll: vi.fn(),
}));

import { submitAndPoll } from "@/lib/clients/runpod";
const mockSubmitAndPoll = vi.mocked(submitAndPoll);

describe("generateImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns image URL from output.result (real RunPod format)", async () => {
    mockSubmitAndPoll.mockResolvedValue({
      id: "job-1",
      status: "COMPLETED",
      output: { result: "https://image.runpod.ai/result.jpg", cost: 0.14 },
    });

    const result = await generateImage("key", "endpoint", "prompt", "https://ref.jpg");
    expect(result.imageUrl).toBe("https://image.runpod.ai/result.jpg");
    expect(result.cost).toBe(0.14);
  });

  it("falls back to output.image_url if result is missing", async () => {
    mockSubmitAndPoll.mockResolvedValue({
      id: "job-1",
      status: "COMPLETED",
      output: { image_url: "https://fallback.png" },
    });

    const result = await generateImage("key", "endpoint", "prompt", "https://ref.jpg");
    expect(result.imageUrl).toBe("https://fallback.png");
  });

  it("passes reference image in images array", async () => {
    mockSubmitAndPoll.mockResolvedValue({
      id: "job-1",
      status: "COMPLETED",
      output: { result: "https://result.png" },
    });

    await generateImage("key", "endpoint", "prompt", "https://ref.jpg");
    expect(mockSubmitAndPoll).toHaveBeenCalledWith(
      "key",
      "endpoint",
      expect.objectContaining({
        prompt: "prompt",
        images: ["https://ref.jpg"],
      }),
      expect.any(Object),
    );
  });

  it("throws PipelineError when no URL in output", async () => {
    mockSubmitAndPoll.mockResolvedValue({
      id: "job-1",
      status: "COMPLETED",
      output: {},
    });

    await expect(
      generateImage("key", "endpoint", "prompt", "https://ref.jpg"),
    ).rejects.toThrow("no image URL");
  });
});
