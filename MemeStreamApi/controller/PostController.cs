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
        public IActionResult GetFeed(int page = 1, int pageSize = 20)
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
                        SharedAt = (DateTime?)null
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
                        SharedAt = sp.SharedAt
                    })
                    .ToList();
                
                // Combine regular posts and shared posts
                var allFeedItems = regularPosts.Cast<dynamic>().Concat(sharedPosts.Cast<dynamic>()).ToList();
                
                // Calculate feed score using complex algorithm
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
                        FeedScore = CalculateFeedScore((bool)p.IsFriend, (int)p.DaysOld, (int)p.EngagementScore)
                    })
                    .OrderByDescending(p => p.FeedScore)
                    .ThenByDescending(p => p.CreatedAt)
                    .ToList();
                
                // Apply diverse feed algorithm to prevent consecutive posts from same user
                var diverseFeedPosts = ApplyDiverseFeedAlgorithm(scoredPosts.Cast<dynamic>().ToList());
                
                // Apply pagination after diversification
                var feedPosts = diverseFeedPosts
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList();
                
                return Ok(new { posts = feedPosts, page, pageSize });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetFeed: {ex.Message}");
                return BadRequest("Error retrieving feed.");
            }
        }

        private double CalculateFeedScore(bool isFriend, int daysOld, int engagementScore)
        {
            double baseScore = 10.0;
            
            // Friend bonus - friends get significantly higher priority
            if (isFriend)
            {
                baseScore += 50.0;
            }
            
            // Time decay - newer posts are preferred with exponential decay
            if (daysOld == 0) baseScore += 35.0; // Today - increased from 30
            else if (daysOld == 1) baseScore += 28.0; // Yesterday - increased from 25
            else if (daysOld <= 3) baseScore += 22.0; // Last 3 days - increased from 20
            else if (daysOld <= 7) baseScore += 16.0; // Last week - increased from 15
            else if (daysOld <= 14) baseScore += 10.0; // Last 2 weeks
            else if (daysOld <= 30) baseScore += 3.0; // Last month - decreased from 5
            else baseScore -= 15.0; // Very old posts get bigger penalty
            
            // Enhanced engagement scoring with diminishing returns
            if (engagementScore > 0)
            {
                // Use logarithmic scaling to prevent extremely popular posts from dominating
                baseScore += Math.Log(engagementScore + 1) * 5.0; // More balanced than linear 2.0
            }
            
            // Special case: Fresh friend posts (within 3 days) get extra boost
            if (isFriend && daysOld <= 3)
            {
                baseScore += 25.0; // Increased from 20
            }
            
            // Special case: High engagement non-friend posts can compete with old friend posts
            if (!isFriend && engagementScore >= 5)
            {
                baseScore += 18.0; // Increased from 15
            }
            
            // Viral content bonus - posts with exceptional engagement get extra boost
            if (engagementScore >= 10)
            {
                baseScore += 25.0;
            }
            
            // Content freshness bonus for very recent posts (within 6 hours)
            if (daysOld == 0)
            {
                baseScore += 10.0; // Extra boost for very fresh content
            }
            
            // Diversity bonus for non-friend content to ensure feed variety
            if (!isFriend && engagementScore >= 2)
            {
                baseScore += 8.0; // Small boost to promote discovery
            }
            
            return baseScore;
        }

        private List<dynamic> ApplyDiverseFeedAlgorithm(List<dynamic> scoredPosts)
        {
            if (scoredPosts.Count <= 1) return scoredPosts;
            
            var result = new List<dynamic>();
            var remaining = new List<dynamic>(scoredPosts);
            
            // Algorithm: Smart interleaving to prevent consecutive posts from same user
            while (remaining.Count > 0)
            {
                dynamic selectedPost = null;
                int lastUserId = result.Count > 0 ? (int)result.Last().UserId : -1;
                int lastSharedById = result.Count > 0 && (bool)result.Last().IsShared ? 
                    (int)result.Last().SharedBy.Id : -1;
                
                // Find the highest-scored post that's NOT from the last user (or sharer)
                foreach (var post in remaining.OrderByDescending(p => (double)p.FeedScore))
                {
                    int currentUserId = (int)post.UserId;
                    int currentSharedById = (bool)post.IsShared ? (int)post.SharedBy.Id : -1;
                    
                    // Check if this post is from a different user than the last post
                    bool differentFromLastUser = currentUserId != lastUserId;
                    bool differentFromLastSharer = currentSharedById != lastSharedById;
                    
                    // Prefer posts from different users, but allow same user if significant score gap
                    if (differentFromLastUser && differentFromLastSharer)
                    {
                        selectedPost = post;
                        break;
                    }
                }
                
                // If no different user found, or if we're at the start, take the highest scoring
                if (selectedPost == null)
                {
                    // If we couldn't find a different user, check if the score gap is significant enough
                    var topPost = remaining.OrderByDescending(p => (double)p.FeedScore).First();
                    double topScore = (double)topPost.FeedScore;
                    
                    // Look for posts from different users within 20% score range
                    var alternativePosts = remaining
                        .Where(p => {
                            int currentUserId = (int)p.UserId;
                            int currentSharedById = (bool)p.IsShared ? (int)p.SharedBy.Id : -1;
                            bool differentFromLastUser = currentUserId != lastUserId;
                            bool differentFromLastSharer = currentSharedById != lastSharedById;
                            return (differentFromLastUser && differentFromLastSharer) && 
                                   ((double)p.FeedScore >= topScore * 0.8);
                        })
                        .OrderByDescending(p => (double)p.FeedScore);
                    
                    selectedPost = alternativePosts.FirstOrDefault() ?? topPost;
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