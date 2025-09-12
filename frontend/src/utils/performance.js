// Performance utilities for the MemeStream application

// Debounce function for search inputs and API calls
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function for scroll events
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Image preloader utility
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Batch image preloader
export const preloadImages = async (sources) => {
  const promises = sources.map(preloadImage);
  return Promise.allSettled(promises);
};

// Memory-efficient object deep comparison
export const deepEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (let key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
      return false;
    }
  }

  return true;
};

// Lazy component loader
export const lazyWithDelay = (importFunc, delay = 0) => {
  return React.lazy(() => 
    Promise.all([
      importFunc(),
      new Promise(resolve => setTimeout(resolve, delay))
    ]).then(([moduleExports]) => moduleExports)
  );
};

// Performance monitoring utilities
export const measurePerformance = (name, fn) => {
  return (...args) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  };
};

// Check if user is on a slow connection
export const isSlowConnection = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return false;
  
  // Consider 2G, slow-2g, or effective type as slow
  const slowTypes = ['slow-2g', '2g'];
  return slowTypes.includes(connection.effectiveType) || connection.downlink < 1.5;
};

// Reduce motion for accessibility
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Device capabilities detection
export const getDeviceCapabilities = () => {
  return {
    isLowEndDevice: navigator.hardwareConcurrency <= 2,
    hasSlowConnection: isSlowConnection(),
    prefersReducedMotion: prefersReducedMotion(),
    screenSize: {
      width: window.screen.width,
      height: window.screen.height,
      isSmall: window.screen.width < 768
    },
    memory: navigator.deviceMemory || 4, // Default to 4GB if not available
  };
};

// Adaptive loading based on device capabilities
export const shouldUseOptimizedVersion = () => {
  const capabilities = getDeviceCapabilities();
  return capabilities.isLowEndDevice || capabilities.hasSlowConnection || capabilities.memory < 4;
};

// Format bytes for human readable display
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Request Idle Callback wrapper
export const runWhenIdle = (callback, options = {}) => {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    return setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 1);
  }
};

// Cancel idle callback
export const cancelIdleCallback = (id) => {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
};

export default {
  debounce,
  throttle,
  preloadImage,
  preloadImages,
  deepEqual,
  lazyWithDelay,
  measurePerformance,
  isSlowConnection,
  prefersReducedMotion,
  getDeviceCapabilities,
  shouldUseOptimizedVersion,
  formatBytes,
  runWhenIdle,
  cancelIdleCallback
};