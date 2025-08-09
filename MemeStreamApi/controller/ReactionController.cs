using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using MemeStreamApi.data;
using MemeStreamApi.model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;


namespace MemeStreamApi.controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReactionController
    {
        private readonly MemeStreamDbContext _context;
        public ReactionController(MemeStreamDbContext context)
        {
            this._context = context;
        }
        public class ReactionDto
        {
            public int PostId { get; set; }
            public string Type { get; set; } = string.Empty;
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
            var reaction = new Reaction{
                PostId = reactionDto.PostId,
                UserId = userId,
                Type = reactionDto.Type
            };
            _context.Reactions.Add(reaction);
            _context.SaveChanges();
            return Ok(reaction);
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
                var reactions = _context.Reactions.Where(r => r.PostId == postId).ToList();
                return Ok(reactions);
            }
            catch (Exception ex){
                Console.WriteLine($"Error in GetReactionsByPostId: {ex.Message}");
                return BadRequest("Error retrieving reactions.");
            }
        }
        
        [Authorize]
        [HttpPut("update/{id}")]
        public class IActionResult UpdateReaction(int id, [FromBody] ReactionDto reactionDto){
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