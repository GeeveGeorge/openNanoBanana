import { ApiError, RateLimitError } from "@/lib/utils/errors";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

export interface GeminiContent {
  role?: "user" | "model";
  parts: GeminiPart[];
}

export async function callGemini(
  apiKey: string,
  model: string,
  contents: GeminiContent[],
): Promise<string> {
  const url = `${BASE_URL}/${model}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ contents }),
  });

  if (res.status === 429) {
    throw new RateLimitError("Gemini");
  }

  if (res.status === 401 || res.status === 403) {
    throw new ApiError("Invalid Gemini API key", res.status, "Gemini");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(
      `Gemini API error (${res.status}): ${body.slice(0, 200)}`,
      res.status,
      "Gemini",
    );
  }

  const data = await res.json();

  const candidate = data.candidates?.[0];
  if (!candidate) {
    const blockReason = data.promptFeedback?.blockReason;
    if (blockReason) {
      throw new ApiError(`Content blocked by Gemini safety filters: ${blockReason}`, 400, "Gemini");
    }
    throw new ApiError("Gemini returned no candidates", 500, "Gemini");
  }

  if (candidate.finishReason === "SAFETY") {
    throw new ApiError("Content blocked by Gemini safety filters", 400, "Gemini");
  }

  const text = candidate.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new ApiError("Gemini returned no text in response", 500, "Gemini");
  }

  return text;
}
