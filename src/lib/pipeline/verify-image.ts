import { callGemini } from "@/lib/clients/gemini";
import { fetchImageAsBase64 } from "@/lib/utils/image";
import type { ImageSearchResult, VerifiedImage } from "@/lib/pipeline/types";

export async function verifyImages(
  geminiApiKey: string,
  geminiModel: string,
  subjectType: string,
  imageResults: ImageSearchResult[],
  onProgress?: (checked: number, total: number) => void,
): Promise<VerifiedImage | null> {
  for (let i = 0; i < imageResults.length; i++) {
    const img = imageResults[i];
    onProgress?.(i + 1, imageResults.length);

    const imageData = await fetchImageAsBase64(img.imageUrl);
    if (!imageData) continue;

    try {
      const answer = await callGemini(geminiApiKey, geminiModel, [
        {
          parts: [
            {
              inline_data: {
                mime_type: imageData.mimeType,
                data: imageData.base64,
              },
            },
            {
              text: `Does this image clearly contain ${subjectType}? Answer with ONLY "yes" or "no".`,
            },
          ],
        },
      ]);

      const normalized = answer.trim().toLowerCase();
      if (normalized.startsWith("yes")) {
        return {
          imageUrl: img.imageUrl,
          base64: imageData.base64,
          mimeType: imageData.mimeType,
        };
      }
    } catch {
      // skip this image on Gemini errors (safety, etc.) and try the next
      continue;
    }
  }

  return null;
}
