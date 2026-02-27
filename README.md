# openNanoBanana

Real-time grounded image generation. Search the web for reference images, verify them with AI, and generate new images grounded in reality.

## How it works

```
User prompt: "hkust entrance piazza in cyberpunk future"

[1] Extract Query    → Gemini 3 Flash identifies the subject: "hkust entrance piazza"
[2] Image Search     → Serper.dev finds reference photos from the web
[3] Verify Match     → Gemini 3 Flash confirms images match the subject
[4] Generate         → Creates the final image using the reference
```

## Web UI

```bash
git clone https://github.com/geevegeorge/openNanoBanana.git
cd openNanoBanana
npm install
cp .env.example .env.local
# Add your API keys to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You can also enter API keys directly in the UI.

### API Keys

| Service | Link | Free Tier |
|---------|------|-----------|
| Gemini | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | Free, generous limits |
| Serper | [serper.dev](https://serper.dev) | 2,500 queries/month, no credit card |
| RunPod | [runpod.io/console/serverless](https://www.runpod.io/console/serverless) | Pay-per-use |

## Google Colab (Free)

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/18oJDhunh_PVUYuUpmzvER7dhiXAMSOet?usp=sharing)

Runs the full pipeline on a free T4 GPU with a Gradio UI. No local setup needed -- just paste your Gemini and Serper API keys.

Uses FLUX.2-klein-4B (4-bit quantized) for image editing. For higher quality results, use the web UI which runs Nano Banana Pro Edit on RunPod.

## License

MIT
