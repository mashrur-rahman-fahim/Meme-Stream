import React, { useRef, useEffect } from 'react';

const PostVisibilityTracker = ({ postId, onVisible, children, threshold = 0.5 }) => {
  const elementRef = useRef(null);
  const hasBeenVisible = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasBeenVisible.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasBeenVisible.current) {
          hasBeenVisible.current = true;
          onVisible(postId);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -20% 0px', // Trigger when 20% from bottom
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [postId, onVisible, threshold]);

  return (
    <div ref={elementRef} style={{ minHeight: '1px' }}>
      {children}
    </div>
  );
};

export default PostVisibilityTracker;