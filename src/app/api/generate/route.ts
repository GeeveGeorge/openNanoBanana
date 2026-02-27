import { NextRequest } from "next/server";
import { GenerateRequestSchema } from "@/lib/pipeline/types";
import { runPipeline } from "@/lib/pipeline";
import { getServerConfig, resolveKey } from "@/lib/config";
import { createSSEStream } from "@/lib/utils/stream";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const config = getServerConfig();

  try {
    const resolvedRequest = {
      ...parsed.data,
      geminiApiKey: resolveKey(parsed.data.geminiApiKey, config.geminiApiKey, "Gemini"),
      serperApiKey: resolveKey(parsed.data.serperApiKey, config.serperApiKey, "Serper"),
      runpodApiKey: resolveKey(parsed.data.runpodApiKey, config.runpodApiKey, "RunPod"),
    };

    const stream = createSSEStream((emit) =>
      runPipeline(resolvedRequest, emit, { geminiModel: config.geminiModel }),
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return Response.json({ error: message }, { status: 400 });
  }
}
