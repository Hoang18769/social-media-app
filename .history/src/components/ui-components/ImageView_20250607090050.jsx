"use client"
import Image from "next/image"

export default function ImageView({ images = [], token, onImageClick }) {
  if (!Array.isArray(images) || images.length === 0) return null

  const imageWrapperClass = "relative aspect-square rounded-lg overflow-hidden cursor-pointer"

  const appendToken = (url) => {
    try {
      const imageUrl = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost")
      imageUrl.searchParams.set("token", token)
      return imageUrl.toString()
    } catch (error) {
      console.error("Invalid image URL:", url)
      return url
    }
  }

  if (images.length === 1) {
    return (
      <div className={`${imageWrapperClass} mt-2`}>
        <Image
          src={appendToken(images[0])}
          alt="Post image"
          fill
          unoptimized
          onClick={() => onImageClick(0)}
          className="object-cover"
        />
      </div>
    )
  }

  if (images.length <= 3) {
    return (
      <div className={`grid grid-cols-${images.length} gap-2 mt-2`}>
        {images.map((img, index) => (
          <div key={index} className={imageWrapperClass}>
            <Image
              src={appendToken(img)}
              alt={`Post image ${index + 1}`}
              fill
              unoptimized
              onClick={() => onImageClick(index)}
              className="object-cover"
            />
          </div>
        ))}
      </div>
    )
  }

  if (images.length === 4) {
    return (
      <div className="grid grid-cols-2 gap-2 mt-2">
        {images.map((img, index) => (
          <div key={index} className={imageWrapperClass}>
            <Image
              src={appendToken(img)}
              alt={`Post image ${index + 1}`}
              fill
              unoptimized
              onClick={() => onImageClick(index)}
              className="object-cover"
            />
          </div>
        ))}
      </div>
    )
  }

  if (images.length >= 5) {
    return (
      <div className="grid grid-cols-2 gap-2 mt-2">
        {images.slice(0, 3).map((img, index) => (
          <div key={index} className={imageWrapperClass}>
            <Image
              src={appendToken(img)}
              alt={`Post image ${index + 1}`}
              fill
              unoptimized
              onClick={() => onImageClick(index)}
              className="object-cover"
            />
          </div>
        ))}
        <div className={`${imageWrapperClass} brightness-50`}>
          <Image
            src={appendToken(images[3])}
            alt="Post image 4"
            fill
            unoptimized
            onClick={() => onImageClick(3)}
            className="object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center text-white font-semibold text-lg">
            +{images.length - 4}
          </span>
        </div>
      </div>
    )
  }

  return null
}
