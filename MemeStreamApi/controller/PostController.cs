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
                var posts = _context.Posts.Where(p => p.UserId == userId).ToList();
                var sharedPosts = _context.SharedPosts
                    .Where(sp => sp.UserId == userId)
                    .Select(sp => sp.Post)
                    .ToList();

                var allPosts = posts.Concat(sharedPosts).ToList();

                return Ok(new { allPosts, posts, sharedPosts });
            }
            catch (System.Exception)
            {
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