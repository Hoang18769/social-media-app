import Image from "next/image";
import { useState, useEffect, useCallback, useMemo } from "react";

// Memoize default avatar to prevent re-creation
const getDefaultAvatar = () => {
  const publicPath = "/images/AfroAvatar.png";
  
  let importedAvatar = null;
  try {
    importedAvatar = require("@/assests/photo/AfroAvatar.png");
  } catch (e) {
    // Silent fail for import
  }
  
  return importedAvatar?.default || importedAvatar || publicPath;
};

// Cache the default avatar
const DEFAULT_AVATAR = getDefaultAvatar();

export default function Avatar({
  src,
  alt = "User avatar",
  width = 64,
  height = 64,
  className = "",
  ...props
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(!!src); // Only loading if src exists
  const [useRegularImg, setUseRegularImg] = useState(false);
  
  // Memoize the final source to prevent unnecessary re-renders
  const finalSrc = useMemo(() => {
    return (!src || hasError) ? DEFAULT_AVATAR : src;
  }, [src, hasError]);
  
  // Check if it's an external URL
  const isExternalUrl = useMemo(() => {
    return typeof finalSrc === "string" && 
      (finalSrc.startsWith("http://") || finalSrc.startsWith("https://"));
  }, [finalSrc]);
  
  // Reset states when src changes
  useEffect(() => {
    if (src) {
      setHasError(false);
      setIsLoading(true);
      setUseRegularImg(false);
    } else {
      setIsLoading(false);
    }
  }, [src]);
  
  const handleError = useCallback((e) => {
    console.log("Image load error:", e);
    if (!hasError) {
      setHasError(true);
      setIsLoading(false);
    }
  }, [hasError]);
  
  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);
  
  const handleNextImageError = useCallback((e) => {
    console.log("Next.js Image failed, switching to regular img");
    setUseRegularImg(true);
    handleError(e);
  }, [handleError]);
  
  const handleRegularImgError = useCallback((e) => {
    console.log("Regular img also failed, showing fallback");
    e.target.style.display = 'none';
    setHasError(true);
    setIsLoading(false);
  }, []);
  
  // Generate fallback letter from alt text
  const fallbackLetter = useMemo(() => {
    return alt.charAt(0).toUpperCase();
  }, [alt]);
  
  // Base container classes
  const containerClasses = useMemo(() => {
    return `relative rounded-full overflow-hidden w-8 h-8 sm:w-12 sm:h-12 md:w-12 md:h-12 bg-gray-200 flex items-center justify-center ${className}`;
  }, [className]);

  // If we should use regular img element
  if (useRegularImg) {
    return (
      <div className={containerClasses}>
        {/* Loading skeleton - only show if still loading */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-full" />
        )}
        
        {/* Regular img as fallback */}
        <img
          src={finalSrc}
          alt={alt}
          className="w-full h-full object-cover transition-opacity duration-200"
          onError={handleRegularImgError}
          onLoad={handleLoad}
          style={{ 
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.2s ease-in-out'
          }}
          {...props}
        />
        
        {/* Ultimate fallback - CSS-only avatar */}
        {hasError && (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {fallbackLetter}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      {/* Loading skeleton - only show briefly */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-full" />
      )}
      
      {/* Next.js Image */}
      <Image
        src={finalSrc}
        alt={alt}
        width={width}
        height={width} // Square avatar
        className="w-full h-full object-cover transition-opacity duration-200"
        unoptimized={isExternalUrl || finalSrc.startsWith("data:")}
        onError={handleNextImageError}
        onLoad={handleLoad}
        priority={false}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        style={{ 
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.2s ease-in-out'
        }}
        {...props}
      />
      
      {/* Ultimate CSS fallback */}
      {hasError && !useRegularImg && (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
          <span className="text-white font-bold text-lg">
            {fallbackLetter}
          </span>
        </div>
      )}
    </div>
  );
}

// Optimized debug component
export function AvatarDebug({ src }) {
  const defaultAvatar = DEFAULT_AVATAR;
  
  return (
    <div className="p-4 border rounded bg-gray-50">
      <h3 className="font-bold mb-2">Avatar Debug Info:</h3>
      <div className="space-y-1 text-sm">
        <div>Provided src: <code>{src || 'null'}</code></div>
        <div>Default avatar: <code>{defaultAvatar}</code></div>
        <div>Public path exists: <code>/images/AfroAvatar.png</code></div>
        
        {/* Test images */}
        <div className="mt-4">
          <p className="font-semibold">Test renders:</p>
          <div className="flex gap-2 mt-2">
            <div>
              <p className="text-xs">Regular img (public):</p>
              <img 
                src="/images/AfroAvatar.png" 
                alt="test" 
                className="w-16 h-16 rounded-full object-cover border"
                onError={(e) => console.log("Public image failed:", e)}
                onLoad={() => console.log("Public image loaded")}
              />
            </div>
            
            <div>
              <p className="text-xs">Next.js Image:</p>
              <Image
                src="/images/AfroAvatar.png"
                alt="test"
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover border"
                onError={(e) => console.log("Next Image failed:", e)}
                onLoad={() => console.log("Next Image loaded")}
              />
            </div>
            
            <div>
              <p className="text-xs">Avatar component:</p>
              <Avatar src={src} width={64} height={64} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}