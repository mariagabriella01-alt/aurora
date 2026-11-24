import { useState } from 'react';

interface ResilientImageProps {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  fallbackTitle: string;
}

export function ResilientImage({
  src,
  alt,
  caption,
  className = '',
  fallbackTitle,
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`relative flex items-center justify-center bg-gradient-to-br from-[#FAF0CA] via-[#FEF9E6] to-[#F4E9BF] border border-[#EADCA6] p-8 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="max-w-xs space-y-2">
          <svg
            viewBox="0 0 48 48"
            className="mx-auto h-8 w-8 text-[#13382C]/80"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M24 6C15 14 12 24 24 42C36 24 33 14 24 6Z" />
            <path d="M24 16V40" />
          </svg>
          <p className="font-editorial text-xl text-[#1C1917]">{fallbackTitle}</p>
        </div>
      </div>
    );
  }

  return (
    <figure className="relative h-full w-full">
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={className}
      />
      {caption && (
        <figcaption className="mt-2.5 text-xs italic text-[#57534E]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
