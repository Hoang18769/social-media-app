import Image from "next/image";
import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const variants = {
  enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
};

const isVideo = (url = "") => /\.(mp4|webm|ogg)$/i.test(url);

// Media Carousel Component
export default function MediaCarousel({ media, page, setPage }) {
  const [touchStartX, setTouchStartX] = useState(null);
  
  // Validate media array and current index
  if (!media || !Array.isArray(media) || media.length === 0) {
    return (
      <div className="relative bg-black overflow-hidden w-full flex items-center justify-center min-h-[400px]">
        <p className="text-white">No media to display</p>
      </div>
    );
  }

  const showNext = useCallback(() => {
    if (page.index < media.length - 1) {
      setPage({ index: page.index + 1, direction: 1 });
    }
  }, [page.index, media.length, setPage]);

  const showPrev = useCallback(() => {
    if (page.index > 0) {
      setPage({ index: page.index - 1, direction: -1 });
    }
  }, [page.index, setPage]);

  const handleTouchStart = useCallback((e) => {
    setTouchStartX(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX > 50) showPrev();
    else if (deltaX < -50) showNext();
    setTouchStartX(null);
  }, [touchStartX, showPrev, showNext]);

  // Ensure valid index and media item
  const currentIndex = Math.max(0, Math.min(page.index, media.length - 1));
  const currentMedia = media[currentIndex];

  // Validate current media item
  if (!currentMedia) {
    return (
      <div className="relative bg-black overflow-hidden w-full flex items-center justify-center min-h-[400px]">
        <p className="text-white">Media not found</p>
      </div>
    );
  }

  console.log("MediaCarousel - Current media:", currentMedia);
  console.log("MediaCarousel - Is video:", isVideo(currentMedia));

  return (
    <div
      className="relative bg-black overflow-hidden w-full flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ minHeight: '400px' }}
    >
      <AnimatePresence initial={false} custom={page.direction}>
        <motion.div
          key={currentIndex}
          className="flex items-center justify-center w-full h-full"
          custom={page.direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {isVideo(currentMedia) ? (
            <video
              autoPlay
              controls
              className="max-w-full max-h-full object-contain"
              src={currentMedia}
              style={{ 
                width: 'auto', 
                height: 'auto',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
              onError={(e) => {
                console.error("Video load error:", e);
              }}
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={currentMedia}
                alt={`Post media ${currentIndex + 1}`}
                width={0}
                height={0}
                sizes="100vw"
                unoptimized
                className="max-w-full max-h-full object-contain"
                style={{ 
                  width: 'auto', 
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: '100%'
                }}
                onError={(e) => {
                  console.error("Image load error:", e);
                }}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      {currentIndex > 0 && (
        <button
          className="absolute top-1/2 left-2 -translate-y-1/2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full z-10"
          onClick={showPrev}
        >
          <ChevronLeft />
        </button>
      )}
      
      {currentIndex < media.length - 1 && (
        <button
          className="absolute top-1/2 right-2 -translate-y-1/2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full z-10"
          onClick={showNext}
        >
          <ChevronRight />
        </button>
      )}

      {/* Media counter */}
      {media.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-2 py-1 rounded text-sm">
          {currentIndex + 1} / {media.length}
        </div>
      )}
    </div>
  );
}