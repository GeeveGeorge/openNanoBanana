import { searchImages as serperSearch } from "@/lib/clients/serper";
import { PipelineError } from "@/lib/utils/errors";
import type { ImageSearchResult } from "@/lib/pipeline/types";

export async function searchReferenceImages(
  serperApiKey: string,
  query: string,
  count = 5,
): Promise<ImageSearchResult[]> {
  const images = await serperSearch(serperApiKey, query, count);

  if (images.length === 0) {
    throw new PipelineError(
      `No images found for "${query}". Try a more specific prompt.`,
      "searching_images",
    );
  }

  return images;
}
