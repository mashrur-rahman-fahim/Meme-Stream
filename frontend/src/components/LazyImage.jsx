import React, { useState, useRef, useEffect } from 'react';

const LazyImage = ({ 
  src, 
  alt, 
  className = "", 
  placeholder = null,
  onLoad = null,
  onError = null,
  threshold = 0.1 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin: '50px' // Load image 50px before it comes into view
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    setError(true);
    if (onError) onError();
  };

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {/* Placeholder while loading */}
      {!isLoaded && !error && (
        placeholder || (
          <div className="w-full h-full bg-base-200 animate-pulse flex items-center justify-center">
            <div className="loading loading-spinner loading-md"></div>
          </div>
        )
      )}
      
      {/* Actual image */}
      {isInView && !error && (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
        />
      )}
      
      {/* Error state */}
      {error && (
        <div className="w-full h-full bg-error/10 border border-error/20 flex items-center justify-center">
          <div className="text-error text-sm">Failed to load image</div>
        </div>
      )}
    </div>
  );
};

export default LazyImage;