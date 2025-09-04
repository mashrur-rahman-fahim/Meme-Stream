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
                    Content = commentDto.Content
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
                var comments = _context.Comments
                    .Include(c => c.User)
                    .Where(c => c.PostId == postId)
                    .OrderBy(c => c.CreatedAt)
                    .Select(c => new {
                        Id = c.Id,
                        PostId = c.PostId,
                        UserId = c.UserId,
                        Content = c.Content,
                        CreatedAt = c.CreatedAt,
                        User = new {
                            Id = c.User.Id,
                            Name = c.User.Name,
                            Image = c.User.Image
                        }
                    })
                    .ToList();
                return Ok(comments);
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
    }
}