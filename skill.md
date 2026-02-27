# openNanoBanana -- Agent Skill

You are an AI agent implementing the openNanoBanana pipeline: real-time grounded image generation. This skill enables image generators (like Nano Banana Pro Edit, Flux, SDXL, etc.) to reference real-world subjects they were never trained on by searching the web for reference images, verifying them, and passing them to the generator.

## The Problem

Image generators fail when asked about specific real-world subjects they don't know -- a particular person, a specific building, a niche landmark. They hallucinate or refuse.

## The Solution

Ground the generator in real image data by searching the web first.

```
User: "andrej karpathy in a gta v poster"

Step 1: Extract search query -> "andrej karpathy" (strip artistic modifiers)
        Extract subject type  -> "a person" (generic visual category)

Step 2: Search Google Images  -> 5 candidate image URLs

Step 3: Verify images         -> "Does this image contain a person?" (yes/no)
        First "yes" becomes the reference image

Step 4: Generate              -> Send prompt + reference image to the generator
```

## Required APIs

| Service | Purpose | Endpoint | Auth |
|---------|---------|----------|------|
| Gemini | Query extraction + image verification | `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | Header: `x-goog-api-key: {key}` |
| Serper.dev | Google image search | `POST https://google.serper.dev/images` | Header: `X-API-KEY: {key}` |
| RunPod | Image generation (Nano Banana Pro Edit) | `POST https://api.runpod.ai/v2/{endpoint}/run` | Header: `Authorization: Bearer {key}` |

## Step 1: Extract Search Query + Subject Type

Call Gemini to analyze the user's prompt and extract two things:
- **searchQuery**: The real-world subject to search for (artistic modifiers stripped)
- **subjectType**: A generic visual description for verification (NOT the specific name)

This separation is critical. The search engine finds the specific entity. Verification only confirms the image contains the right TYPE of thing.

### Prompt

```
You are a search query extractor. Given an image generation prompt, extract TWO things:

1. **searchQuery**: The real-world subject to search for as a reference image. Remove artistic style descriptors, effects, transformations, or hypothetical modifiers (e.g. "as a baby", "in cyberpunk style", "watercolor painting").
2. **subjectType**: A SHORT, generic visual description of what the subject IS -- the kind of thing a person could identify by looking at a photo (e.g. "a person", "a bridge", "a building", "a cat", "a street crossing"). Do NOT use the specific name. This is used to verify search results visually.

Return ONLY valid JSON, no markdown fences, no explanation.

Examples:
- "hkust entrance piazza in cyberpunk future" -> {"searchQuery":"hkust entrance piazza","subjectType":"an outdoor plaza at a university"}
- "golden gate bridge at sunset watercolor painting" -> {"searchQuery":"golden gate bridge","subjectType":"a suspension bridge"}
- "dr ct abraham as a baby" -> {"searchQuery":"dr ct abraham","subjectType":"a person"}
- "my cat wearing a top hat in van gogh style" -> {"searchQuery":"cat wearing top hat","subjectType":"a cat"}
- "tokyo shibuya crossing in anime style" -> {"searchQuery":"tokyo shibuya crossing","subjectType":"a busy street crossing"}
- "labrador puppy in a spacesuit" -> {"searchQuery":"labrador puppy","subjectType":"a dog"}
```

### Gemini API Call

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent
Headers:
  x-goog-api-key: {GEMINI_API_KEY}
  Content-Type: application/json
Body:
{
  "contents": [{
    "parts": [
      { "text": "{SYSTEM_PROMPT_ABOVE}" },
      { "text": "User prompt: \"{user_prompt}\"" }
    ]
  }]
}
Response: candidates[0].content.parts[0].text -> parse as JSON
```

### Why subjectType matters

LLMs cannot reliably identify specific people, buildings, or objects by name from photos. But they CAN identify categories: "Is this a person?" "Is this a bridge?" Google Search is already trusted to find the right specific entity -- verification just confirms the image contains the right kind of thing.

## Step 2: Search for Reference Images

Use the extracted `searchQuery` to find candidate reference images via Serper.dev.

```
POST https://google.serper.dev/images
Headers:
  X-API-KEY: {SERPER_API_KEY}
  Content-Type: application/json
Body:
{
  "q": "{searchQuery}",
  "num": 5
}
Response: images[].imageUrl (direct image URLs)
```

Returns an array of `{ title, imageUrl, link }`. Use 5 candidates as a good balance of coverage vs speed.

## Step 3: Verify Images

For each candidate image:
1. Download the image and convert to base64
2. Send to Gemini with the subject type verification prompt
3. Return the first image that passes verification (early termination)

### Download Image

Fetch the image URL with an 8-second timeout. Detect MIME type from the Content-Type header, falling back to URL extension. Skip images that fail to download.

### Verification Prompt

```
Does this image clearly contain {subjectType}? Answer with ONLY "yes" or "no".
```

### Gemini API Call (with image)

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent
Headers:
  x-goog-api-key: {GEMINI_API_KEY}
  Content-Type: application/json
Body:
{
  "contents": [{
    "parts": [
      {
        "inline_data": {
          "mime_type": "{image_mime_type}",
          "data": "{base64_encoded_image}"
        }
      },
      {
        "text": "Does this image clearly contain {subjectType}? Answer with ONLY \"yes\" or \"no\"."
      }
    ]
  }]
}
```

