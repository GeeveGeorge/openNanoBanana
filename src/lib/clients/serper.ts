import { ApiError, RateLimitError } from "@/lib/utils/errors";
import type { ImageSearchResult } from "@/lib/pipeline/types";

const SERPER_URL = "https://google.serper.dev/images";

export async function searchImages(
  apiKey: string,
  query: string,
  num = 5,
): Promise<ImageSearchResult[]> {
  const res = await fetch(SERPER_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num }),
  });

  if (res.status === 429) {
    throw new RateLimitError("Serper");
  }

  if (res.status === 401 || res.status === 403) {
    throw new ApiError("Invalid Serper API key", res.status, "Serper");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(
      `Serper API error (${res.status}): ${body.slice(0, 200)}`,
      res.status,
      "Serper",
    );
  }

  const data = await res.json();
  const images: ImageSearchResult[] = (data.images || []).map(
    (img: { title?: string; imageUrl?: string; link?: string }) => ({
      title: img.title || "",
      imageUrl: img.imageUrl || "",
      link: img.link || "",
    }),
  );

  return images;
}
