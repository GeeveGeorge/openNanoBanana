import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractSearchQuery } from "@/lib/pipeline/extract-query";

vi.mock("@/lib/clients/gemini", () => ({
  callGemini: vi.fn(),
}));

import { callGemini } from "@/lib/clients/gemini";
const mockCallGemini = vi.mocked(callGemini);

describe("extractSearchQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts search query and subject type from JSON response", async () => {
    mockCallGemini.mockResolvedValue('{"searchQuery":"hkust entrance piazza","subjectType":"an outdoor plaza at a university"}');
    const result = await extractSearchQuery("key", "model", "hkust entrance piazza in cyberpunk future");
    expect(result.searchQuery).toBe("hkust entrance piazza");
    expect(result.subjectType).toBe("an outdoor plaza at a university");
  });

  it("handles JSON wrapped in markdown fences", async () => {
    mockCallGemini.mockResolvedValue('```json\n{"searchQuery":"golden gate bridge","subjectType":"a suspension bridge"}\n```');
    const result = await extractSearchQuery("key", "model", "golden gate bridge at sunset");
    expect(result.searchQuery).toBe("golden gate bridge");
    expect(result.subjectType).toBe("a suspension bridge");
  });

  it("trims whitespace and quotes from searchQuery", async () => {
    mockCallGemini.mockResolvedValue('{"searchQuery":"  \\"golden gate bridge\\"  ","subjectType":"a bridge"}');
    const result = await extractSearchQuery("key", "model", "golden gate bridge at sunset");
    expect(result.searchQuery).toBe("golden gate bridge");
  });

  it("defaults subjectType to 'a subject' when missing", async () => {
    mockCallGemini.mockResolvedValue('{"searchQuery":"test query"}');
    const result = await extractSearchQuery("key", "model", "test prompt");
    expect(result.subjectType).toBe("a subject");
  });

  it("throws PipelineError on empty response", async () => {
    mockCallGemini.mockResolvedValue("");
    await expect(
      extractSearchQuery("key", "model", "abstract art"),
    ).rejects.toThrow("Could not parse");
  });

  it("throws PipelineError on non-JSON response", async () => {
    mockCallGemini.mockResolvedValue("just some text");
    await expect(
      extractSearchQuery("key", "model", "test"),
    ).rejects.toThrow("Could not parse");
  });

  it("throws PipelineError when searchQuery is too short", async () => {
    mockCallGemini.mockResolvedValue('{"searchQuery":"x","subjectType":"something"}');
    await expect(
      extractSearchQuery("key", "model", "x"),
    ).rejects.toThrow("Could not extract");
  });

  it("passes the prompt to Gemini", async () => {
    mockCallGemini.mockResolvedValue('{"searchQuery":"test query","subjectType":"a thing"}');
    await extractSearchQuery("key", "model", "my prompt here");
    expect(mockCallGemini).toHaveBeenCalledWith(
      "key",
      "model",
      expect.arrayContaining([
        expect.objectContaining({
          parts: expect.arrayContaining([
            expect.objectContaining({ text: expect.stringContaining("my prompt here") }),
          ]),
        }),
      ]),
    );
  });
});
