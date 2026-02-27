export interface ServerConfig {
  geminiApiKey?: string;
  serperApiKey?: string;
  runpodApiKey?: string;
  runpodEndpointId: string;
  geminiModel: string;
}

export function getServerConfig(): ServerConfig {
  return {
    geminiApiKey: process.env.GEMINI_API_KEY || undefined,
    serperApiKey: process.env.SERPER_API_KEY || undefined,
    runpodApiKey: process.env.RUNPOD_API_KEY || undefined,
    runpodEndpointId: process.env.RUNPOD_ENDPOINT_ID || "nano-banana-pro-edit",
    geminiModel: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
  };
}

export function resolveKey(
  byokKey: string | undefined,
  serverKey: string | undefined,
  serviceName: string,
): string {
  const key = byokKey || serverKey;
  if (!key) {
    throw new Error(`${serviceName} API key is required. Provide it via the UI or set it in .env.local`);
  }
  return key;
}
