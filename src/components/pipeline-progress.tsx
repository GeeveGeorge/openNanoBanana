"use client";

import type { PipelineStage } from "@/lib/pipeline/types";

interface Step {
  id: PipelineStage;
  label: string;
}

const STEPS: Step[] = [
  { id: "extracting_query", label: "Extract Query" },
  { id: "searching_images", label: "Search Images" },
  { id: "verifying_images", label: "Verify Match" },
  { id: "generating_image", label: "Generate" },
];

function getStepState(
  stepId: PipelineStage,
  currentStage: PipelineStage | null,
  pipelineStatus: string,
): "pending" | "active" | "done" | "error" {
  if (pipelineStatus === "error") {
    if (stepId === currentStage) return "error";
  }

  const stageOrder = STEPS.map((s) => s.id);
  const currentIdx = currentStage ? stageOrder.indexOf(currentStage) : -1;
  const stepIdx = stageOrder.indexOf(stepId);

  if (currentStage === "complete") return "done";
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

interface PipelineProgressProps {
  currentStage: PipelineStage | null;
  pipelineStatus: string;
  currentMessage?: string;
}

export function PipelineProgress({
  currentStage,
  pipelineStatus,
  currentMessage,
}: PipelineProgressProps) {
  if (!currentStage) return null;

  return (
    <div className="w-full">
      {/* Horizontal step circles */}
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-10 right-10 h-0.5 bg-dark/10" />

        {STEPS.map((step) => {
          const state = getStepState(step.id, currentStage, pipelineStatus);
          return (
            <div key={step.id} className="flex flex-col items-center gap-2 relative z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                  state === "done"
                    ? "bg-sage text-white"
                    : state === "active"
                      ? "bg-sunflower text-dark"
                      : state === "error"
                        ? "bg-rose text-white"
                        : "bg-cream-dark text-dark/30 border-2 border-dark/10"
                }`}
              >
                {state === "done" ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : state === "active" ? (
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : state === "error" ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-dark/20" />
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  state === "done"
                    ? "text-sage"
                    : state === "active"
                      ? "text-dark"
                      : state === "error"
                        ? "text-rose"
                        : "text-dark/30"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      {currentMessage && (
        <p className="text-center text-sm text-dark/60 mt-4 animate-pulse">
          {currentMessage}
        </p>
      )}
    </div>
  );
}
