using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using MemeStreamApi.data;
using MemeStreamApi.model;
using MemeStreamApi.services;
using MemeStreamApi.hubs;
using MemeStreamApi.extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace MemeStreamApi.controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class SharedPostController : ControllerBase
    {
        private readonly MemeStreamDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ILaughScoreService _laughScoreService;
        
        public SharedPostController(MemeStreamDbContext context,
            INotificationService notificationService,
            IHubContext<NotificationHub> hubContext,
            ILaughScoreService laughScoreService)
        {
            this._context = context;
            this._notificationService = notificationService;
            this._hubContext = hubContext;
            this._laughScoreService = laughScoreService;
        }
        
        public class SharePostDto
        {
            public int PostId { get; set; }
        }
        
        [Authorize]
        [HttpPost("share")]
        public async Task<IActionResult> SharePost([FromBody] SharePostDto shareDto)
        {
            try
            {
                // Validate shareDto
                if (shareDto == null)
                {
                    return BadRequest("Invalid request data.");
                }
                
                if (shareDto.PostId <= 0)
                {
                    return BadRequest("Invalid post ID.");
                }
                
                int userId;
                try
                {
                    userId = User.GetUserId();
                }
                catch (InvalidOperationException ex)
                {
                    Console.WriteLine($"Error getting user ID: {ex.Message}");
                    return Unauthorized("Invalid authentication token.");
                }
                
                // Check if post exists and get post author info
                var post = await _context.Posts
                    .Include(p => p.User)
                    .FirstOrDefaultAsync(p => p.Id == shareDto.PostId);
                    
                if (post == null)
                {
                    return NotFound("Post not found.");
                }
                
                // Check if user is trying to share their own post
                if (post.UserId == userId)
                {
                    return BadRequest("You cannot share your own post.");
                }
                
                // Check if user already shared this post
                var existingShare = await _context.SharedPosts
                    .FirstOrDefaultAsync(sp => sp.PostId == shareDto.PostId && sp.UserId == userId);
                
                if (existingShare != null)
                {
                    return BadRequest("You have already shared this post.");
                }
                
                // Create new shared post entry
                var sharedPost = new SharedPosts
                {
                    PostId = shareDto.PostId,
                    UserId = userId,
                    SharedAt = DateTime.UtcNow
                };
                
                _context.SharedPosts.Add(sharedPost);
                await _context.SaveChangesAsync();
                
                // Update LaughScore for post owner
                _ = Task.Run(async () => await _laughScoreService.UpdateLaughScoreAsync(post.UserId));
                
                // Create notification for post owner (don't notify self)
                if (post.UserId != userId)
                {
                    var sharerUser = await _context.Users.FindAsync(userId);
                    var notification = await _notificationService.CreateNotificationAsync(
                        post.UserId,
                        "share",
                        $"{sharerUser?.Name ?? "Someone"} shared your post",
                        "Post Shared",
                        userId,
                        shareDto.PostId,
                        null,
                        $"/posts/{shareDto.PostId}"
                    );
                    
                    // Send real-time notification
                    if (notification != null)
                    {
                        await NotificationHub.SendNotificationToUser(_hubContext, post.UserId, new {
                            id = notification.Id,
                            type = notification.Type,
                            message = notification.Message,
                            title = notification.Title,
                            createdAt = notification.CreatedAt,
                            relatedUser = new { id = userId, name = sharerUser?.Name, image = sharerUser?.Image },
                            actionUrl = notification.ActionUrl
                        }, _notificationService);
                    }
                }
                
                return Ok(new { message = "Post shared successfully", sharedPost });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SharePost: {ex.Message}");
                return BadRequest("Error sharing post.");
            }
        }
        
        [Authorize]
        [HttpGet("user-shares")]
        public async Task<IActionResult> GetUserSharedPosts()
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                
                int userId = int.Parse(userIdClaim);
                
                var sharedPosts = await _context.SharedPosts
                    .Include(sp => sp.Post)
                        .ThenInclude(p => p.User)
                    .Include(sp => sp.User)
                    .Where(sp => sp.UserId == userId)
                    .OrderByDescending(sp => sp.SharedAt)
                    .Select(sp => new
                    {
                        Id = sp.Id,
                        SharedAt = sp.SharedAt,
                        SharedBy = new
                        {
                            Id = sp.User.Id,
                            Name = sp.User.Name,
                            Image = sp.User.Image
                        },
                        OriginalPost = new
                        {
                            Id = sp.Post.Id,
                            Content = sp.Post.Content,
                            Image = sp.Post.Image,
                            CreatedAt = sp.Post.CreatedAt,
                            User = new
                            {
                                Id = sp.Post.User.Id,
                                Name = sp.Post.User.Name,
                                Image = sp.Post.User.Image
                            }
                        }
                    })
                    .ToListAsync();
                
                return Ok(sharedPosts);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetUserSharedPosts: {ex.Message}");
                return BadRequest("Error retrieving shared posts.");
            }
        }
        
        [Authorize]
        [HttpDelete("unshare/{postId}")]
        public async Task<IActionResult> UnsharePost(int postId)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                
                int userId = int.Parse(userIdClaim);
                
                var sharedPost = await _context.SharedPosts
                    .FirstOrDefaultAsync(sp => sp.PostId == postId && sp.UserId == userId);
                
                if (sharedPost == null)
                {
                    return NotFound("Shared post not found.");
                }
                
                _context.SharedPosts.Remove(sharedPost);
                await _context.SaveChangesAsync();
                
                return Ok(new { message = "Post unshared successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UnsharePost: {ex.Message}");
                return BadRequest("Error unsharing post.");
            }
        }
    }
}
