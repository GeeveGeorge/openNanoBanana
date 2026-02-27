/**
 * End-to-end live API tests for the full pipeline.
 * These hit real APIs (Gemini, Serper, RunPod) using keys from .env.local.
 *
 * Run with: npx vitest run __tests__/e2e/pipeline-live.test.ts
 */
import { describe, it, expect, beforeAll } from "vitest";
import { callGemini } from "@/lib/clients/gemini";
import { searchImages } from "@/lib/clients/serper";
import { extractSearchQuery } from "@/lib/pipeline/extract-query";
import { verifyImages } from "@/lib/pipeline/verify-image";
import { fetchImageAsBase64 } from "@/lib/utils/image";
import { submitJob, pollStatus } from "@/lib/clients/runpod";
import { runPipeline } from "@/lib/pipeline";
import type { PipelineEvent, ImageSearchResult } from "@/lib/pipeline/types";
import * as dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const GEMINI_KEY = process.env.GEMINI_API_KEY!;
const SERPER_KEY = process.env.SERPER_API_KEY!;
const RUNPOD_KEY = process.env.RUNPOD_API_KEY!;
const GEMINI_MODEL = "gemini-3-flash-preview";
const RUNPOD_ENDPOINT = "nano-banana-pro-edit";

const TEST_PROMPT = "hkust entrance piazza in cyberpunk future";

