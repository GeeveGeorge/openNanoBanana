import type { PipelineEvent } from "@/lib/pipeline/types";

export type EventEmitter = (event: PipelineEvent) => void;

export function createSSEStream(
  run: (emit: EventEmitter) => Promise<void>,
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const emit: EventEmitter = (event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await run(emit);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unexpected error occurred";
        const stage =
          error && typeof error === "object" && "stage" in error
            ? (error as { stage: string }).stage
            : undefined;

        emit({
          stage: "error",
          message,
          data: { errorStage: stage },
          timestamp: Date.now(),
        });
      } finally {
        controller.close();
      }
    },
  });
}
