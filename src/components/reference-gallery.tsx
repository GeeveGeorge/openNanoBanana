"use client";

import type { ImageSearchResult } from "@/lib/pipeline/types";

interface ReferenceGalleryProps {
  images: ImageSearchResult[] | null;
  verifiedImageUrl: string | null;
}

export function ReferenceGallery({ images, verifiedImageUrl }: ReferenceGalleryProps) {
  if (!images || images.length === 0) return null;

  return (
    <div className="w-full">
      <h3 className="text-sm font-medium text-dark/60 mb-3">Reference Images</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {images.map((img, i) => {
          const isVerified = img.imageUrl === verifiedImageUrl;
          return (
            <div
              key={i}
              className={`relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 transition-all ${
                isVerified
                  ? "border-sage shadow-md shadow-sage/20"
                  : verifiedImageUrl
                    ? "border-dark/10 opacity-40"
                    : "border-dark/10"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.imageUrl}
                alt={img.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {isVerified && (
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-sage text-white flex items-center justify-center">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
