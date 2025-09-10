# Smart Feed Algorithm Implementation

## Overview

This document explains the implementation of the efficient feed algorithm for MemeStream that prioritizes friend posts while also showing non-friend content.

## Algorithm Details

### Backend Implementation (`PostController.cs`)

The feed algorithm is implemented in the `GetFeed` endpoint with the following features:

#### 1. **Friend Detection**

```csharp
var friendIds = _context.FriendRequests
    .Where(fr => fr.Status == FriendRequest.RequestStatus.Accepted &&
               (fr.SenderId == userId || fr.ReceiverId == userId))
    .Select(fr => fr.SenderId == userId ? fr.ReceiverId : fr.SenderId)
    .ToList();
```

#### 2. **Smart Scoring System**

The `CalculateFeedScore` method uses multiple factors:

- **Base Score**: 10.0 points for all posts
- **Friend Bonus**: +50.0 points for friend posts
- **Time Decay**:
  - Today: +30.0 points
  - Yesterday: +25.0 points
  - Last 3 days: +20.0 points
  - Last week: +15.0 points
  - Last 2 weeks: +10.0 points
  - Last month: +5.0 points
  - Older than a month: -10.0 points (penalty)
- **Engagement Bonus**: +2.0 points per reaction/comment
- **Special Bonuses**:
  - Fresh friend posts (≤3 days): +20.0 extra points
  - High engagement non-friend posts (≥5 interactions): +15.0 extra points

#### 3. **Post Ranking**

Posts are ordered by:

1. Feed score (descending)
2. Creation time (descending) as tiebreaker

### Frontend Implementation (`Feed.jsx`)

#### Features:

- **Pagination**: Loads 20 posts per page
- **Infinite Scroll**: "Load More" functionality
- **Real-time Updates**: Refresh button to get latest posts
- **Visual Indicators**:
  - Friend badges for friend posts
  - Feed score display
  - Engagement metrics
- **Responsive Design**: Matches existing MemeStream theme

#### User Experience:

- Loading states with spinners
- Error handling with user-friendly messages
- Empty state messaging
- Algorithm explanation for transparency

## Algorithm Benefits

### 1. **Friend Priority**

- Friend posts always get higher base scores
- Recent friend posts get significant boosts
- Ensures users see content from people they care about

### 2. **Content Diversity**

- Non-friend posts are included to prevent echo chambers
- High-engagement content from non-friends can compete
- Balances familiar content with discovery

### 3. **Temporal Relevance**

- Recent content is prioritized
- Time decay ensures old posts don't clog the feed
- Fresh content gets better visibility

### 4. **Engagement-Driven**

- Posts with more interactions rank higher
- Encourages quality content creation
- Popular content gets wider distribution

## API Endpoints

### `GET /api/Post/feed`

**Parameters:**

- `page` (optional, default: 1): Page number for pagination
- `pageSize` (optional, default: 20): Number of posts per page

**Response:**

```json
{
  "posts": [
    {
      "id": 1,
      "content": "Post content",
      "image": "image_url",
      "createdAt": "2025-01-01T00:00:00Z",
      "userId": 2,
      "user": {
        "id": 2,
        "name": "User Name",
        "email": "user@example.com",
        "image": "avatar_url",
        "bio": "User bio"
      },
      "isFriend": true,
      "engagementScore": 5,
      "daysOld": 1,
      "feedScore": 105.0
    }
  ],
  "page": 1,
  "pageSize": 20
}
```

## Testing the Algorithm

### Scenarios Covered:

1. **Friend Posts Priority**: Friend posts appear higher in feed
2. **Time Decay**: Recent posts rank higher than old ones
3. **Engagement Boost**: Popular posts get better visibility
4. **Mixed Content**: Both friend and non-friend posts are shown
5. **Balanced Distribution**: Algorithm prevents any single type from dominating

### Edge Cases:

- No posts available
- No friends
- All very old posts
- High engagement vs. friend priority conflicts

## Performance Considerations

### Backend Optimizations:

- Single database query with joins
- Efficient friend lookup
- Pagination to limit data transfer
- Score calculation in memory (post-query)

### Frontend Optimizations:

- Lazy loading with pagination
- Efficient state management
- Minimal re-renders with useCallback
- Error boundaries and loading states

## Future Enhancements

### Potential Improvements:

1. **Machine Learning**: Use ML to personalize scoring based on user behavior
2. **Content Categories**: Different scoring for different types of memes
3. **User Preferences**: Allow users to customize feed algorithm weights
4. **A/B Testing**: Compare different algorithm versions
5. **Caching**: Implement Redis caching for frequently accessed feeds
6. **Real-time Updates**: WebSocket integration for live feed updates

## Configuration

The algorithm parameters can be easily adjusted in the `CalculateFeedScore` method:

```csharp
private double CalculateFeedScore(bool isFriend, int daysOld, int engagementScore)
{
    double baseScore = 10.0;        // Adjustable base score
    double friendBonus = 50.0;      // Adjustable friend bonus
    double engagementMultiplier = 2.0; // Adjustable engagement weight
    // ... time decay parameters
}
```

This allows for easy tuning based on user feedback and analytics.
