import { callGemini } from "@/lib/clients/gemini";
import { PipelineError } from "@/lib/utils/errors";

const SYSTEM_PROMPT = `You are a search query extractor. Given an image generation prompt, extract TWO things:

1. **searchQuery**: The real-world subject to search for as a reference image. Remove artistic style descriptors, effects, transformations, or hypothetical modifiers (e.g. "as a baby", "in cyberpunk style", "watercolor painting").
2. **subjectType**: A SHORT, generic visual description of what the subject IS — the kind of thing a person could identify by looking at a photo (e.g. "a person", "a bridge", "a building", "a cat", "a street crossing"). Do NOT use the specific name. This is used to verify search results visually.

Return ONLY valid JSON, no markdown fences, no explanation.

Examples:
- "hkust entrance piazza in cyberpunk future" -> {"searchQuery":"hkust entrance piazza","subjectType":"an outdoor plaza at a university"}
- "golden gate bridge at sunset watercolor painting" -> {"searchQuery":"golden gate bridge","subjectType":"a suspension bridge"}
- "dr ct abraham as a baby" -> {"searchQuery":"dr ct abraham","subjectType":"a person"}
- "my cat wearing a top hat in van gogh style" -> {"searchQuery":"cat wearing top hat","subjectType":"a cat"}
- "tokyo shibuya crossing in anime style" -> {"searchQuery":"tokyo shibuya crossing","subjectType":"a busy street crossing"}
- "labrador puppy in a spacesuit" -> {"searchQuery":"labrador puppy","subjectType":"a dog"}`;

export interface ExtractedQuery {
  searchQuery: string;
  subjectType: string;
}

export async function extractSearchQuery(
  geminiApiKey: string,
  geminiModel: string,
  userPrompt: string,
): Promise<ExtractedQuery> {
  const text = await callGemini(geminiApiKey, geminiModel, [
    {
      parts: [
        { text: SYSTEM_PROMPT },
        { text: `User prompt: "${userPrompt}"` },
      ],
    },
  ]);

  const cleaned = text.trim().replace(/^```json\s*|```\s*$/g, "").trim();

  let parsed: { searchQuery?: string; subjectType?: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new PipelineError(
      `Could not parse extraction result: ${cleaned.slice(0, 200)}`,
      "extracting_query",
    );
  }

  const searchQuery = parsed.searchQuery?.trim().replace(/^["']|["']$/g, "").trim();
  const subjectType = parsed.subjectType?.trim() || "a subject";

  if (!searchQuery || searchQuery.length < 2) {
    throw new PipelineError(
      "Could not extract a search query from the prompt",
      "extracting_query",
    );
  }

  return { searchQuery, subjectType };
}
