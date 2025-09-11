# MemeStream Feed Algorithm

## Overview

MemeStream's feed algorithm is designed to provide users with a personalized, engaging, and diverse social media experience. The algorithm prioritizes content from friends while ensuring discovery of interesting posts from all users on the platform.

## Core Principles

1. **Social Prioritization**: Friends' content gets higher visibility
2. **Public Discovery**: All users' posts are visible regardless of friendship status
3. **Engagement-Based Ranking**: Popular content surfaces naturally
4. **Freshness Factor**: Recent content is preferred over old content
5. **Content Diversity**: Balanced mix of friend and non-friend content

## Algorithm Components

### 1. Content Sources

The feed combines two primary content types:

#### Regular Posts
- All posts from users except the current user
- Includes posts from both friends and non-friends
- No filtering based on friendship status

#### Shared Posts
- Posts shared by other users
- Excludes the current user's own shares
- **Key Feature**: Excludes friend shares of the current user's own posts to prevent echo chambers

### 2. Scoring System

Each post receives a feed score calculated using multiple factors:

#### Base Score
- Starting value: **10 points**

#### Friend Bonus
- Friends' posts: **+50 points**
- Ensures friend content appears prominently in the feed

#### Time Decay Scoring
Posts are scored based on recency with exponential decay:

| Age | Score Bonus |
|-----|-------------|
| Today (0 days) | +35 points |
| Yesterday (1 day) | +28 points |
| 2-3 days | +22 points |
| 4-7 days | +16 points |
| 8-14 days | +10 points |
| 15-30 days | +3 points |
| 30+ days | -15 points (penalty) |

#### Engagement Scoring
Uses logarithmic scaling to prevent viral posts from completely dominating:
```
Score = Math.Log(engagementScore + 1) × 5.0
```
Where `engagementScore = reactions + comments`

This approach ensures balanced content distribution while still rewarding popular posts.

#### Special Bonuses

##### Fresh Friend Content
- Friend posts ≤ 3 days old: **+25 points**
- Ensures recent friend activity stays visible

##### High Engagement Non-Friends
- Non-friend posts with 5+ engagement: **+18 points**
- Allows popular content to compete with friend posts

##### Viral Content
- Posts with 10+ engagement: **+25 points**
- Surfaces exceptionally popular content

##### Ultra-Fresh Content
- Today's posts (within 24 hours): **+10 points**
- Additional boost for very recent content

##### Content Diversity
- Non-friend posts with 2+ engagement: **+8 points**
- Promotes discovery of interesting content from new users

## Feed Generation Process

1. **Query Regular Posts**
   - Fetch all posts excluding current user's posts
   - Include user information and friendship status
   - Calculate engagement metrics

2. **Query Shared Posts**
   - Fetch shared posts excluding:
     - Current user's own shares
     - Shares of current user's posts (prevents echo chamber)
   - Include original post and sharer information

3. **Score Calculation**
   - Apply scoring algorithm to all posts
   - Calculate feed score using combined factors

4. **Ranking & Pagination**
   - Sort by feed score (descending)
   - Secondary sort by creation time (descending)
   - Apply pagination (default: 20 posts per page)

## Algorithm Benefits

### For Users
- **Personalized Experience**: Friend content prioritization
- **Content Discovery**: Exposure to interesting non-friend posts
- **Relevance**: Recent and engaging content surfaces first
- **Variety**: Balanced mix prevents monotonous feeds

### For Platform
- **Engagement**: Users see content they're most likely to interact with
- **Growth**: Discovery mechanism helps users find new accounts to follow
- **Retention**: Fresh, relevant content keeps users active
- **Community**: Balances social connections with platform-wide discovery

## Technical Implementation

### Database Queries
- Uses Entity Framework with efficient joins
- Includes user information to minimize additional queries
- Calculates engagement metrics in-database for performance

### Performance Considerations
- Pagination prevents large result sets
- Engagement calculations use database aggregation
- Friendship lookups are optimized with indexed queries

### Scalability Features
- Logarithmic engagement scaling prevents runaway viral content
- Time-based scoring naturally ages out old content
- Configurable page sizes for different client needs

## Future Enhancements

Potential improvements to consider:

1. **Machine Learning Integration**
   - User interaction patterns
   - Content category preferences
   - Personalized engagement prediction

2. **Advanced Filtering**
   - Content type preferences
   - Topic-based filtering
   - User-defined blocked keywords

3. **Time-Based Personalization**
   - Different algorithms for different times of day
   - Weekend vs. weekday content preferences

4. **Social Graph Analysis**
   - Mutual friend influence
   - Second-degree connection content
   - Community detection for content grouping

## Configuration

Key algorithm parameters that can be tuned:

| Parameter | Current Value | Description |
|-----------|---------------|-------------|
| Friend Bonus | 50 points | Base advantage for friend content |
| Fresh Friend Bonus | 25 points | Extra boost for recent friend posts |
| Viral Threshold | 10 engagements | Minimum for viral content bonus |
| Diversity Threshold | 2 engagements | Minimum for non-friend discovery bonus |
| Page Size | 20 posts | Default posts per feed page |

---

*Last Updated: 2025-09-11*  
*Algorithm Version: 2.0*