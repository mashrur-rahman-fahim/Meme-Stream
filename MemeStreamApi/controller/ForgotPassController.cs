using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BCrypt.Net;
using DotNetEnv;
using MemeStreamApi.data;
using MemeStreamApi.model;
using MemeStreamApi.services;
using Microsoft.AspNetCore.Mvc;

namespace MemeStreamApi.controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class ForgotPassController : ControllerBase
    {
        private readonly IEmailService _emailService;
        private readonly MemeStreamDbContext _context;
        public ForgotPassController(IEmailService emailService, MemeStreamDbContext context)
        {
            _emailService = emailService;
            _context = context;
        }
        [HttpPost("send-reset")]
        public async Task<IActionResult> SendResetPasswordEmail([FromBody] ResetPasswordEmailRequest request)
        {
            try
            {
                var user = _context.Users.FirstOrDefault(u => u.Email == request.To);
                if (user == null)
                {
                    return BadRequest("User not found");
                }

                var token = Guid.NewGuid().ToString();
                user.ResetPasswordToken = token;
                user.ResetPasswordTokenExpiresAt = DateTime.UtcNow.AddMinutes(10);
                _context.SaveChanges();
                await _emailService.SendPasswordResetEmailAsync(request.To, token);
                return Ok("Password reset email sent successfully");
            }
            catch (Exception ex)
            {
                
                return BadRequest("Error sending password reset email");
            }
        }
        [HttpGet("validate-token")]
        public IActionResult ValidateResetToken([FromQuery] string token)
        {
            var user = _context.Users.FirstOrDefault(u => u.ResetPasswordToken == token && u.ResetPasswordTokenExpiresAt > DateTime.UtcNow);
            if (user == null)
            {
                return BadRequest("Invalid or expired token");
            }
           
            return Ok("Token is valid");
        }
        [HttpPost("reset-password")]
        public IActionResult ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                var user = _context.Users.FirstOrDefault(u => u.ResetPasswordToken == request.Token && u.ResetPasswordTokenExpiresAt > DateTime.UtcNow);
                if (user == null)
                {
                    return BadRequest("Invalid or expired token");
                }
                user.Password = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
                user.ResetPasswordToken = null;
                user.ResetPasswordTokenExpiresAt = null;
                _context.SaveChanges();
                return Ok("Password has been reset successfully");
            }
            catch (Exception ex)
            {
                
                return BadRequest("Error resetting password");
            }
        }
        public class ResetPasswordEmailRequest
        {
            public required string To { get; set; }
        }
        public class ResetPasswordRequest
        {
            public required string Token { get; set; }
            public required string NewPassword { get; set; }
        }
    }
}