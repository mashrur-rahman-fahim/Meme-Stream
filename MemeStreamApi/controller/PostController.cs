using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using MemeStreamApi.data;
using MemeStreamApi.model;
using MemeStreamApi.services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MemeStreamApi.controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class PostController : ControllerBase
    {
        private readonly MemeStreamDbContext _context;
        private readonly IMemeDetectionService _memeDetectionService;
        
        public PostController(MemeStreamDbContext context, IMemeDetectionService memeDetectionService)
        {
            this._context = context;
            this._memeDetectionService = memeDetectionService;
        }
        public class PostDto
        {
            public required string Content { get; set; }= string.Empty;
            public required string Image { get; set; }= string.Empty;
        }
        [Authorize]
        [HttpPost("create")]
        public async Task<IActionResult> CreatePost([FromBody] PostDto postDto)
        {
            Console.WriteLine("CreatePost called");
            
            try
            {
                // Check if user is authenticated
                var UserIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(UserIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                
                int UserId = int.Parse(UserIdClaim);
                var user = _context.Users.FirstOrDefault(u => u.Id == UserId);
                if (user == null)
                {
                    return NotFound("User not found.");
                }

                // Perform comprehensive meme detection on the content
                if (!string.IsNullOrWhiteSpace(postDto.Content) || !string.IsNullOrWhiteSpace(postDto.Image))
                {
                    var memeDetectionRequest = new MemeDetectionRequest
                    {
                        Text = postDto.Content,
                        ImageUrl = postDto.Image,
                        IncludeSentiment = true,
                        IncludeHumorScore = true,
                        IncludeMemeReferences = true,
                        IncludeCulturalContext = true
                    };

                    // Determine analysis mode based on available data
                    if (!string.IsNullOrEmpty(memeDetectionRequest.Text) && !string.IsNullOrEmpty(memeDetectionRequest.ImageUrl))
                    {
                        memeDetectionRequest.DetectionMode = "combined";
                    }
                    else if (!string.IsNullOrEmpty(memeDetectionRequest.ImageUrl))
                    {
                        memeDetectionRequest.DetectionMode = "image";
                    }
                    else if (!string.IsNullOrEmpty(memeDetectionRequest.Text))
                    {
                        memeDetectionRequest.DetectionMode = "text";
                    }

                    // Use the unified analysis method that automatically determines the mode
                    var memeDetectionResult = await _memeDetectionService.AnalyzeAsync(memeDetectionRequest);
                    
                    if (!memeDetectionResult.Success)
                    {
                        return BadRequest(new { 
                            error = "Meme detection failed", 
                            details = memeDetectionResult.Error 
                        });
                    }

                    // If it's NOT detected as a meme, block the post
                    if (memeDetectionResult.Result?.IsMeme != true)
                    {
                        return BadRequest(new { 
                            error = "Non-meme content detected", 
                            message = "This post does not contain meme content and cannot be published. Only memes are allowed!",
                            memeAnalysis = memeDetectionResult.Result,
                            analysisMode = memeDetectionResult.Result?.DetectionMode ?? "unknown"
                        });
                    }
                }
                else
                {
                    return BadRequest(new { 
                        error = "No content provided", 
                        message = "Please provide either text content, an image, or both to create a post."
                    });
                }

                // If not a meme, proceed to create the post
                var post = new Post
                {
                    Content = postDto.Content,
                    Image = postDto.Image,
                    UserId = UserId,
                    CreatedAt = DateTime.UtcNow,
                    User = user
                };

                _context.Posts.Add(post);
                _context.SaveChanges();
                return Ok(post);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreatePost: {ex.Message}");
                return BadRequest("Error creating post.");
            }
        }

        [Authorize]
        [HttpPost("check-meme")]
        public async Task<IActionResult> CheckMemeContent([FromBody] PostDto postDto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(postDto.Content) && string.IsNullOrWhiteSpace(postDto.Image))
                {
                    return Ok(new { 
                        isMeme = false, 
                        message = "No content to analyze - provide text, image, or both. Only memes are allowed!",
                        canPost = false,
                        analysisMode = "none"
                    });
                }

                var memeDetectionRequest = new MemeDetectionRequest
                {
                    Text = postDto.Content,
                    ImageUrl = postDto.Image,
                    IncludeSentiment = true,
                    IncludeHumorScore = true,
                    IncludeMemeReferences = true,
                    IncludeCulturalContext = true
                };

                // Determine analysis mode based on available data
                if (!string.IsNullOrEmpty(memeDetectionRequest.Text) && !string.IsNullOrEmpty(memeDetectionRequest.ImageUrl))
                {
                    memeDetectionRequest.DetectionMode = "combined";
                }
                else if (!string.IsNullOrEmpty(memeDetectionRequest.ImageUrl))
                {
                    memeDetectionRequest.DetectionMode = "image";
                }
                else if (!string.IsNullOrEmpty(memeDetectionRequest.Text))
                {
                    memeDetectionRequest.DetectionMode = "text";
                }

                // Use unified analysis that automatically determines the best mode
                var memeDetectionResult = await _memeDetectionService.AnalyzeAsync(memeDetectionRequest);
                
                if (!memeDetectionResult.Success)
                {
                    return BadRequest(new { 
                        error = "Meme detection failed", 
                        details = memeDetectionResult.Error 
                    });
                }

                var isMeme = memeDetectionResult.Result?.IsMeme == true;
                var analysisMode = memeDetectionResult.Result?.DetectionMode ?? "unknown";
                
                string message = analysisMode switch
                {
                    "text" => isMeme ? "Great! Your text is meme content and can be posted." : "Your text is not a meme and cannot be posted. Only memes are allowed!",
                    "image" => isMeme ? "Great! Your image contains meme elements and can be posted." : "Your image doesn't contain meme elements and cannot be posted. Only memes are allowed!",
                    "combined" => isMeme ? "Perfect! Your text and image together create meme content and can be posted." : "Your content combination is not a meme and cannot be posted. Only memes are allowed!",
                    _ => isMeme ? "Content detected as meme and can be posted." : "Content is not a meme and cannot be posted. Only memes are allowed!"
                };

                return Ok(new { 
                    isMeme = isMeme,
                    canPost = isMeme,
                    message = message,
                    analysisMode = analysisMode,
                    analysis = memeDetectionResult.Result
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CheckMemeContent: {ex.Message}");
                return BadRequest("Error checking meme content.");
            }
        }
        
        [Authorize]
        [HttpGet("get/{id}")]
        public IActionResult GetPost(int id)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var post = _context.Posts.FirstOrDefault(p => p.Id == id && p.UserId == int.Parse(userIdClaim));
                if (post == null)
                {
                    return NotFound("Post not found.");
                }
                return Ok(post);
            }
            catch (System.Exception)
            {

                return BadRequest("Error retrieving post.");
            }
        }

        [Authorize]
        [HttpGet("single/{id}")]
        public IActionResult GetSinglePost(int id)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                
                var post = _context.Posts
                    .Include(p => p.User)
                    .FirstOrDefault(p => p.Id == id);
                    
                if (post == null)
                {
                    return NotFound("Post not found.");
                }
                
                // Format the response similar to the feed format
                var formattedPost = new {
                    Id = post.Id,
                    Content = post.Content,
                    Image = post.Image,
                    CreatedAt = post.CreatedAt,
                    UserId = post.UserId,
                    User = new {
                        Id = post.User.Id,
                        Name = post.User.Name,
                        Email = post.User.Email,
                        Image = post.User.Image,
                        Bio = post.User.Bio
                    },
                    IsShared = false,
                    SharedBy = (object?)null,
                    SharedAt = (DateTime?)null
                };
                
                return Ok(formattedPost);
            }
            catch (System.Exception)
            {
                return BadRequest("Error retrieving post.");
            }
        }
        [Authorize]
        [HttpGet("posts")]
        public IActionResult GetPostsByUser()
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                int userId = int.Parse(userIdClaim);
                
                // Get user's original posts
                var originalPosts = _context.Posts
                    .Include(p => p.User)
                    .Where(p => p.UserId == userId)
                    .Select(p => new {
                        Id = p.Id,
                        Content = p.Content,
                        Image = p.Image,
                        CreatedAt = p.CreatedAt,
                        UserId = p.UserId,
                        User = new {
                            Id = p.User.Id,
                            Name = p.User.Name,
                            Email = p.User.Email,
                            Image = p.User.Image,
                            Bio = p.User.Bio
                        },
                        IsShared = false,
                        SharedBy = (object?)null,
                        SharedAt = (DateTime?)null,
                        OriginalPost = (object?)null
                    })
                    .ToList();

                // Get user's shared posts
                var sharedPosts = _context.SharedPosts
                    .Include(sp => sp.Post)
                        .ThenInclude(p => p.User)
                    .Include(sp => sp.User)
                    .Where(sp => sp.UserId == userId)
                    .Select(sp => new {
                        Id = sp.Id, // Use SharedPost ID for unique identification
                        Content = sp.Post.Content,
                        Image = sp.Post.Image,
                        CreatedAt = sp.SharedAt, // Use share date for sorting
                        UserId = sp.UserId,
                        User = new {
                            Id = sp.User.Id,
                            Name = sp.User.Name,
                            Email = sp.User.Email,
                            Image = sp.User.Image,
                            Bio = sp.User.Bio
                        },
                        IsShared = true,
                        SharedBy = new {
                            Id = sp.User.Id,
                            Name = sp.User.Name,
                            Email = sp.User.Email,
                            Image = sp.User.Image,
                            Bio = sp.User.Bio
                        },
                        SharedAt = sp.SharedAt,
                        OriginalPost = new {
                            Id = sp.Post.Id,
                            User = new {
                                Id = sp.Post.User.Id,
                                Name = sp.Post.User.Name,
                                Email = sp.Post.User.Email,
                                Image = sp.Post.User.Image,
                                Bio = sp.Post.User.Bio
                            },
                            CreatedAt = sp.Post.CreatedAt
                        }
                    })
                    .ToList();

                // Combine and sort by creation/share date
                var allPosts = originalPosts.Cast<dynamic>()
                    .Concat(sharedPosts.Cast<dynamic>())
                    .OrderByDescending(p => p.CreatedAt)
                    .ToList();

                return Ok(new { allPosts, posts = originalPosts, sharedPosts });
            }
            catch (System.Exception ex)
            {
                Console.WriteLine($"Error in GetPostsByUser: {ex.Message}");
                return BadRequest("Error retrieving posts.");
            }
        }
        [Authorize]
        [HttpGet("feed")]
        public IActionResult GetFeed(int page = 1, int pageSize = 25)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                int userId = int.Parse(userIdClaim);
                
                // Get user's friends
                var friendIds = _context.FriendRequests
                    .Where(fr => fr.Status == FriendRequest.RequestStatus.Accepted &&
                               (fr.SenderId == userId || fr.ReceiverId == userId))
                    .Select(fr => fr.SenderId == userId ? fr.ReceiverId : fr.SenderId)
                    .ToList();
                
                var now = DateTime.UtcNow;
                
                // Get all regular posts with user data and engagement metrics
                var regularPosts = _context.Posts
                    .Include(p => p.User)
                    .Where(p => p.UserId != userId) // Exclude user's own posts from feed
                    .Select(p => new {
                        Id = p.Id,
                        Content = p.Content,
                        Image = p.Image,
                        CreatedAt = p.CreatedAt,
                        UserId = p.UserId,
                        User = new {
                            Id = p.User.Id,
                            Name = p.User.Name,
                            Email = p.User.Email,
                            Image = p.User.Image,
                            Bio = p.User.Bio
                        },
                        IsFriend = friendIds.Contains(p.UserId),
                        // Calculate engagement score (reactions + comments count)
                        EngagementScore = _context.Reactions.Count(r => r.PostId == p.Id) + 
                                        _context.Comments.Count(c => c.PostId == p.Id),
                        // Time decay factor (newer posts get higher score)
                        DaysOld = (int)(now - p.CreatedAt).TotalDays,
                        IsShared = false,
                        SharedBy = (object?)null,
                        SharedAt = (DateTime?)null,
                        HasUserShared = _context.SharedPosts.Any(sp => sp.PostId == p.Id && sp.UserId == userId)
                    })
                    .ToList(); // Execute query first
                
                // Get all shared posts with original post data
                var sharedPosts = _context.SharedPosts
                    .Include(sp => sp.Post)
                        .ThenInclude(p => p.User)
                    .Include(sp => sp.User)
                    .Where(sp => sp.UserId != userId && // Exclude user's own shares from feed
                                sp.Post.UserId != userId) // Exclude shares of user's own posts
                    .Select(sp => new {
                        Id = sp.Post.Id,
                        Content = sp.Post.Content,
                        Image = sp.Post.Image,
                        CreatedAt = sp.SharedAt, // Use share date for sorting
                        UserId = sp.Post.UserId,
                        User = new {
                            Id = sp.Post.User.Id,
                            Name = sp.Post.User.Name,
                            Email = sp.Post.User.Email,
                            Image = sp.Post.User.Image,
                            Bio = sp.Post.User.Bio
                        },
                        IsFriend = friendIds.Contains(sp.UserId), // Check if sharer is friend
                        // Calculate engagement score (reactions + comments count)
                        EngagementScore = _context.Reactions.Count(r => r.PostId == sp.Post.Id) + 
                                        _context.Comments.Count(c => c.PostId == sp.Post.Id),
                        // Time decay factor (newer shares get higher score)
                        DaysOld = (int)(now - sp.SharedAt).TotalDays,
                        IsShared = true,
                        SharedBy = new {
                            Id = sp.User.Id,
                            Name = sp.User.Name,
                            Email = sp.User.Email,
                            Image = sp.User.Image,
                            Bio = sp.User.Bio
                        },
                        SharedAt = sp.SharedAt,
                        HasUserShared = _context.SharedPosts.Any(sp2 => sp2.PostId == sp.Post.Id && sp2.UserId == userId)
                    })
                    .ToList();
                
                // Combine regular posts and shared posts
                var allFeedItems = regularPosts.Cast<dynamic>().Concat(sharedPosts.Cast<dynamic>()).ToList();
                
                // ENHANCED ALGORITHM: Process larger dataset for better scoring, then filter
                // This ensures we have enough content for proper diversity and quality selection
                var scoredPosts = allFeedItems
                    .Select(p => new {
                        Id = (int)p.Id,
                        Content = (string?)p.Content,
                        Image = (string?)p.Image,
                        CreatedAt = (DateTime)p.CreatedAt,
                        UserId = (int)p.UserId,
                        User = p.User,
                        IsFriend = (bool)p.IsFriend,
                        EngagementScore = (int)p.EngagementScore,
                        DaysOld = (int)p.DaysOld,
                        IsShared = (bool)p.IsShared,
                        SharedBy = p.SharedBy,
                        SharedAt = p.SharedAt,
                        FeedScore = CalculateFeedScore((bool)p.IsFriend, (int)p.DaysOld, (int)p.EngagementScore, (int)p.UserId, (int)p.Id, (string?)p.Content, (string?)p.Image)
                    })
                    .OrderByDescending(p => p.FeedScore)
                    .ThenByDescending(p => p.CreatedAt)
                    .ToList();
                
                // Apply enhanced diverse feed algorithm for optimal content mixing
                var diverseFeedPosts = ApplyDiverseFeedAlgorithm(scoredPosts.Cast<dynamic>().ToList());
                
                // ENHANCED PAGINATION: Increased page size (25) provides better user experience
                // and reduces API calls while maintaining performance
                var feedPosts = diverseFeedPosts
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList();
                
                // PERFORMANCE METRICS: Track algorithm effectiveness (optional)
                var friendPostsCount = feedPosts.Count(p => (bool)p.IsFriend);
                var imagePostsCount = feedPosts.Count(p => !string.IsNullOrEmpty((string?)p.Image));
                var highEngagementCount = feedPosts.Count(p => (int)p.EngagementScore >= 5);
                
                return Ok(new { posts = feedPosts, page, pageSize });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetFeed: {ex.Message}");
                return BadRequest("Error retrieving feed.");
            }
        }

        private double CalculateFeedScore(bool isFriend, int daysOld, int engagementScore, int userId, int postId, string? content = null, string? image = null)
        {
            double baseScore = 15.0; // Increased base for better score distribution
            
            // ENHANCED FRIEND ALGORITHM - Balanced approach (reduced from 50 to 30)
            if (isFriend)
            {
                baseScore += 30.0; // Still prioritize friends but allow more discovery
            }
            
            // ENHANCED TIME DECAY - More granular and realistic
            var hoursSincePost = daysOld * 24;
            if (hoursSincePost <= 1) baseScore += 40.0;      // Last hour - peak freshness
            else if (hoursSincePost <= 6) baseScore += 35.0;  // Last 6 hours
            else if (hoursSincePost <= 24) baseScore += 30.0; // Today
            else if (daysOld == 1) baseScore += 25.0;         // Yesterday
            else if (daysOld <= 2) baseScore += 20.0;         // 2 days
            else if (daysOld <= 3) baseScore += 16.0;         // 3 days
            else if (daysOld <= 7) baseScore += 12.0;         // Week
            else if (daysOld <= 14) baseScore += 8.0;         // 2 weeks
            else if (daysOld <= 30) baseScore += 3.0;         // Month
            else baseScore -= 20.0; // Stronger penalty for very old content
            
            // ENHANCED ENGAGEMENT SCORING - Multiple engagement types
            if (engagementScore > 0)
            {
                // Logarithmic base engagement
                baseScore += Math.Log(engagementScore + 1) * 6.0; // Increased multiplier
                
                // Engagement rate bonuses
                if (engagementScore >= 20) baseScore += 30.0;  // Viral content
                else if (engagementScore >= 10) baseScore += 20.0; // High engagement
                else if (engagementScore >= 5) baseScore += 12.0;  // Good engagement
                else if (engagementScore >= 2) baseScore += 6.0;   // Moderate engagement
            }
            
            // CONTENT QUALITY SIGNALS - Based on modern algorithm insights
            if (!string.IsNullOrEmpty(content))
            {
                // Content length optimization (sweet spot for social media)
                var contentLength = content.Length;
                if (contentLength >= 50 && contentLength <= 300) baseScore += 8.0;  // Optimal length
                else if (contentLength >= 20 && contentLength <= 500) baseScore += 4.0; // Good length
                else if (contentLength < 10) baseScore -= 5.0; // Too short penalty
                else if (contentLength > 1000) baseScore -= 3.0; // Too long penalty
                
                // Encourage discussion-starting content
                if (content.Contains("?")) baseScore += 3.0; // Question encourages engagement
            }
            
            // MEDIA CONTENT BONUS - Visual content performs better
            if (!string.IsNullOrEmpty(image))
            {
                baseScore += 12.0; // Images get priority (modern algorithm insight)
            }
            
            // ENHANCED FRESH FRIEND CONTENT
            if (isFriend && daysOld <= 2)
            {
                baseScore += 15.0; // Reduced but still significant
            }
            
            // DISCOVERY ALGORITHM - Promote quality non-friend content
            if (!isFriend)
            {
                if (engagementScore >= 8) baseScore += 25.0;      // Excellent discovery content
                else if (engagementScore >= 5) baseScore += 15.0; // Good discovery content  
                else if (engagementScore >= 3) baseScore += 10.0; // Decent discovery content
                else if (engagementScore >= 1) baseScore += 5.0;  // Basic discovery content
            }
            
            // PEAK HOURS BONUS - Content posted during active hours
            var postHour = DateTime.UtcNow.Hour; // You might want to adjust for user timezone
            if ((postHour >= 9 && postHour <= 11) || (postHour >= 18 && postHour <= 21))
            {
                baseScore += 5.0; // Peak engagement time bonus
            }
            
            // RECENCY MOMENTUM - Extra boost for very fresh content
            if (daysOld == 0 && hoursSincePost <= 3)
            {
                baseScore += 8.0; // Catch the wave early
            }
            
            // CONTENT DIVERSITY PROMOTION - Ensure varied feed
            if (!isFriend && engagementScore >= 1)
            {
                baseScore += 6.0; // Promote discovery and variety
            }
            
            return Math.Max(baseScore, 1.0); // Ensure minimum score
        }

        private List<dynamic> ApplyDiverseFeedAlgorithm(List<dynamic> scoredPosts)
        {
            if (scoredPosts.Count <= 1) return scoredPosts;
            
            var result = new List<dynamic>();
            var remaining = new List<dynamic>(scoredPosts);
            
            // ENHANCED DIVERSITY ALGORITHM - Based on modern social media insights
            while (remaining.Count > 0)
            {
                dynamic selectedPost = null;
                
                // Track recent users and content types for better diversity
                var recentUserIds = result.TakeLast(3).Select(p => (int)p.UserId).ToList();
                var recentSharerIds = result.TakeLast(3)
                    .Where(p => (bool)p.IsShared)
                    .Select(p => (int)p.SharedBy.Id)
                    .ToList();
                
                // CONTENT TYPE DIVERSITY - Alternate between media and text
                bool lastPostHadImage = result.Count > 0 && !string.IsNullOrEmpty((string?)result.Last().Image);
                
                // FRIEND/NON-FRIEND BALANCE - Ensure discovery content is mixed in
                var recentFriendPosts = result.TakeLast(4).Count(p => (bool)p.IsFriend);
                bool needNonFriendContent = recentFriendPosts >= 3; // Max 3 consecutive friend posts
                
                // ENGAGEMENT DIVERSITY - Mix high and moderate engagement content
                var recentHighEngagement = result.TakeLast(3).Count(p => (int)p.EngagementScore >= 5);
                bool preferModerateEngagement = recentHighEngagement >= 2;
                
                // SCORING SYSTEM - Find best post considering diversity factors
                var candidatePosts = remaining.OrderByDescending(p => (double)p.FeedScore).ToList();
                
                foreach (var post in candidatePosts)
                {
                    int currentUserId = (int)post.UserId;
                    int currentSharerId = (bool)post.IsShared ? (int)post.SharedBy.Id : -1;
                    bool hasImage = !string.IsNullOrEmpty((string?)post.Image);
                    bool isFriend = (bool)post.IsFriend;
                    int engagement = (int)post.EngagementScore;
                    double score = (double)post.FeedScore;
                    
                    // DIVERSITY CHECKS
                    bool isUserRecent = recentUserIds.Contains(currentUserId);
                    bool isSharerRecent = recentSharerIds.Contains(currentSharerId);
                    bool providesContentDiversity = lastPostHadImage != hasImage;
                    bool providesEngagementDiversity = preferModerateEngagement ? engagement < 5 : true;
                    bool providesRelationshipDiversity = needNonFriendContent ? !isFriend : true;
                    
                    // SCORING ADJUSTMENTS for diversity
                    double diversityScore = score;
                    
                    // Bonus for content type diversity
                    if (providesContentDiversity) diversityScore += 5.0;
                    
                    // Bonus for relationship diversity
                    if (providesRelationshipDiversity) diversityScore += 8.0;
                    
                    // Bonus for engagement diversity
                    if (providesEngagementDiversity) diversityScore += 3.0;
                    
                    // Penalty for recent users (but not complete exclusion)
                    if (isUserRecent) diversityScore -= 15.0;
                    if (isSharerRecent) diversityScore -= 10.0;
                    
                    // SELECT POST if it meets minimum diversity criteria
                    bool isAcceptable = !isUserRecent || diversityScore >= score * 0.7; // Allow same user if score is high enough
                    
                    if (isAcceptable)
                    {
                        selectedPost = post;
                        break;
                    }
                }
                
                // FALLBACK - If no diverse option found, take the highest scoring with penalty protection
                if (selectedPost == null)
                {
                    var topPost = candidatePosts.First();
                    double topScore = (double)topPost.FeedScore;
                    
                    // Look for alternatives within 25% score range that provide some diversity
                    var diverseAlternatives = candidatePosts
                        .Where(p => {
                            int userId = (int)p.UserId;
                            bool notRecentUser = !recentUserIds.Contains(userId);
                            double postScore = (double)p.FeedScore;
                            return notRecentUser && postScore >= topScore * 0.75;
                        })
                        .OrderByDescending(p => (double)p.FeedScore);
                    
                    selectedPost = diverseAlternatives.FirstOrDefault() ?? topPost;
                }
                
                result.Add(selectedPost);
                remaining.Remove(selectedPost);
            }
            
            return result;
        }

        [Authorize]
        [HttpGet("user/{userId}")]
        public IActionResult GetPostsByUserId(int userId)
        {
            try
            {
                var currentUserIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(currentUserIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }

                // Check if the target user exists and is verified
                var targetUser = _context.Users.FirstOrDefault(u => u.Id == userId && u.IsEmailVerified);
                if (targetUser == null)
                {
                    return NotFound("User not found.");
                }

                // Get user's original posts
                var originalPosts = _context.Posts
                    .Include(p => p.User)
                    .Where(p => p.UserId == userId)
                    .Select(p => new {
                        Id = p.Id,
                        Content = p.Content,
                        Image = p.Image,
                        CreatedAt = p.CreatedAt,
                        UserId = p.UserId,
                        User = new {
                            Id = p.User.Id,
                            Name = p.User.Name,
                            Email = p.User.Email,
                            Image = p.User.Image,
                            Bio = p.User.Bio
                        },
                        IsShared = false,
                        SharedBy = (object?)null,
                        SharedAt = (DateTime?)null,
                        OriginalPost = (object?)null
                    })
                    .ToList();

                // Get user's shared posts
                var sharedPosts = _context.SharedPosts
                    .Include(sp => sp.Post)
                        .ThenInclude(p => p.User)
                    .Include(sp => sp.User)
                    .Where(sp => sp.UserId == userId)
                    .Select(sp => new {
                        Id = sp.Id, // Use SharedPost ID for unique identification
                        Content = sp.Post.Content,
                        Image = sp.Post.Image,
                        CreatedAt = sp.SharedAt, // Use share date for sorting
                        UserId = sp.UserId,
                        User = new {
                            Id = sp.User.Id,
                            Name = sp.User.Name,
                            Email = sp.User.Email,
                            Image = sp.User.Image,
                            Bio = sp.User.Bio
                        },
                        IsShared = true,
                        SharedBy = new {
                            Id = sp.User.Id,
                            Name = sp.User.Name,
                            Email = sp.User.Email,
                            Image = sp.User.Image,
                            Bio = sp.User.Bio
                        },
                        SharedAt = sp.SharedAt,
                        OriginalPost = new {
                            Id = sp.Post.Id,
                            User = new {
                                Id = sp.Post.User.Id,
                                Name = sp.Post.User.Name,
                                Email = sp.Post.User.Email,
                                Image = sp.Post.User.Image,
                                Bio = sp.Post.User.Bio
                            },
                            CreatedAt = sp.Post.CreatedAt
                        }
                    })
                    .ToList();

                // Combine and sort by creation/share date
                var allPosts = originalPosts.Cast<dynamic>()
                    .Concat(sharedPosts.Cast<dynamic>())
                    .OrderByDescending(p => p.CreatedAt)
                    .ToList();

                return Ok(new { 
                    allPosts, 
                    posts = originalPosts, 
                    sharedPosts
                });
            }
            catch (System.Exception ex)
            {
                Console.WriteLine($"Error in GetPostsByUserId: {ex.Message}");
                return BadRequest("Error retrieving posts.");
            }
        }

        [Authorize]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> DeletePost(int id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                int userId = int.Parse(userIdClaim);
                
                // Find the post to delete (only owner can delete)
                var post = await _context.Posts
                    .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
                
                if (post == null)
                {
                    return NotFound("Post not found or you don't have permission to delete it.");
                }

                // Get all users who will be affected by LaughScore recalculation
                var affectedUserIds = new HashSet<int> { userId }; // Post owner
                
                // Get users who reacted to this post
                var reactingUserIds = await _context.Reactions
                    .Where(r => r.PostId == id)
                    .Select(r => r.UserId)
                    .Distinct()
                    .ToListAsync();
                    
                // Get users who shared this post 
                var sharingUserIds = await _context.SharedPosts
                    .Where(sp => sp.PostId == id)
                    .Select(sp => sp.UserId)
                    .Distinct()
                    .ToListAsync();
                    
                // Get users who commented on this post
                var commentingUserIds = await _context.Comments
                    .Where(c => c.PostId == id)
                    .Select(c => c.UserId)
                    .Distinct()
                    .ToListAsync();

                // Add all affected users for point recalculation
                foreach (var uid in reactingUserIds) affectedUserIds.Add(uid);
                foreach (var uid in sharingUserIds) affectedUserIds.Add(uid);
                foreach (var uid in commentingUserIds) affectedUserIds.Add(uid);

                // CASCADE DELETE: Remove all related data
                
                // 1. Delete all reactions to this post
                var reactions = await _context.Reactions
                    .Where(r => r.PostId == id)
                    .ToListAsync();
                _context.Reactions.RemoveRange(reactions);
                
                // 2. Delete all comments on this post (including replies)
                var comments = await _context.Comments
                    .Where(c => c.PostId == id)
                    .ToListAsync();
                _context.Comments.RemoveRange(comments);
                
                // 3. Delete all shares of this post
                var sharedPosts = await _context.SharedPosts
                    .Where(sp => sp.PostId == id)
                    .ToListAsync();
                _context.SharedPosts.RemoveRange(sharedPosts);
                
                // 4. Delete notifications related to this post
                var notifications = await _context.Notifications
                    .Where(n => n.PostId == id)
                    .ToListAsync();
                _context.Notifications.RemoveRange(notifications);
                
                // 5. Finally, delete the post itself
                _context.Posts.Remove(post);
                
                // Save all deletions
                await _context.SaveChangesAsync();
                
                // Commit the transaction
                await transaction.CommitAsync();
                
                // RECALCULATE LAUGH SCORES for affected users (async, don't block response)
                _ = Task.Run(async () =>
                {
                    try
                    {
                        foreach (var affectedUserId in affectedUserIds)
                        {
                            var laughScoreService = HttpContext.RequestServices.GetService<ILaughScoreService>();
                            if (laughScoreService != null)
                            {
                                await laughScoreService.UpdateLaughScoreAsync(affectedUserId);
                            }
                        }
                        Console.WriteLine($"LaughScore recalculated for {affectedUserIds.Count} users after post {id} deletion");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error recalculating LaughScores after post deletion: {ex.Message}");
                    }
                });

                return Ok(new { 
                    message = "Post and all related data deleted successfully! Your internet presence just got a little lighter 🗑️✨",
                    deletedItems = new {
                        post = 1,
                        reactions = reactions.Count,
                        comments = comments.Count,
                        shares = sharedPosts.Count,
                        notifications = notifications.Count
                    },
                    affectedUsers = affectedUserIds.Count
                });
            }
            catch (System.Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"Error deleting post: {ex.Message}");
                return BadRequest(new { 
                    error = "Failed to delete post", 
                    message = "Something went wrong while deleting your post. Even the delete button is having trust issues 🤔" 
                });
            }
        }

        [Authorize]
        [HttpPut("edit/{id}")]
        public async Task<IActionResult> EditPost(int id, [FromBody] PostDto postDto)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                int userId = int.Parse(userIdClaim);
                
                // Find the post to edit (only owner can edit)
                var post = await _context.Posts
                    .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
                
                if (post == null)
                {
                    return NotFound("Post not found or you don't have permission to edit it.");
                }

                // Perform meme detection on the updated content (same validation as create)
                if (!string.IsNullOrWhiteSpace(postDto.Content) || !string.IsNullOrWhiteSpace(postDto.Image))
                {
                    var memeDetectionRequest = new MemeDetectionRequest
                    {
                        Text = postDto.Content,
                        ImageUrl = postDto.Image,
                        IncludeSentiment = true,
                        IncludeHumorScore = true,
                        IncludeMemeReferences = true,
                        IncludeCulturalContext = true
                    };

                    // Determine analysis mode based on available data
                    if (!string.IsNullOrEmpty(memeDetectionRequest.Text) && !string.IsNullOrEmpty(memeDetectionRequest.ImageUrl))
                    {
                        memeDetectionRequest.DetectionMode = "combined";
                    }
                    else if (!string.IsNullOrEmpty(memeDetectionRequest.ImageUrl))
                    {
                        memeDetectionRequest.DetectionMode = "image";
                    }
                    else if (!string.IsNullOrEmpty(memeDetectionRequest.Text))
                    {
                        memeDetectionRequest.DetectionMode = "text";
                    }

                    // Use the unified analysis method
                    var memeDetectionResult = await _memeDetectionService.AnalyzeAsync(memeDetectionRequest);
                    
                    if (!memeDetectionResult.Success)
                    {
                        return BadRequest(new { 
                            error = "Meme detection failed", 
                            details = memeDetectionResult.Error,
                            message = "The meme detector had a meltdown! Try again? 🤖💥"
                        });
                    }

                    // If it's NOT detected as a meme, block the edit
                    if (memeDetectionResult.Result?.IsMeme != true)
                    {
                        return BadRequest(new { 
                            error = "Non-meme content detected", 
                            message = "Nice try, but that's not meme content! Keep it spicy and meme-worthy 🌶️",
                            memeAnalysis = memeDetectionResult.Result,
                            analysisMode = memeDetectionResult.Result?.DetectionMode ?? "unknown"
                        });
                    }
                }
                else
                {
                    return BadRequest(new { 
                        error = "No content provided", 
                        message = "Your meme can't be invisible! Add some content to edit 👻"
                    });
                }

                // Update the post
                post.Content = postDto.Content;
                post.Image = postDto.Image;
                // Note: We don't update CreatedAt as it should remain the original creation time

                await _context.SaveChangesAsync();

                return Ok(new { 
                    message = "Meme successfully upgraded to premium edition! ✨",
                    post = new {
                        Id = post.Id,
                        Content = post.Content,
                        Image = post.Image,
                        CreatedAt = post.CreatedAt,
                        UserId = post.UserId
                    }
                });
            }
            catch (System.Exception ex)
            {
                Console.WriteLine($"Error editing post: {ex.Message}");
                return BadRequest(new { 
                    error = "Failed to edit post", 
                    message = "Edit failed! Your meme is playing hard to get 😅" 
                });
            }
        }
    }
}