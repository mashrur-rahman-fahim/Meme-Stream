class SeenPostsManager {
  constructor() {
    this.storageKey = 'memestream_seen_posts';
    this.maxSeenPosts = 1000; // Limit storage size
    this.seenPosts = this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
      console.warn('Failed to load seen posts from storage:', error);
      return new Set();
    }
  }

  saveToStorage() {
    try {
      const postsArray = Array.from(this.seenPosts);

      // Keep only the most recent posts if we exceed the limit
      if (postsArray.length > this.maxSeenPosts) {
        const recentPosts = postsArray.slice(-this.maxSeenPosts);
        this.seenPosts = new Set(recentPosts);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(Array.from(this.seenPosts)));
    } catch (error) {
      console.warn('Failed to save seen posts to storage:', error);
    }
  }

  markAsSeen(postId) {
    if (!postId) return;
    this.seenPosts.add(String(postId));
    this.saveToStorage();
  }

  markMultipleAsSeen(postIds) {
    if (!Array.isArray(postIds)) return;

    postIds.forEach(postId => {
      if (postId) {
        this.seenPosts.add(String(postId));
      }
    });

    this.saveToStorage();
  }

  hasSeen(postId) {
    return this.seenPosts.has(String(postId));
  }

  getSeenPostIds() {
    return Array.from(this.seenPosts);
  }

  getSeenCount() {
    return this.seenPosts.size;
  }

  filterUnseenPosts(posts) {
    if (!Array.isArray(posts)) return [];

    return posts.filter(post => {
      if (!post || !post.id) return false;
      return !this.hasSeen(post.id);
    });
  }

  clearSeenPosts() {
    this.seenPosts.clear();
    localStorage.removeItem(this.storageKey);
  }

  // Clean up old posts (optional: call periodically)
  cleanupOldPosts(daysToKeep = 7) {
    try {
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      const stored = localStorage.getItem(this.storageKey);

      if (stored) {
        const data = JSON.parse(stored);
        // This is a simple approach - in a real app you might want to store timestamps
        // For now, we just limit by count in saveToStorage()
        console.log(`Cleanup would remove posts older than ${daysToKeep} days`);
      }
    } catch (error) {
      console.warn('Failed to cleanup old seen posts:', error);
    }
  }
}

// Singleton instance
const seenPostsManager = new SeenPostsManager();

export default seenPostsManager;