If the response starts with "yes", this image is verified. Return it immediately (skip remaining candidates). If all images fail verification, the pipeline fails with a user-facing error.

### Error Handling

- If image download fails: skip, try next candidate
- If Gemini throws (safety filter, rate limit): skip, try next candidate
- If ALL candidates fail: throw an error asking the user to rephrase

## Step 4: Generate Image

Submit the original user prompt + the verified reference image URL to the image generator.

### RunPod Submit (Nano Banana Pro Edit)

```
POST https://api.runpod.ai/v2/{endpoint_id}/run
Headers:
  Authorization: Bearer {RUNPOD_API_KEY}
  Content-Type: application/json
Body:
{
  "input": {
    "prompt": "{original_user_prompt}",
    "images": ["{verified_image_url}"],
    "resolution": "1k",
    "output_format": "jpeg",
    "enable_base64_output": false
  }
}
Response: { id: "job-xxx", status: "IN_QUEUE" }
```

### RunPod Poll

```
GET https://api.runpod.ai/v2/{endpoint_id}/status/{job_id}
Headers:
  Authorization: Bearer {RUNPOD_API_KEY}
Response: { id, status, output, error }
```

Poll every 3 seconds, up to 40 attempts (2 minutes). Status flow: `IN_QUEUE -> IN_PROGRESS -> COMPLETED`.

The output URL is at `output.result` (primary) or `output.image_url` (fallback).

### Network Retry

During the polling loop, transient network errors (DNS failures, connection resets) are expected over a 2-minute window. Retry up to 3 consecutive network failures before giving up. API errors (401, 403, etc.) fail immediately.

## Adapting to Other Generators

This pipeline is generator-agnostic. To use a different backend:

1. Replace Step 4 with your generator's API
2. Pass the verified reference image URL (or base64) as the reference/input image
3. Pass the original user prompt as the text prompt
4. The extraction, search, and verification steps remain identical

Works with: Flux (with IP-Adapter), SDXL (with ControlNet), Stable Diffusion 3, or any model that accepts a reference image + text prompt.

## Key Design Decisions

**Trust the search engine.** Google/Serper is excellent at finding the right specific entity. Don't try to verify identity -- verify category.

**Separate concerns.** "dr ct abraham as a baby" -- "dr ct abraham" is for search, "as a baby" is for the generator, "a person" is for verification. Each step gets only what it needs.

**Early termination.** Stop verifying images the moment one passes. This saves API calls, time, and money.

**Graceful degradation.** Skip failed downloads and Gemini errors during verification. Only fail if ALL candidates are exhausted.

**Network resilience.** The RunPod polling loop runs for up to 2 minutes. Transient network errors are normal over that window. Retry them instead of failing the entire pipeline.

## Full Pipeline Pseudocode

```
function openNanoBanana(userPrompt, geminiKey, serperKey, runpodKey):
    // Step 1: Understand what to search for
    { searchQuery, subjectType } = askGemini(
        "Extract search query and subject type from: {userPrompt}"
    )

    // Step 2: Find reference images
    candidates = serperImageSearch(searchQuery, num=5)

    // Step 3: Verify a reference image matches
    for image in candidates:
        imageData = download(image.url)
        if imageData is null: continue
        answer = askGemini(imageData, "Does this contain {subjectType}? yes/no")
        if answer == "yes":
            referenceImage = image
            break

    if no referenceImage:
        fail("No matching images found. Try rephrasing.")

    // Step 4: Generate with grounding
    result = runpodGenerate(
        prompt = userPrompt,           // full original prompt
        images = [referenceImage.url],  // verified reference
        resolution = "1k"
    )

    return result.output.result  // generated image URL
```

## Running the Web App

```bash
git clone https://github.com/geevegeorge/openNanoBanana.git
cd openNanoBanana
npm install
cp .env.example .env.local
# Add your API keys to .env.local
npm run dev
```

Open http://localhost:3000. You can also enter API keys directly in the UI (BYOK).

## API Keys

| Service | Get Key | Free Tier |
|---------|---------|-----------|
| Gemini | https://aistudio.google.com/app/apikey | Free, generous limits |
| Serper | https://serper.dev | 2,500 queries/month, no credit card |
| RunPod | https://www.runpod.io/console/serverless | Pay-per-use |
