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

                // Perform meme detection on the content
                if (!string.IsNullOrWhiteSpace(postDto.Content))
                {
                    var memeDetectionRequest = new MemeDetectionRequest
                    {
                        Text = postDto.Content,
                        IncludeSentiment = true,
                        IncludeHumorScore = true,
                        IncludeMemeReferences = true,
                        IncludeCulturalContext = true
                    };

                    var memeDetectionResult = await _memeDetectionService.AnalyzeTextAsync(memeDetectionRequest);
                    
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
                            memeAnalysis = memeDetectionResult.Result
                        });
                    }
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
                if (string.IsNullOrWhiteSpace(postDto.Content))
                {
                    return Ok(new { 
                        isMeme = false, 
                        message = "No content to analyze - only memes are allowed!",
                        canPost = false // Can't post without content, and content must be meme
                    });
                }

                var memeDetectionRequest = new MemeDetectionRequest
                {
                    Text = postDto.Content,
                    IncludeSentiment = true,
                    IncludeHumorScore = true,
                    IncludeMemeReferences = true,
                    IncludeCulturalContext = true
                };

                var memeDetectionResult = await _memeDetectionService.AnalyzeTextAsync(memeDetectionRequest);
                
                if (!memeDetectionResult.Success)
                {
                    return BadRequest(new { 
                        error = "Meme detection failed", 
                        details = memeDetectionResult.Error 
                    });
                }

                var isMeme = memeDetectionResult.Result?.IsMeme == true;
                return Ok(new { 
                    isMeme = isMeme,
                    canPost = isMeme, // Can only post if it IS a meme
                    message = isMeme ? "Great! This is meme content and can be posted." : "This content is not a meme and cannot be posted. Only memes are allowed!",
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
                    .Where(sp => sp.UserId != userId) // Exclude user's own shares from feed
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
                var feedPosts = allFeedItems
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
            
            // Time decay - newer posts are preferred
            if (daysOld == 0) baseScore += 30.0; // Today
            else if (daysOld == 1) baseScore += 25.0; // Yesterday
            else if (daysOld <= 3) baseScore += 20.0; // Last 3 days
            else if (daysOld <= 7) baseScore += 15.0; // Last week
            else if (daysOld <= 14) baseScore += 10.0; // Last 2 weeks
            else if (daysOld <= 30) baseScore += 5.0; // Last month
            else baseScore -= 10.0; // Very old posts get penalty
            
            // Engagement bonus
            baseScore += engagementScore * 2.0;
            
            // Special case: Fresh friend posts (within 3 days) get extra boost
            if (isFriend && daysOld <= 3)
            {
                baseScore += 20.0;
            }
            
            // Special case: High engagement non-friend posts can compete with old friend posts
            if (!isFriend && engagementScore >= 5)
            {
                baseScore += 15.0;
            }
            
            return baseScore;
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
        public IActionResult DeletePost(int id)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                int userId = int.Parse(userIdClaim);
                var post = _context.Posts.FirstOrDefault(p => p.Id == id && p.UserId == userId);
                var sharedPost = _context.SharedPosts.FirstOrDefault(sp => sp.PostId == id && sp.UserId == userId);
                if (sharedPost != null)
                {
                    _context.SharedPosts.Remove(sharedPost);
                }
                if (post != null)
                {
                    _context.Posts.Remove(post);
                }
                _context.SaveChanges();
                return Ok("Post deleted successfully.");
            }
            catch (System.Exception)
            {
                return BadRequest("Error deleting post.");
            }
        }
    }
}