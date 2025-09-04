using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using MemeStreamApi.data;
using MemeStreamApi.model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;



namespace MemeStreamApi.controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReactionController:ControllerBase
    {
        private readonly MemeStreamDbContext _context;
        public ReactionController(MemeStreamDbContext context)
        {
            this._context = context;
        }
        public class ReactionDto
        {
            public int PostId { get; set; }
            public Reaction.ReactionType Type { get; set; } = Reaction.ReactionType.Laugh;
        }
        [Authorize]
        [HttpPost("create")]
        public IActionResult CreateReaction([FromBody] ReactionDto reactionDto){
           try{
            var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
            {
                return Unauthorized("User ID claim not found.");
            }
            var userId = int.Parse(userIdClaim);
            
            // Check if user already has this reaction on this post
            var existingReaction = _context.Reactions
                .FirstOrDefault(r => r.PostId == reactionDto.PostId && r.UserId == userId && r.Type == reactionDto.Type);
            
            if (existingReaction != null)
            {
                // Remove the existing reaction (toggle behavior)
                _context.Reactions.Remove(existingReaction);
                _context.SaveChanges();
                return Ok(new { message = "Reaction removed", removed = true });
            }
            
            // Remove any other reactions from this user on this post (user can only have one reaction type per post)
            var otherReactions = _context.Reactions
                .Where(r => r.PostId == reactionDto.PostId && r.UserId == userId)
                .ToList();
            
            if (otherReactions.Any())
            {
                _context.Reactions.RemoveRange(otherReactions);
            }
            
            var reaction = new Reaction{
                PostId = reactionDto.PostId,
                UserId = userId,
                Type = reactionDto.Type
            };
            _context.Reactions.Add(reaction);
            _context.SaveChanges();
            return Ok(new { reaction, message = "Reaction added", removed = false });
           }
           catch (Exception ex){
            Console.WriteLine($"Error in CreateReaction: {ex.Message}");
            return BadRequest("Error creating reaction.");
           }
           
        }
        [Authorize]
        [HttpDelete("delete/{id}")]
        public IActionResult DeleteReaction(int id){
            try{
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var userId = int.Parse(userIdClaim);
                var reaction = _context.Reactions.FirstOrDefault(r => r.Id == id && r.UserId == userId);
                if (reaction == null)
                {
                    return NotFound("Reaction not found.");
                }
                _context.Reactions.Remove(reaction);
                _context.SaveChanges();
                return Ok("Reaction deleted successfully.");
            }
            catch (Exception ex){
                Console.WriteLine($"Error in DeleteReaction: {ex.Message}");
                return BadRequest("Error deleting reaction.");
            }
        }
        [Authorize]
        [HttpGet("get/{postId}")]
        public IActionResult GetReactionsByPostId(int postId){
            try{
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                var userId = string.IsNullOrEmpty(userIdClaim) ? (int?)null : int.Parse(userIdClaim);
                
                var reactions = _context.Reactions
                    .Include(r => r.User)
                    .Where(r => r.PostId == postId)
                    .Select(r => new {
                        Id = r.Id,
                        PostId = r.PostId,
                        UserId = r.UserId,
                        Type = r.Type,
                        CreatedAt = r.CreatedAt,
                        User = new {
                            Id = r.User.Id,
                            Name = r.User.Name,
                            Image = r.User.Image
                        }
                    })
                    .ToList();
                
                // Get current user's reaction if exists
                var userReaction = userId.HasValue ? 
                    _context.Reactions.FirstOrDefault(r => r.PostId == postId && r.UserId == userId.Value) : null;
                
                return Ok(new {
                    reactions = reactions,
                    userReaction = userReaction != null ? new {
                        Id = userReaction.Id,
                        Type = userReaction.Type
                    } : null
                });
            }
            catch (Exception ex){
                Console.WriteLine($"Error in GetReactionsByPostId: {ex.Message}");
                return BadRequest("Error retrieving reactions.");
            }
        }
        
        [Authorize]
        [HttpPut("update/{id}")]
        public IActionResult UpdateReaction(int id, [FromBody] ReactionDto reactionDto){
            try{
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var userId = int.Parse(userIdClaim);
                var reaction = _context.Reactions.FirstOrDefault(r => r.Id == id && r.UserId == userId);
                if (reaction == null)
                {
                    return NotFound("Reaction not found.");
                }
                reaction.Type = reactionDto.Type;
                _context.SaveChanges();
                return Ok(reaction);
            }
            catch (Exception ex){
                Console.WriteLine($"Error in UpdateReaction: {ex.Message}");
                return BadRequest("Error updating reaction.");
            }
        }
    }
}