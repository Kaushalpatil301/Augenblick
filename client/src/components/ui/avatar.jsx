import React from "react"
import { cn } from "../../lib/utils"

function Avatar({ className, ...props }) {
  return (
    <div
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full bg-gray-100",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({ className, src, alt, ...props }) {
  const [error, setError] = React.useState(false);
  
  if (error || !src) return null;

  return (
    <img
      className={cn("aspect-square size-full", className)}
      src={src}
      alt={alt}
      onError={() => setError(true)}
      {...props}
    />
  )
}

function AvatarFallback({ className, ...props }) {
  return (
    <div
      className={cn(
        "bg-gray-200 flex size-full items-center justify-center rounded-full text-xs font-medium text-gray-600",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
