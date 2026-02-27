import type { GenerateRequest, PipelineEvent } from "@/lib/pipeline/types";
import { extractSearchQuery } from "@/lib/pipeline/extract-query";
import { searchReferenceImages } from "@/lib/pipeline/search-images";
import { verifyImages } from "@/lib/pipeline/verify-image";
import { generateImage } from "@/lib/pipeline/generate-image";
import { PipelineError } from "@/lib/utils/errors";

type Emit = (event: PipelineEvent) => void;

function emit(emitter: Emit, stage: PipelineEvent["stage"], message: string, data?: Record<string, unknown>) {
  emitter({ stage, message, data, timestamp: Date.now() });
}

export async function runPipeline(
  request: GenerateRequest,
  emitter: Emit,
  config: { geminiModel: string },
): Promise<void> {
  const geminiKey = request.geminiApiKey!;
  const serperKey = request.serperApiKey!;
  const runpodKey = request.runpodApiKey!;
  const model = config.geminiModel;
  const endpointId = request.runpodEndpointId;
  const maxResults = request.options?.maxSearchResults ?? 5;
  const resolution = request.options?.resolution ?? "1k";

  // Step 1: Extract search query and subject type
  emit(emitter, "extracting_query", "Analyzing your prompt...");
  const { searchQuery, subjectType } = await extractSearchQuery(geminiKey, model, request.prompt);
  emit(emitter, "extracting_query", `Search query: "${searchQuery}"`, { query: searchQuery, subjectType });

  // Step 2: Image search
  emit(emitter, "searching_images", `Searching for "${searchQuery}"...`);
  const images = await searchReferenceImages(serperKey, searchQuery, maxResults);
  emit(emitter, "searching_images", `Found ${images.length} candidate images`, {
    images: images.map((img) => ({ title: img.title, imageUrl: img.imageUrl })),
  });

  // Step 3: Verify images (using generic subject type, not specific name)
  emit(emitter, "verifying_images", "Verifying images match the subject...");
  const verified = await verifyImages(geminiKey, model, subjectType, images, (checked, total) => {
    emit(emitter, "verifying_images", `Checking image ${checked}/${total}...`);
  });

  if (!verified) {
    throw new PipelineError(
      "None of the found images match the subject. Try rephrasing your prompt.",
      "verifying_images",
    );
  }

  emit(emitter, "verifying_images", "Reference image verified", {
    verifiedImage: verified.imageUrl,
  });

  // Step 4: Generate image
  emit(emitter, "generating_image", "Generating image with Nano Banana Pro...");
  const result = await generateImage(runpodKey, endpointId, request.prompt, verified.imageUrl, {
    resolution,
    onPoll: (status, attempt) => {
      emit(emitter, "generating_image", `Waiting for generation (${status})...`, { attempt });
    },
  });

  emit(emitter, "complete", "Image generated successfully", {
    resultUrl: result.imageUrl,
    cost: result.cost,
  });
}
