import { ApiError } from "@/lib/utils/errors";

const BASE_URL = "https://api.runpod.ai/v2";

export interface RunPodInput {
  prompt: string;
  images?: string[];
  resolution?: string;
  output_format?: string;
  enable_base64_output?: boolean;
}

export interface RunPodResult {
  id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
  output?: Record<string, unknown>;
  error?: string;
}

export async function submitJob(
  apiKey: string,
  endpointId: string,
  input: RunPodInput,
): Promise<string> {
  const url = `${BASE_URL}/${endpointId}/run`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new ApiError("Invalid RunPod API key", res.status, "RunPod");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(
      `RunPod submit error (${res.status}): ${body.slice(0, 200)}`,
      res.status,
      "RunPod",
    );
  }

  const data = await res.json();
  if (!data.id) {
    throw new ApiError("RunPod did not return a job ID", 500, "RunPod");
  }

  return data.id;
}

export async function pollStatus(
  apiKey: string,
  endpointId: string,
  jobId: string,
): Promise<RunPodResult> {
  const url = `${BASE_URL}/${endpointId}/status/${jobId}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(
      `RunPod poll error (${res.status}): ${body.slice(0, 200)}`,
      res.status,
      "RunPod",
    );
  }

  return res.json();
}

export async function submitAndPoll(
  apiKey: string,
  endpointId: string,
  input: RunPodInput,
  options?: {
    pollIntervalMs?: number;
    maxAttempts?: number;
    onPoll?: (status: string, attempt: number) => void;
  },
): Promise<RunPodResult> {
  const pollInterval = options?.pollIntervalMs ?? 3000;
  const maxAttempts = options?.maxAttempts ?? 40;

  const jobId = await submitJob(apiKey, endpointId, input);
  let networkFailures = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, pollInterval));

    let result: RunPodResult;
    try {
      result = await pollStatus(apiKey, endpointId, jobId);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      networkFailures++;
      if (networkFailures >= 3) throw err;
      options?.onPoll?.("NETWORK_RETRY", attempt);
      continue;
    }
    networkFailures = 0;

    options?.onPoll?.(result.status, attempt);

    if (result.status === "COMPLETED") {
      return result;
    }

    if (result.status === "FAILED" || result.status === "CANCELLED") {
      throw new ApiError(
        `RunPod job ${result.status}: ${result.error || "Unknown error"}`,
        500,
        "RunPod",
      );
    }
  }

  throw new ApiError(
    `RunPod job timed out after ${maxAttempts * pollInterval / 1000}s`,
    504,
    "RunPod",
  );
}
