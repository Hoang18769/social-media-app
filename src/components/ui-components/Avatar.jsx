import Image from "next/image";
import { useState, useEffect, useCallback } from "react";

export default function Avatar({
  src,
  alt = "User avatar",
  width = 48,
  height = 48,
  className = "",
  ...props
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const defaultSrc = "/defaultAvatar.png";
  const imageSrc = !src || hasError ? defaultSrc : src;

  useEffect(() => {
    setHasError(false);
    if (src) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [src]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const isExternalUrl = imageSrc.startsWith("http://") || imageSrc.startsWith("https://");

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-gray-200 ${className}`}
      style={{ width, height }}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-full" />
      )}

      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className="object-cover rounded-full"
        unoptimized={isExternalUrl || imageSrc.startsWith("data:")}
        onError={handleError}
        onLoad={handleLoad}
        priority={false}
        {...props}
      />
    </div>
  );
}
