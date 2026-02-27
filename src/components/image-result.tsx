"use client";

interface ImageResultProps {
  imageUrl: string | null;
}

export function ImageResult({ imageUrl }: ImageResultProps) {
  if (!imageUrl) return null;

  return (
    <div className="w-full">
      <div className="rounded-2xl overflow-hidden shadow-lg bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Generated image"
          className="w-full h-auto"
        />
      </div>
      <div className="flex justify-center mt-4">
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2.5 rounded-full bg-sage text-white text-sm font-medium hover:bg-sage-dark transition-colors shadow-sm"
        >
          Download Image
        </a>
      </div>
    </div>
  );
}
