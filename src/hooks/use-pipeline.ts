"use client";

import { useCallback, useReducer } from "react";
import type { PipelineEvent, PipelineStage, ImageSearchResult } from "@/lib/pipeline/types";

interface PipelineState {
  status: "idle" | "running" | "complete" | "error";
  events: PipelineEvent[];
  currentStage: PipelineStage | null;
  extractedQuery: string | null;
  searchResults: ImageSearchResult[] | null;
  verifiedImageUrl: string | null;
  resultImageUrl: string | null;
  error: string | null;
}

type Action =
  | { type: "START" }
  | { type: "EVENT"; event: PipelineEvent }
  | { type: "ERROR"; message: string };

const initialState: PipelineState = {
  status: "idle",
  events: [],
  currentStage: null,
  extractedQuery: null,
  searchResults: null,
  verifiedImageUrl: null,
  resultImageUrl: null,
  error: null,
};

function pipelineReducer(state: PipelineState, action: Action): PipelineState {
  switch (action.type) {
    case "START":
      return { ...initialState, status: "running" };

    case "EVENT": {
      const { event } = action;
      const next = {
        ...state,
        events: [...state.events, event],
        currentStage: event.stage,
      };

      if (event.data?.query) {
        next.extractedQuery = event.data.query as string;
      }
      if (event.data?.images) {
        next.searchResults = event.data.images as ImageSearchResult[];
      }
      if (event.data?.verifiedImage) {
        next.verifiedImageUrl = event.data.verifiedImage as string;
      }
      if (event.stage === "complete" && event.data?.resultUrl) {
        next.resultImageUrl = event.data.resultUrl as string;
        next.status = "complete";
      }
      if (event.stage === "error") {
        next.status = "error";
        next.error = event.message;
      }

      return next;
    }

    case "ERROR":
      return { ...state, status: "error", error: action.message };

    default:
      return state;
  }
}

interface GenerateParams {
  prompt: string;
  geminiApiKey?: string;
  serperApiKey?: string;
  runpodApiKey?: string;
}

export function usePipeline() {
  const [state, dispatch] = useReducer(pipelineReducer, initialState);

  const generate = useCallback(async (params: GenerateParams) => {
    dispatch({ type: "START" });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        dispatch({
          type: "ERROR",
          message: data.error || `Server error (${res.status})`,
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: PipelineEvent = JSON.parse(line.slice(6));
              dispatch({ type: "EVENT", event });
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      }
    } catch (err) {
      dispatch({
        type: "ERROR",
        message: err instanceof Error ? err.message : "Connection failed",
      });
    }
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "START" });
    dispatch({ type: "ERROR", message: "" });
    // reset to idle by creating a fresh action
  }, []);

  return { ...state, generate, reset };
}
