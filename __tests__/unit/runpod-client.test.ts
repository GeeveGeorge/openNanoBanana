import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitJob, pollStatus, submitAndPoll } from "@/lib/clients/runpod";
import { ApiError } from "@/lib/utils/errors";

describe("submitJob", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns job ID on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "job-123", status: "IN_QUEUE" }), { status: 200 }),
    );

    const id = await submitJob("key", "endpoint", { prompt: "test" });
    expect(id).toBe("job-123");
  });

  it("throws ApiError on 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("unauthorized", { status: 401 }),
    );

    await expect(submitJob("key", "endpoint", { prompt: "test" })).rejects.toThrow(ApiError);
  });

  it("throws if no job ID returned", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    await expect(submitJob("key", "endpoint", { prompt: "test" })).rejects.toThrow("job ID");
  });
});

describe("pollStatus", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns status result", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "job-123",
          status: "COMPLETED",
          output: { image_url: "https://img.runpod.ai/result.png" },
        }),
        { status: 200 },
      ),
    );

    const result = await pollStatus("key", "endpoint", "job-123");
    expect(result.status).toBe("COMPLETED");
    expect(result.output?.image_url).toBe("https://img.runpod.ai/result.png");
  });
});

describe("submitAndPoll", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("submits and polls until COMPLETED", async () => {
    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/run")) {
        return new Response(JSON.stringify({ id: "job-1", status: "IN_QUEUE" }), { status: 200 });
      }
      callCount++;
      if (callCount < 3) {
        return new Response(JSON.stringify({ id: "job-1", status: "IN_PROGRESS" }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          id: "job-1",
          status: "COMPLETED",
          output: { image_url: "https://result.png" },
        }),
        { status: 200 },
      );
    });

    const result = await submitAndPoll("key", "endpoint", { prompt: "test" }, {
      pollIntervalMs: 10,
      maxAttempts: 5,
    });

    expect(result.status).toBe("COMPLETED");
    expect(result.output?.image_url).toBe("https://result.png");
  });

  it("throws on FAILED status", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/run")) {
        return new Response(JSON.stringify({ id: "job-1", status: "IN_QUEUE" }), { status: 200 });
      }
      return new Response(
        JSON.stringify({ id: "job-1", status: "FAILED", error: "GPU OOM" }),
        { status: 200 },
      );
    });

    await expect(
      submitAndPoll("key", "endpoint", { prompt: "test" }, { pollIntervalMs: 10 }),
    ).rejects.toThrow("FAILED");
  });

  it("retries on transient network errors then succeeds", async () => {
    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/run")) {
        return new Response(JSON.stringify({ id: "job-1", status: "IN_QUEUE" }), { status: 200 });
      }
      callCount++;
      if (callCount <= 2) {
        throw new TypeError("fetch failed");
      }
      return new Response(
        JSON.stringify({ id: "job-1", status: "COMPLETED", output: { result: "https://ok.png" } }),
        { status: 200 },
      );
    });

    const onPoll = vi.fn();
    const result = await submitAndPoll("key", "endpoint", { prompt: "test" }, {
      pollIntervalMs: 10,
      maxAttempts: 10,
      onPoll,
    });

    expect(result.status).toBe("COMPLETED");
    expect(onPoll).toHaveBeenCalledWith("NETWORK_RETRY", expect.any(Number));
  });

  it("gives up after 3 consecutive network failures", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/run")) {
        return new Response(JSON.stringify({ id: "job-1", status: "IN_QUEUE" }), { status: 200 });
      }
      throw new TypeError("fetch failed");
    });

    await expect(
      submitAndPoll("key", "endpoint", { prompt: "test" }, { pollIntervalMs: 10, maxAttempts: 10 }),
    ).rejects.toThrow("fetch failed");
  });

  it("still throws immediately on ApiError during poll", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/run")) {
        return new Response(JSON.stringify({ id: "job-1", status: "IN_QUEUE" }), { status: 200 });
      }
      return new Response("unauthorized", { status: 401 });
    });

    await expect(
      submitAndPoll("key", "endpoint", { prompt: "test" }, { pollIntervalMs: 10 }),
    ).rejects.toThrow(ApiError);
  });

  it("throws on timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/run")) {
        return new Response(JSON.stringify({ id: "job-1", status: "IN_QUEUE" }), { status: 200 });
      }
      return new Response(JSON.stringify({ id: "job-1", status: "IN_PROGRESS" }), { status: 200 });
    });

    await expect(
      submitAndPoll("key", "endpoint", { prompt: "test" }, { pollIntervalMs: 10, maxAttempts: 3 }),
    ).rejects.toThrow("timed out");
  });
});
