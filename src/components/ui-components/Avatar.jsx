import Image from "next/image";
import { useState, useEffect } from "react";

// Try multiple fallback approaches
const getDefaultAvatar = () => {
  // Method 1: Public folder
  const publicPath = "/images/AfroAvatar.png";
  
  // Method 2: Try importing if available
  let importedAvatar = null;
  try {
    // This might work if the import path is correct
    importedAvatar = require("@/assests/photo/AfroAvatar.png");
  } catch (e) {
    console.log("Import fallback failed:", e.message);
  }
  
  // Method 3: Base64 placeholder (you can replace this with your actual image)
  const base64Placeholder = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiNEMUQ1REIiLz4KPGNpcmNsZSBjeD0iMzIiIGN5PSIyNCIgcj0iOCIgZmlsbD0iIzZCNzI4MCIvPgo8cGF0aCBkPSJNMTYgNTJDMTYgNDEuNTA4NiAyMS41MDg2IDM2IDMyIDM2QzQyLjQ5MTQgMzYgNDggNDEuNTA4NiA0OCA1MkM0OCA1Ny41MjI4IDQ0LjQxODMgNjIgNDAgNjJIMjRDMTkuNTgxNyA2MiAxNiA1Ny41MjI4IDE2IDUyWiIgZmlsbD0iIzZCNzI4MCIvPgo8L3N2Zz4K";
  
  return importedAvatar?.default || importedAvatar || publicPath;
};

export default function Avatar({
  src,
  alt = "User avatar",
  width = 64,
  height = 64,
  className = "",
  ...props
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSrc, setCurrentSrc] = useState(src);
  
  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
    setCurrentSrc(src);
    setIsLoading(true);
  }, [src]);
  
  // Determine which source to use
  const finalSrc = (!currentSrc || hasError) ? getDefaultAvatar() : currentSrc;
  
  // Check if it's an external URL that needs unoptimized
  const isExternalUrl = typeof finalSrc === "string" && 
    (finalSrc.startsWith("http://") || finalSrc.startsWith("https://"));
  
  const handleError = (e) => {
    if (!hasError) {
      setHasError(true);
      setIsLoading(false);
    }
  };
  
  const handleLoad = (e) => {
    setIsLoading(false);
  };

  // Fallback to regular img if Next.js Image fails
  const [useRegularImg, setUseRegularImg] = useState(false);

  if (useRegularImg) {
    return (
      <div
        className={`relative rounded-full overflow-hidden w-8 h-8 sm:w-12 sm:h-12 md:w-12 md:h-12 bg-gray-200 flex items-center justify-center ${className}`}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        
        {/* Regular img as fallback */}
        <img
          src={finalSrc}
          alt={alt}
          className="w-full h-full object-cover"
          onError={(e) => {
            console.log("Regular img also failed, showing placeholder");
            e.target.style.display = 'none';
            setIsLoading(false);
          }}
          onLoad={handleLoad}
          {...props}
        />
        
        {/* Ultimate fallback - CSS-only avatar */}
        {!isLoading && hasError && (
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {alt.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-full overflow-hidden w-8 h-8 sm:w-12 sm:h-12 md:w-12 md:h-12 bg-gray-200 flex items-center justify-center ${className}`}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      
      <Image
        src={finalSrc}
        alt={alt}
        width={width}
        height={width} // Square avatar
        className="w-full h-full object-cover"
        unoptimized={isExternalUrl || finalSrc.startsWith("data:")}
        onError={(e) => {
          handleError(e);
          // If Next.js Image fails, try regular img
          setUseRegularImg(true);
        }}
        onLoad={handleLoad}
        priority={false}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        {...props}
      />
      
      {/* Ultimate CSS fallback */}
      {!isLoading && hasError && !useRegularImg && (
        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
          <span className="text-white font-bold text-lg">
            {alt.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

// Debug component to help troubleshoot
export function AvatarDebug({ src }) {
  const defaultAvatar = getDefaultAvatar();
  
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