using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Security.Claims;
using MemeStreamApi.data;
using MemeStreamApi.model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MemeStreamApi.controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommentController
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
    }
}