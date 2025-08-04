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
    public class PostController : ControllerBase
    {
        private readonly MemeStreamDbContext _context;
        public PostController(MemeStreamDbContext context)
        {
            this._context = context;
        }
        [Authorize]
        [HttpPost("create")]
        public IActionResult CreatePost(Post post)
        {
            try
            {
                _context.Posts.Add(post);
                _context.SaveChanges();
                return Ok(post);
            }
            catch (Exception ex)
            {
                return BadRequest("Error creating post.");
            }

        }
        [HttpGet("get/{id}")]
        public IActionResult GetPost(int id)
        {
            try
            {
                var post = _context.Posts.FirstOrDefault(p => p.Id == id);
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