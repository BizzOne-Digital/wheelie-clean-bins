"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";

type Props = Omit<ImageProps, "src" | "alt"> & {
  src: string | null | undefined;
  alt: string;
  fallbackLabel?: string;
};

/** Allowed sources for next/image; anything else renders unoptimized or as a placeholder. */
function isOptimizable(src: string) {
  return src.startsWith("/api/uploads/") || src.startsWith("/brand/") || src.startsWith("/images/") || src.startsWith("https://images.unsplash.com/");
}

/**
 * next/image wrapper with a single-shot error fallback (no retry loops).
 * Legacy `/uploads/...` paths (old filesystem uploads) always show the placeholder.
 */
export function SafeImage({ src, alt, fallbackLabel, className, fill, width, height, ...rest }: Props) {
  const [failed, setFailed] = useState(false);
  const usable = !!src && !src.startsWith("/uploads/") && (src.startsWith("/") || src.startsWith("https://"));

  if (!usable || failed) {
    return (
      <div
        role="img"
        aria-label={alt || fallbackLabel || "Image unavailable"}
        className={`flex items-center justify-center bg-card-2 text-muted ${fill ? "absolute inset-0" : ""} ${className ?? ""}`}
        style={fill ? undefined : { width: Number(width) || undefined, height: Number(height) || undefined }}
      >
        <ImageOff className="h-6 w-6" aria-hidden />
      </div>
    );
  }

  const isGif = src.toLowerCase().split("?")[0].endsWith(".gif");
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      unoptimized={isGif || !isOptimizable(src)}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
