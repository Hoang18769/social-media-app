import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import clsx from "clsx";

export default function Avatar({
  src,
  alt = "User avatar",
  width,
  height,
  className = "",
  ...props
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const previousSrcRef = useRef(src);

  const defaultSrc = "/defaultAvatar.png";
  const imageSrc = !src || hasError ? defaultSrc : src;
  const isExternalUrl = imageSrc.startsWith("http://") || imageSrc.startsWith("https://");

  const finalWidth = width ?? 48;
  const finalHeight = height ?? 48;
  const hasExplicitSize = width !== undefined && height !== undefined;

  // Add fallback class if no size provided via className
  const shouldApplyDefaultSize =
    !className.includes("w-") && !className.includes("h-") && !hasExplicitSize;

  useEffect(() => {
    if (previousSrcRef.current !== src) {
      setHasError(false);
      setImageLoaded(false);

      if (src && src !== defaultSrc) {
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }

      previousSrcRef.current = src;
    }
  }, [src]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    setImageLoaded(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setImageLoaded(true);
  }, []);

  return (
    <div
      className={clsx(
        "relative inline-block rounded-full overflow-hidden bg-gray-100",
        shouldApplyDefaultSize && "w-12 h-12",
        className
      )}
      style={hasExplicitSize ? { width: finalWidth, height: finalHeight } : undefined}
      {...props}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-full">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}

      <Image
        src={imageSrc}
        alt={alt}
        width={finalWidth}
        height={finalHeight}
        className={clsx(
          "object-cover object-center transition-opacity duration-200",
          imageLoaded ? "opacity-100" : "opacity-0"
        )}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
        onError={handleError}
        onLoad={handleLoad}
        unoptimized={isExternalUrl}
        priority={finalWidth > 100}
      />

      {!imageLoaded && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-full">
          <svg
            className="w-1/2 h-1/2 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