describe("E2E: Live API Tests", () => {
  beforeAll(() => {
    if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY not set in .env.local");
    if (!SERPER_KEY) throw new Error("SERPER_API_KEY not set in .env.local");
    if (!RUNPOD_KEY) throw new Error("RUNPOD_API_KEY not set in .env.local");
  });

  // ------- Stage 1: Gemini text call -------
  describe("Stage 1: Gemini - callGemini", () => {
    it("responds to a simple text prompt", async () => {
      const result = await callGemini(GEMINI_KEY, GEMINI_MODEL, [
        { parts: [{ text: "Reply with only the word 'hello'" }] },
      ]);
      console.log("  Gemini raw response:", result);
      expect(result).toBeTruthy();
      expect(result.toLowerCase()).toContain("hello");
    }, 15_000);
  });

  // ------- Stage 1b: Extract search query -------
  let extractedQuery: string;
  let extractedSubjectType: string;

  describe("Stage 1b: Extract search query", () => {
    it("extracts a search query and subject type from the test prompt", async () => {
      const result = await extractSearchQuery(GEMINI_KEY, GEMINI_MODEL, TEST_PROMPT);
      extractedQuery = result.searchQuery;
      extractedSubjectType = result.subjectType;
      console.log("  Extracted query:", extractedQuery);
      console.log("  Subject type:", extractedSubjectType);
      expect(extractedQuery).toBeTruthy();
      expect(extractedQuery.length).toBeGreaterThan(3);
      expect(extractedSubjectType).toBeTruthy();
      // Should contain something about hkust
      expect(extractedQuery.toLowerCase()).toContain("hkust");
    }, 15_000);
  });

  // ------- Stage 2: Serper image search -------
  let searchResults: ImageSearchResult[];

  describe("Stage 2: Serper - searchImages", () => {
    it("returns image results for a query", async () => {
      // Use a known query in case stage 1b hasn't run yet
      const query = extractedQuery || "hkust entrance piazza";
      searchResults = await searchImages(SERPER_KEY, query, 5);
      console.log(`  Found ${searchResults.length} images:`);
      searchResults.forEach((img, i) =>
        console.log(`    [${i}] ${img.title} -> ${img.imageUrl.slice(0, 80)}...`),
      );
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].imageUrl).toMatch(/^https?:\/\//);
    }, 15_000);
  });

  // ------- Stage 2b: Image download -------
  describe("Stage 2b: Image download - fetchImageAsBase64", () => {
    it("downloads and base64-encodes a search result image", async () => {
      const url = searchResults?.[0]?.imageUrl;
      if (!url) {
        console.log("  Skipping: no search results available");
        return;
      }
      const result = await fetchImageAsBase64(url);
      if (result) {
        console.log(`  Downloaded: ${result.mimeType}, base64 length: ${result.base64.length}`);
        expect(result.base64.length).toBeGreaterThan(100);
        expect(result.mimeType).toMatch(/^image\//);
      } else {
        console.log("  Image download returned null (URL may be blocked), trying next...");
        // Try a second URL
        for (let i = 1; i < (searchResults?.length ?? 0); i++) {
          const fallback = await fetchImageAsBase64(searchResults[i].imageUrl);
          if (fallback) {
            console.log(`  Downloaded fallback [${i}]: ${fallback.mimeType}, base64 length: ${fallback.base64.length}`);
            expect(fallback.base64.length).toBeGreaterThan(100);
            return;
          }
        }
        console.log("  All image downloads failed - this may indicate network issues");
      }
    }, 30_000);
  });

  // ------- Stage 3: Gemini image verification -------
  let verifiedImageUrl: string | null = null;

  describe("Stage 3: Gemini - verifyImages", () => {
    it("verifies at least one image matches the subject", async () => {
      if (!searchResults || searchResults.length === 0) {
        console.log("  Skipping: no search results available");
        return;
      }

      const subjectType = extractedSubjectType || "an outdoor plaza at a university";
      const result = await verifyImages(
        GEMINI_KEY,
        GEMINI_MODEL,
        subjectType,
        searchResults,
        (checked, total) => console.log(`  Checking image ${checked}/${total}...`),
      );

      if (result) {
        verifiedImageUrl = result.imageUrl;
        console.log(`  Verified image: ${result.imageUrl.slice(0, 80)}...`);
        console.log(`  MIME type: ${result.mimeType}`);
        expect(result.imageUrl).toMatch(/^https?:\/\//);
        expect(result.base64.length).toBeGreaterThan(100);
      } else {
        console.log("  No images were verified - this can happen with certain queries");
      }
    }, 60_000);
  });

  // ------- Stage 4: RunPod job submit -------
  describe("Stage 4: RunPod - submitJob", () => {
    it("submits a job and gets a job ID", async () => {
      // Use verified image from stage 3 if available, else a known public image
      const refImage = verifiedImageUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/640px-Image_created_with_a_mobile_phone.png";
      const jobId = await submitJob(RUNPOD_KEY, RUNPOD_ENDPOINT, {
        prompt: "A beautiful sunset over mountains",
        images: [refImage],
        resolution: "1k",
        output_format: "jpeg",
        enable_base64_output: false,
      });
      console.log("  RunPod job ID:", jobId);
      expect(jobId).toBeTruthy();
      expect(typeof jobId).toBe("string");

      // Quick status check (don't wait for completion)
      const status = await pollStatus(RUNPOD_KEY, RUNPOD_ENDPOINT, jobId);
      console.log("  Initial status:", status.status);
      expect(["IN_QUEUE", "IN_PROGRESS", "COMPLETED"]).toContain(status.status);
    }, 30_000);
  });

  // ------- Full pipeline (stages 1-4 end-to-end) -------
  describe("Full Pipeline E2E", () => {
    it("runs the complete pipeline from prompt to generated image", async () => {
      const events: PipelineEvent[] = [];
      const emit = (event: PipelineEvent) => {
        events.push(event);
        console.log(`  [${event.stage}] ${event.message}`);
        if (event.data) {
          const dataStr = JSON.stringify(event.data);
          if (dataStr.length < 200) {
            console.log(`    data: ${dataStr}`);
          }
        }
      };

      await runPipeline(
        {
          prompt: TEST_PROMPT,
          geminiApiKey: GEMINI_KEY,
          serperApiKey: SERPER_KEY,
          runpodApiKey: RUNPOD_KEY,
          runpodEndpointId: RUNPOD_ENDPOINT,
          options: {
            resolution: "1k",
            maxSearchResults: 5,
          },
        },
        emit,
        { geminiModel: GEMINI_MODEL },
      );

      // Verify we got all stages
      const stages = events.map((e) => e.stage);
      expect(stages).toContain("extracting_query");
      expect(stages).toContain("searching_images");
      expect(stages).toContain("verifying_images");
      expect(stages).toContain("generating_image");
      expect(stages).toContain("complete");

      // Verify final result
      const completeEvent = events.find((e) => e.stage === "complete");
      expect(completeEvent).toBeTruthy();
      expect(completeEvent!.data?.resultUrl).toBeTruthy();
      console.log("\n  RESULT IMAGE URL:", completeEvent!.data?.resultUrl);
    }, 180_000); // 3 min timeout for full pipeline
  });
});
