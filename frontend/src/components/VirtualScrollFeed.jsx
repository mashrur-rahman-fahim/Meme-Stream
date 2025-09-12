import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PostCard } from "./PostCard";
import { PostCardSkeleton } from "./LoadingSkeleton";

const ITEM_HEIGHT = 600; // Estimated height of each post card
const BUFFER_SIZE = 3; // Number of items to render outside viewport

export const VirtualScrollFeed = ({ 
  posts, 
  currentUser, 
  onEdit, 
  onDelete, 
  onUnshare, 
  onChange,
  hasMore,
  onLoadMore,
  loading
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(window.innerHeight);
  const containerRef = useRef();
  const scrollElementRef = useRef();

  // Calculate viewport bounds
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const endIndex = Math.min(
      posts.length,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, posts.length]);

  // Get visible posts
  const visiblePosts = useMemo(() => {
    return posts.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [posts, visibleRange]);

  // Handle scroll events with throttling
  const handleScroll = useCallback(() => {
    if (scrollElementRef.current) {
      const newScrollTop = scrollElementRef.current.scrollTop;
      setScrollTop(newScrollTop);

      // Load more when near bottom
      const { scrollHeight, scrollTop: currentScrollTop, clientHeight } = scrollElementRef.current;
      if (scrollHeight - currentScrollTop - clientHeight < 1000 && hasMore && !loading) {
        onLoadMore?.();
      }
    }
  }, [hasMore, loading, onLoadMore]);

  // Throttled scroll handler
  const throttledHandleScroll = useCallback(() => {
    let ticking = false;
    
    return () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
  }, [handleScroll])();

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Attach scroll listener
  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', throttledHandleScroll);
      return () => scrollElement.removeEventListener('scroll', throttledHandleScroll);
    }
  }, [throttledHandleScroll]);

  const totalHeight = posts.length * ITEM_HEIGHT;
  const offsetY = visibleRange.startIndex * ITEM_HEIGHT;

  return (
    <div ref={containerRef} className="h-full overflow-hidden">
      <div
        ref={scrollElementRef}
        className="h-full overflow-y-auto"
        style={{ height: '100%' }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            <div className="space-y-4 sm:space-y-6">
              {visiblePosts.map((post, index) => {
                const actualIndex = visibleRange.startIndex + index;
                return (
                  <div key={`${post.isShared ? "shared" : "post"}-${post.id}-${actualIndex}`}>
                    <PostCard
                      post={post}
                      currentUser={currentUser}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onUnshare={onUnshare}
                      onChange={onChange}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="space-y-4 sm:space-y-6">
            {Array.from({ length: 2 }).map((_, index) => (
              <PostCardSkeleton key={`loading-skeleton-${index}`} />
            ))}
          </div>
        )}

        {/* End of feed indicator */}
        {!hasMore && posts.length > 0 && (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">✨</div>
            <p className="text-base-content/60 text-sm">
              You're all caught up!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualScrollFeed;