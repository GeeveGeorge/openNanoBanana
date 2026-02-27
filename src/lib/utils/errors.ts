import type { PipelineStage } from "@/lib/pipeline/types";

export class PipelineError extends Error {
  constructor(
    message: string,
    public stage: PipelineStage,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public service: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class RateLimitError extends ApiError {
  constructor(
    service: string,
    public retryAfterMs?: number,
  ) {
    super(`Rate limited by ${service}`, 429, service);
    this.name = "RateLimitError";
  }
}
