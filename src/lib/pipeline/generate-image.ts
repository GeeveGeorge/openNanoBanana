import { submitAndPoll, type RunPodInput } from "@/lib/clients/runpod";
import { PipelineError } from "@/lib/utils/errors";

export async function generateImage(
  runpodApiKey: string,
  endpointId: string,
  prompt: string,
  referenceImageUrl: string,
  options?: {
    resolution?: string;
    onPoll?: (status: string, attempt: number) => void;
  },
): Promise<{ imageUrl: string; cost?: number }> {
  const input: RunPodInput = {
    prompt,
    images: [referenceImageUrl],
    resolution: options?.resolution || "1k",
    output_format: "jpeg",
    enable_base64_output: false,
  };

  const result = await submitAndPoll(runpodApiKey, endpointId, input, {
    pollIntervalMs: 3000,
    maxAttempts: 40,
    onPoll: options?.onPoll,
  });

  // RunPod output uses "result" for the image URL
  const imageUrl =
    (result.output?.result as string) ||
    (result.output?.image_url as string);

  if (!imageUrl) {
    throw new PipelineError(
      `RunPod completed but returned no image URL. Output: ${JSON.stringify(result.output)}`,
      "generating_image",
    );
  }

  return { imageUrl, cost: result.output?.cost as number | undefined };
}
