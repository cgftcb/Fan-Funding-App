import React, { useState } from 'react';
import { Lock, ImageOff } from 'lucide-react';

interface SecureImageProps {
  src: string;
  alt: string;
  className?: string;
  isLocked?: boolean;
  lockedMessage?: string;
}

export default function SecureImage({
  src,
  alt,
  className = '',
  isLocked = false,
  lockedMessage = 'Contribute to unlock this photo',
}: SecureImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (isLocked) {
    return (
      <div className={`relative flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden ${className}`}>
        <div className="absolute inset-0 backdrop-blur-lg bg-gray-200/80" />
        <div className="relative z-10 text-center p-4">
          <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{lockedMessage}</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center p-4">
          <ImageOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400">Image unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="protected-image-container relative overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Invisible overlay to block interactions */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background: 'transparent',
          pointerEvents: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      />

      {!isLoaded && (
        <div className={`flex items-center justify-center bg-gray-100 animate-pulse ${className}`}>
          <div className="w-8 h-8 bg-gray-200 rounded" />
        </div>
      )}

      <img
        src={src}
        alt={alt}
        className={`protected-image ${className} ${!isLoaded ? 'hidden' : ''}`}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          pointerEvents: 'none',
          WebkitUserDrag: 'none',
          KhtmlUserDrag: 'none',
          MozUserDrag: 'none',
          OUserDrag: 'none',
        } as React.CSSProperties}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
        draggable={false}
      />
    </div>
  );
}
