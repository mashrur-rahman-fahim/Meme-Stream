import React from 'react';

export const PostCardSkeleton = () => {
  return (
    <div className="card bg-base-100 shadow-md border border-base-300 animate-pulse">
      <div className="card-body p-3 sm:p-5">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Avatar skeleton */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-base-200"></div>
            <div>
              {/* Name skeleton */}
              <div className="h-4 sm:h-5 bg-base-200 rounded w-24 mb-1"></div>
              {/* Date skeleton */}
              <div className="h-3 bg-base-200 rounded w-16"></div>
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-2 mb-3">
          <div className="h-4 bg-base-200 rounded w-full"></div>
          <div className="h-4 bg-base-200 rounded w-3/4"></div>
          <div className="h-4 bg-base-200 rounded w-1/2"></div>
        </div>

        {/* Image skeleton */}
        <div className="relative w-full h-48 sm:h-64 rounded-lg bg-base-200 mb-3"></div>

        {/* Interactions skeleton */}
        <div className="flex justify-between items-center text-xs sm:text-sm mb-2">
          <div className="h-3 bg-base-200 rounded w-16"></div>
          <div className="h-3 bg-base-200 rounded w-20"></div>
        </div>

        <div className="divider my-1"></div>

        {/* Action buttons skeleton */}
        <div className="flex justify-around items-center">
          <div className="h-8 bg-base-200 rounded w-16"></div>
          <div className="h-8 bg-base-200 rounded w-20"></div>
          <div className="h-8 bg-base-200 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
};

export const FeedSkeleton = ({ count = 5 }) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {Array.from({ length: count }).map((_, index) => (
        <PostCardSkeleton key={index} />
      ))}
    </div>
  );
};

export const CommentSkeleton = () => {
  return (
    <div className="flex gap-2 animate-pulse">
      {/* Avatar skeleton */}
      <div className="w-8 h-8 rounded-full bg-base-200"></div>
      <div className="flex-1">
        {/* Comment bubble skeleton */}
        <div className="bg-base-200 rounded-2xl px-3 py-2">
          <div className="h-3 bg-base-300 rounded w-16 mb-1"></div>
          <div className="space-y-1">
            <div className="h-3 bg-base-300 rounded w-full"></div>
            <div className="h-3 bg-base-300 rounded w-2/3"></div>
          </div>
        </div>
        {/* Comment actions skeleton */}
        <div className="flex gap-4 mt-1">
          <div className="h-2 bg-base-200 rounded w-12"></div>
          <div className="h-2 bg-base-200 rounded w-8"></div>
        </div>
      </div>
    </div>
  );
};

export const CommentsSkeleton = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <CommentSkeleton key={index} />
      ))}
    </div>
  );
};

export const ProfileHeaderSkeleton = () => {
  return (
    <div className="card bg-base-100 shadow-md animate-pulse">
      <div className="card-body">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Avatar skeleton */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-base-200"></div>
          
          <div className="text-center sm:text-left flex-1">
            {/* Name skeleton */}
            <div className="h-6 bg-base-200 rounded w-32 mb-2"></div>
            {/* Email skeleton */}
            <div className="h-4 bg-base-200 rounded w-40 mb-2"></div>
            {/* Bio skeleton */}
            <div className="space-y-1">
              <div className="h-3 bg-base-200 rounded w-full"></div>
              <div className="h-3 bg-base-200 rounded w-2/3"></div>
            </div>
            
            {/* Stats skeleton */}
            <div className="flex gap-4 mt-4 justify-center sm:justify-start">
              <div className="text-center">
                <div className="h-5 bg-base-200 rounded w-8 mb-1"></div>
                <div className="h-3 bg-base-200 rounded w-12"></div>
              </div>
              <div className="text-center">
                <div className="h-5 bg-base-200 rounded w-8 mb-1"></div>
                <div className="h-3 bg-base-200 rounded w-16"></div>
              </div>
              <div className="text-center">
                <div className="h-5 bg-base-200 rounded w-8 mb-1"></div>
                <div className="h-3 bg-base-200 rounded w-14"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatMessageSkeleton = () => {
  return (
    <div className="flex gap-2 animate-pulse mb-4">
      {/* Avatar skeleton */}
      <div className="w-8 h-8 rounded-full bg-base-200"></div>
      <div className="flex-1">
        {/* Message bubble skeleton */}
        <div className="bg-base-200 rounded-lg px-3 py-2 max-w-xs">
          <div className="space-y-1">
            <div className="h-3 bg-base-300 rounded w-full"></div>
            <div className="h-3 bg-base-300 rounded w-2/3"></div>
          </div>
        </div>
        {/* Timestamp skeleton */}
        <div className="h-2 bg-base-200 rounded w-12 mt-1"></div>
      </div>
    </div>
  );
};

export const ChatSkeleton = ({ count = 5 }) => {
  return (
    <div className="flex-1 p-4">
      {Array.from({ length: count }).map((_, index) => (
        <ChatMessageSkeleton key={index} />
      ))}
    </div>
  );
};

export const NavbarSkeleton = () => {
  return (
    <div className="navbar bg-base-100 shadow-lg animate-pulse">
      <div className="navbar-start">
        {/* Logo skeleton */}
        <div className="h-8 bg-base-200 rounded w-32"></div>
      </div>
      
      <div className="navbar-end">
        <div className="flex items-center gap-2">
          {/* Search skeleton */}
          <div className="h-10 bg-base-200 rounded w-48 hidden sm:block"></div>
          
          {/* Notification bell skeleton */}
          <div className="w-10 h-10 rounded-full bg-base-200"></div>
          
          {/* Avatar skeleton */}
          <div className="w-10 h-10 rounded-full bg-base-200"></div>
        </div>
      </div>
    </div>
  );
};

// Generic loading skeleton component
export const GenericSkeleton = ({ 
  lines = 3, 
  avatar = false, 
  image = false, 
  className = "" 
}) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {avatar && (
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-base-200"></div>
          <div>
            <div className="h-4 bg-base-200 rounded w-24 mb-1"></div>
            <div className="h-3 bg-base-200 rounded w-16"></div>
          </div>
        </div>
      )}
      
      {image && (
        <div className="w-full h-48 bg-base-200 rounded-lg mb-4"></div>
      )}
      
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div 
            key={index}
            className={`h-4 bg-base-200 rounded ${
              index === lines - 1 ? 'w-2/3' : 'w-full'
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default {
  PostCardSkeleton,
  FeedSkeleton,
  CommentSkeleton,
  CommentsSkeleton,
  ProfileHeaderSkeleton,
  ChatMessageSkeleton,
  ChatSkeleton,
  NavbarSkeleton,
  GenericSkeleton
};