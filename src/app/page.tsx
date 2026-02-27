"use client";

import { useState, useCallback } from "react";
import { PromptForm } from "@/components/prompt-form";
import { ApiKeyPanel } from "@/components/api-key-panel";
import { PipelineProgress } from "@/components/pipeline-progress";
import { ReferenceGallery } from "@/components/reference-gallery";
import { ImageResult } from "@/components/image-result";
import { usePipeline } from "@/hooks/use-pipeline";

export default function Home() {
  const pipeline = usePipeline();
  const [byokKeys, setByokKeys] = useState({
    geminiApiKey: "",
    serperApiKey: "",
    runpodApiKey: "",
  });

  const handleGenerate = useCallback(
    (prompt: string) => {
      pipeline.generate({
        prompt,
        ...(byokKeys.geminiApiKey && { geminiApiKey: byokKeys.geminiApiKey }),
        ...(byokKeys.serperApiKey && { serperApiKey: byokKeys.serperApiKey }),
        ...(byokKeys.runpodApiKey && { runpodApiKey: byokKeys.runpodApiKey }),
      });
    },
    [pipeline.generate, byokKeys],
  );

  const lastMessage =
    pipeline.events.length > 0
      ? pipeline.events[pipeline.events.length - 1].message
      : undefined;

  return (
    <main className="min-h-screen bg-cream">
      {/* Header */}
      <header className="w-full px-6 py-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-[family-name:var(--font-heading)] font-semibold text-dark">
            openNanoBanana
          </h1>
          <a
            href="https://github.com/geevegeorge/openNanoBanana"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-dark/40 hover:text-sage transition-colors"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        {/* Hero */}
        <div className="text-center mb-10 mt-8">
          <h2 className="text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-dark mb-4">
            Grounded Image Generation
          </h2>
          <p className="text-lg text-dark/50 max-w-lg mx-auto">
            Generate images grounded in real-world references.
            Search, verify, create.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-dark/5 p-8 space-y-6">
          <PromptForm
            onSubmit={handleGenerate}
            disabled={pipeline.status === "running"}
          />

          <ApiKeyPanel onKeysChange={setByokKeys} />

          {/* Pipeline Progress */}
          {pipeline.status !== "idle" && (
            <div className="pt-4 border-t border-dark/5">
              <PipelineProgress
                currentStage={pipeline.currentStage}
                pipelineStatus={pipeline.status}
                currentMessage={lastMessage}
              />
            </div>
          )}

          {/* Error Display */}
          {pipeline.status === "error" && pipeline.error && (
            <div className="p-4 rounded-2xl bg-rose/10 border border-rose/20">
              <p className="text-sm text-rose font-medium">{pipeline.error}</p>
            </div>
          )}

          {/* Reference Gallery */}
          {pipeline.searchResults && (
            <ReferenceGallery
              images={pipeline.searchResults}
              verifiedImageUrl={pipeline.verifiedImageUrl}
            />
          )}

          {/* Extracted Query Badge */}
          {pipeline.extractedQuery && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-dark/40">Search query:</span>
              <span className="px-3 py-1 rounded-full bg-sunflower/20 text-xs font-medium text-dark/70">
                {pipeline.extractedQuery}
              </span>
            </div>
          )}
        </div>

        {/* Result - outside the card for full visual impact */}
        {pipeline.resultImageUrl && (
          <div className="mt-8">
            <ImageResult imageUrl={pipeline.resultImageUrl} />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-xs text-dark/30">
            Powered by Gemini 3 Flash, Serper, and Nano Banana Pro
          </p>
        </footer>
      </div>
    </main>
  );
}
