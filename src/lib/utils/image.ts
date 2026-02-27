const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export function inferMimeType(
  url: string,
  contentType?: string | null,
): string {
  if (contentType && contentType.startsWith("image/")) {
    return contentType.split(";")[0].trim();
  }
  const ext = url.split("?")[0].match(/\.\w+$/)?.[0]?.toLowerCase();
  return (ext && MIME_MAP[ext]) || "image/jpeg";
}

export async function fetchImageAsBase64(
  url: string,
  timeoutMs = 8000,
): Promise<{ base64: string; mimeType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "openNanoBanana/1.0" },
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type");
    if (contentType && !contentType.startsWith("image/")) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 100) return null; // too small to be a real image

    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = inferMimeType(url, contentType);

    return { base64, mimeType };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
