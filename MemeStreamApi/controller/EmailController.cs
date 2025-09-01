using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MemeStreamApi.services;
using MemeStreamApi.data;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using System.IdentityModel.Tokens.Jwt;
using DotNetEnv;

namespace MemeStreamApi.controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmailController:ControllerBase
    {
        private readonly IEmailService _emailService;
        private readonly MemeStreamDbContext _context;
        public EmailController(IEmailService emailService, MemeStreamDbContext context)
        {
            _emailService = emailService;
            _context = context;
        }
        [HttpPost("test")]
        public async Task<IActionResult> SendWelcomeEmailAsync([FromBody] WelcomeEmailRequest request)
        {
            try
            {
                await _emailService.SendWelcomeEmailAsync(request.To, request.UserName);
                return Ok("Welcome email sent successfully");
            }
            catch (Exception ex)
            {
                
                return BadRequest("Error sending welcome email");
            }
        }
        [HttpPost("send-verification")]
        public async Task<IActionResult> SendVerificationEmail([FromBody] VerificationEmailRequest request)
        {
            try
            {
                var user = _context.Users.FirstOrDefault(u => u.Email == request.To);
                if (user == null)
                {
                    return BadRequest("User not found");
                }
                if (user.IsEmailVerified)
                {
                    return BadRequest("Email already verified");
                }
                var token = Guid.NewGuid().ToString();
                user.EmailVerificationToken = token;
                user.EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddMinutes(10);
                _context.SaveChanges();
                await _emailService.SendVerificationEmailAsync(request.To, token);
                return Ok("Verification email sent successfully");
            }
            catch (Exception ex)
            {
                return BadRequest("Error sending verification email");
            }
        }
        [HttpGet("verify-email")]
        public IActionResult VerifyEmail(string token)
        {
            Console.WriteLine("Received token: " + token);
            try
            {
                
                var user = _context.Users.FirstOrDefault(u => u.EmailVerificationToken == token);
                if (user == null)
                {
                    
                    return BadRequest("Invalid verification token");
                }
                if (user.EmailVerificationTokenExpiresAt < DateTime.UtcNow)
                {
                    return BadRequest(new {message="Verification token expired"});
                }
                user.IsEmailVerified = true;
                user.EmailVerificationToken = null;
                user.EmailVerificationTokenExpiresAt = null;
                var claims = new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email)
                };
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Env.GetString("Jwt__Key")));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
                var jwtToken = new JwtSecurityToken(
                    issuer: Env.GetString("Jwt__Issuer"),
                    audience: Env.GetString("Jwt__Audience"),
                    claims: claims,
                    expires: DateTime.Now.AddMinutes(30),
                    signingCredentials: creds
                );
                var Token = new JwtSecurityTokenHandler().WriteToken(jwtToken);
                _context.SaveChanges();
                return Ok(new {message="Email verified successfully", token=Token});
            }
            catch (Exception ex)
            {
                return BadRequest(new {message="Error verifying email"});
            }
        }

          public class WelcomeEmailRequest
        {
            public required string To { get; set; }
            public required string UserName { get; set; }
        }
        public class VerificationEmailRequest
        {
            public required string To { get; set; }
        }
        
    }
}