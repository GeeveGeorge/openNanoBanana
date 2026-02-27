# openNanoBanana

Real-time grounded image generation. Search the web for reference images, verify them with AI, and generate new images grounded in reality.

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/geevegeorge/openNanoBanana/blob/main/openNanoBanana_colab.ipynb)

**Try it free on Google Colab** -- runs the full pipeline on a free T4 GPU with a Gradio UI. No local setup needed, just paste your Gemini and Serper API keys.

## What it does

Current image generators are offline -- they can't reference real places or objects they weren't trained on. openNanoBanana fixes this with a multi-stage pipeline:

```
User prompt: "hkust entrance piazza in cyberpunk future"

[1] Extract Query    -- Gemini 3 Flash identifies the subject: "hkust entrance piazza"
[2] Image Search     -- Serper.dev finds reference images from the web
[3] Verify Match     -- Gemini 3 Flash confirms the images match the subject
[4] Generate         -- Nano Banana Pro Edit creates the final image with the reference
```

## Quick Start

```bash
git clone https://github.com/geevegeorge/openNanoBanana.git
cd openNanoBanana
npm install
cp .env.example .env.local
```

Add your API keys to `.env.local`:

```env
GEMINI_API_KEY=your_key_here
SERPER_API_KEY=your_key_here
RUNPOD_API_KEY=your_key_here
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Get API Keys

| Service | Link | Free Tier |
|---------|------|-----------|
| Gemini | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | Free, generous limits |
| Serper | [serper.dev](https://serper.dev) | 2,500 queries/month, no credit card |
| RunPod | [runpod.io/console/serverless](https://www.runpod.io/console/serverless) | Pay-per-use |

## BYOK

You can provide your own API keys through the UI without setting up `.env.local`. Click "API Keys (BYOK)" in the interface to enter your keys. They are stored in your browser's localStorage and sent directly to each API -- never stored server-side.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| LLM | Gemini 3 Flash |
| Image Search | Serper.dev |
| Image Generation | Nano Banana Pro Edit (RunPod) |
| Validation | Zod |
| Testing | Vitest |

## Project Structure

```
src/
  app/              -- Next.js pages and API routes
  lib/
    pipeline/       -- Core pipeline: extract, search, verify, generate
    clients/        -- API clients: Gemini, Serper, RunPod
    utils/          -- Image processing, SSE streaming, error handling
  components/       -- React UI components
  hooks/            -- Custom React hooks
__tests__/          -- Unit and integration tests
```

## Development

```bash
npm run dev         # Start dev server
npm test            # Run tests
npm run build       # Production build
```

## Deploy to Vercel

Push to GitHub, then import in [Vercel](https://vercel.com). Set your API keys as environment variables in the Vercel dashboard. Zero config needed.

Note: Vercel free tier has a 60-second function timeout. The pipeline typically completes in 25-55 seconds. Self-hosting removes this limit.

## License

MIT
