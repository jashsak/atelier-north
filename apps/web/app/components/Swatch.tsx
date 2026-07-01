"use client";
import { useState } from "react";

export function Swatch({ hex, image, alt, className, style }: {
  hex: string; image: string; alt: string; className?: string; style?: React.CSSProperties;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={className}
      style={{
        background: hex, // born from the swatch's own colour — no grey flash
        aspectRatio: "2 / 3",
        overflow: "hidden",
        borderRadius: "var(--r-card)",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
        position: "relative",
        ...style,
      }}
    >
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={{
            width: "100%", height: "100%", objectFit: "cover", display: "block",
            opacity: loaded ? 1 : 0, transition: "opacity 240ms linear",
          }}
        />
      )}
    </div>
  );
}
