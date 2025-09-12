using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Security.Claims;
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
    public class CommentController:ControllerBase
    {
        private readonly MemeStreamDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ILaughScoreService _laughScoreService;
        
        public CommentController(MemeStreamDbContext context,
            INotificationService notificationService,
            IHubContext<NotificationHub> hubContext,
            ILaughScoreService laughScoreService)
        {
            this._context = context;
            this._notificationService = notificationService;
            this._hubContext = hubContext;
            this._laughScoreService = laughScoreService;
        }
        
        public class CommentDto
        {
            public int PostId { get; set; }
            public string Content { get; set; } = string.Empty;
            public int? ParentCommentId { get; set; } // For replies
        }

        public class ReplyDto
        {
            public int CommentId { get; set; }
            public string Content { get; set; } = string.Empty;
        }
        [Authorize]
        [HttpPost("create")]
        public async Task<IActionResult> CreateComment([FromBody] CommentDto commentDto){
            try{
                var userId = User.GetUserId();
                
                // Get the post to access post author info
                var post = await _context.Posts
                    .Include(p => p.User)
                    .FirstOrDefaultAsync(p => p.Id == commentDto.PostId);
                    
                if (post == null)
                {
                    return NotFound("Post not found.");
                }
                
                var comment = new Comment{
                    PostId = commentDto.PostId,
                    UserId = userId,
                    Content = commentDto.Content,
                    ParentCommentId = commentDto.ParentCommentId
                };
                _context.Comments.Add(comment);
                _context.SaveChanges();
                
                // Update LaughScore for post owner
                _ = Task.Run(async () => await _laughScoreService.UpdateLaughScoreAsync(post.UserId));
                
                // Create notification for post owner (don't notify self)
                if (post.UserId != userId)
                {
                    var commenterUser = await _context.Users.FindAsync(userId);
                    var notification = await _notificationService.CreateNotificationAsync(
                        post.UserId,
                        "comment",
                        $"{commenterUser?.Name ?? "Someone"} commented on your post",
                        "New Comment",
                        userId,
                        commentDto.PostId,
                        comment.Id,
                        $"/posts/{commentDto.PostId}"
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
                            relatedUser = new { id = userId, name = commenterUser?.Name, image = commenterUser?.Image },
                            actionUrl = notification.ActionUrl
                        });
                    }
                }
                
                return Ok(comment);
            }
            catch (Exception ex){
                Console.WriteLine($"Error in CreateComment: {ex.Message}");
                return BadRequest("Error creating comment.");
            }
        }
        [Authorize]
        [HttpDelete("delete/{id}")]
        public IActionResult DeleteComment(int id){
            try{
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var userId = int.Parse(userIdClaim);
                var comment = _context.Comments
                    .Include(c => c.Post)
                    .FirstOrDefault(c => c.Id == id && c.UserId == userId);
                if (comment == null)
                {
                    return NotFound("Comment not found.");
                }
                
                var postOwnerId = comment.Post.UserId;
                _context.Comments.Remove(comment);
                _context.SaveChanges();
                
                // Update LaughScore for post owner
                _ = Task.Run(async () => await _laughScoreService.UpdateLaughScoreAsync(postOwnerId));
                
                return Ok("Comment deleted successfully.");
            }
            catch (Exception ex){
                Console.WriteLine($"Error in DeleteComment: {ex.Message}");
                return BadRequest("Error deleting comment.");
            }
        }
        [Authorize]
        [HttpGet("get/{postId}")]
        public IActionResult GetCommentsByPostId(int postId){
            try{
                // Get all comments for the post including replies
                var allComments = _context.Comments
                    .Include(c => c.User)
                    .Where(c => c.PostId == postId)
                    .OrderBy(c => c.CreatedAt)
                    .ToList();

                // Group comments: main comments and replies
                var mainComments = allComments.Where(c => c.ParentCommentId == null).ToList();
                var replies = allComments.Where(c => c.ParentCommentId != null).ToList();

                // Build hierarchical structure
                var result = mainComments.Select(comment => new {
                    Id = comment.Id,
                    PostId = comment.PostId,
                    UserId = comment.UserId,
                    Content = comment.Content,
                    CreatedAt = comment.CreatedAt,
                    ParentCommentId = comment.ParentCommentId,
                    User = new {
                        Id = comment.User.Id,
                        Name = comment.User.Name,
                        Image = comment.User.Image
                    },
                    Replies = replies.Where(r => r.ParentCommentId == comment.Id)
                        .OrderBy(r => r.CreatedAt)
                        .Select(reply => new {
                            Id = reply.Id,
                            PostId = reply.PostId,
                            UserId = reply.UserId,
                            Content = reply.Content,
                            CreatedAt = reply.CreatedAt,
                            ParentCommentId = reply.ParentCommentId,
                            User = new {
                                Id = reply.User.Id,
                                Name = reply.User.Name,
                                Image = reply.User.Image
                            }
                        }).ToList()
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex){
                Console.WriteLine($"Error in GetCommentsByPostId: {ex.Message}");
                return BadRequest("Error retrieving comments.");
            }
        }
        [Authorize]
        [HttpPut("update/{id}")]
        public IActionResult UpdateComment(int id, [FromBody] CommentDto commentDto){
            try{
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var userId = int.Parse(userIdClaim);
                var comment = _context.Comments.FirstOrDefault(c => c.Id == id && c.UserId == userId);
                if (comment == null)
                {
                    return NotFound("Comment not found.");
                }
                comment.Content = commentDto.Content;
                _context.SaveChanges();
                return Ok(comment);
            }
            catch (Exception ex){
                Console.WriteLine($"Error in UpdateComment: {ex.Message}");
                return BadRequest("Error updating comment.");
            }
        }

        [Authorize]
        [HttpPost("reply")]
        public async Task<IActionResult> CreateReply([FromBody] ReplyDto replyDto)
        {
            try
            {
                var userId = User.GetUserId();

                // Get the parent comment to get the PostId and user info
                var parentComment = await _context.Comments
                    .Include(c => c.User)
                    .Include(c => c.Post)
                        .ThenInclude(p => p.User)
                    .FirstOrDefaultAsync(c => c.Id == replyDto.CommentId);
                    
                if (parentComment == null)
                {
                    return NotFound("Parent comment not found.");
                }

                var reply = new Comment
                {
                    PostId = parentComment.PostId,
                    UserId = userId,
                    Content = replyDto.Content,
                    ParentCommentId = replyDto.CommentId
                };

                _context.Comments.Add(reply);
                _context.SaveChanges();

                // Create notifications
                var replyingUser = await _context.Users.FindAsync(userId);
                
                // Notify parent comment author (if not self)
                if (parentComment.UserId != userId)
                {
                    var notification = await _notificationService.CreateNotificationAsync(
                        parentComment.UserId,
                        "comment",
                        $"{replyingUser?.Name ?? "Someone"} replied to your comment",
                        "New Reply",
                        userId,
                        parentComment.PostId,
                        reply.Id,
                        $"/posts/{parentComment.PostId}"
                    );
                    
                    if (notification != null)
                    {
                        await NotificationHub.SendNotificationToUser(_hubContext, parentComment.UserId, new {
                            id = notification.Id,
                            type = notification.Type,
                            message = notification.Message,
                            title = notification.Title,
                            createdAt = notification.CreatedAt,
                            relatedUser = new { id = userId, name = replyingUser?.Name, image = replyingUser?.Image },
                            actionUrl = notification.ActionUrl
                        });
                    }
                }
                
                // Also notify post author if different from comment author and replying user
                if (parentComment.Post?.UserId != userId && parentComment.Post?.UserId != parentComment.UserId)
                {
                    var notification = await _notificationService.CreateNotificationAsync(
                        parentComment.Post.UserId,
                        "comment",
                        $"{replyingUser?.Name ?? "Someone"} replied to a comment on your post",
                        "New Reply on Post",
                        userId,
                        parentComment.PostId,
                        reply.Id,
                        $"/posts/{parentComment.PostId}"
                    );
                    
                    if (notification != null)
                    {
                        await NotificationHub.SendNotificationToUser(_hubContext, parentComment.Post.UserId, new {
                            id = notification.Id,
                            type = notification.Type,
                            message = notification.Message,
                            title = notification.Title,
                            createdAt = notification.CreatedAt,
                            relatedUser = new { id = userId, name = replyingUser?.Name, image = replyingUser?.Image },
                            actionUrl = notification.ActionUrl
                        });
                    }
                }

                // Return the reply with user info
                var replyWithUser = _context.Comments
                    .Include(c => c.User)
                    .Where(c => c.Id == reply.Id)
                    .Select(c => new {
                        Id = c.Id,
                        PostId = c.PostId,
                        UserId = c.UserId,
                        Content = c.Content,
                        CreatedAt = c.CreatedAt,
                        ParentCommentId = c.ParentCommentId,
                        User = new {
                            Id = c.User.Id,
                            Name = c.User.Name,
                            Image = c.User.Image
                        }
                    })
                    .FirstOrDefault();

                return Ok(replyWithUser);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateReply: {ex.Message}");
                return BadRequest("Error creating reply.");
            }
        }
    }
}