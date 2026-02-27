import { z } from "zod/v4";

export const GenerateRequestSchema = z.object({
  prompt: z.string().min(3).max(1000),
  geminiApiKey: z.string().min(1).optional(),
  serperApiKey: z.string().min(1).optional(),
  runpodApiKey: z.string().min(1).optional(),
  runpodEndpointId: z.string().default("nano-banana-pro-edit"),
  options: z
    .object({
      resolution: z.enum(["1k", "2k", "4k"]).default("1k"),
      maxSearchResults: z.number().min(1).max(10).default(5),
    })
    .optional(),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export type PipelineStage =
  | "extracting_query"
  | "searching_images"
  | "verifying_images"
  | "generating_image"
  | "complete"
  | "error";

export interface PipelineEvent {
  stage: PipelineStage;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export interface ImageSearchResult {
  title: string;
  imageUrl: string;
  link: string;
}

export interface VerifiedImage {
  imageUrl: string;
  base64: string;
  mimeType: string;
}
