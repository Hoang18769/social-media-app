// components/MediaDisplay.jsx
import Image from "next/image";
import { memo } from "react";

const isVideo = (url = "") => /\.(mp4|webm|ogg)$/i.test(url);

export const MediaDisplay = memo(({ url, alt, className = "" }) =>
  isVideo(url) ? (
    <video
      controls
      className={`rounded-lg max-h-60 w-full object-contain ${className}`}
      src={url}
    />
  ) : (
    <Image
      src={url}
      alt={alt}
      width={300}
      height={200}
      className={`rounded-lg max-h-60 w-auto object-contain ${className}`}
    />
  )
);

MediaDisplay.displayName = 'MediaDisplay';

