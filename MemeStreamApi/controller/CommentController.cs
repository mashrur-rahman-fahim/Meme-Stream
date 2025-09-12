using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Security.Claims;
using MemeStreamApi.data;
using MemeStreamApi.model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MemeStreamApi.controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommentController:ControllerBase
    {
        private readonly MemeStreamDbContext _context;
        public CommentController(MemeStreamDbContext context)
        {
            this._context = context;
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
        public IActionResult CreateComment([FromBody] CommentDto commentDto){
            try{
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var userId = int.Parse(userIdClaim);
                var comment = new Comment{
                    PostId = commentDto.PostId,
                    UserId = userId,
                    Content = commentDto.Content,
                    ParentCommentId = commentDto.ParentCommentId
                };
                _context.Comments.Add(comment);
                _context.SaveChanges();
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
                var comment = _context.Comments.FirstOrDefault(c => c.Id == id && c.UserId == userId);
                if (comment == null)
                {
                    return NotFound("Comment not found.");
                }
                _context.Comments.Remove(comment);
                _context.SaveChanges();
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
        public IActionResult CreateReply([FromBody] ReplyDto replyDto)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var userId = int.Parse(userIdClaim);

                // Get the parent comment to get the PostId
                var parentComment = _context.Comments.FirstOrDefault(c => c.Id == replyDto.CommentId);
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