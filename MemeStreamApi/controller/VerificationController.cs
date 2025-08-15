using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MemeStreamApi.data;
using MemeStreamApi.model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MemeStreamApi.controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class VerificationController:ControllerBase
    {
        private readonly MemeStreamDbContext _context;
        public VerificationController(MemeStreamDbContext context)
        {
            this._context = context;
        }
        [Authorize]
        [HttpGet("verify")]
        public IActionResult Verify()
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var userId = int.Parse(userIdClaim);
                var user = _context.Users.Find(userId);
                if (user == null)
                {
                    return NotFound("User not found.");
                }
                return Ok("user verified successfully");
            }
            catch (Exception ex)
            {
                
                return BadRequest("Error verifying user.");
            }
        }
    }
}