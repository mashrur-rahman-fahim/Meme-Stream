using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MemeStreamApi.services;
using MemeStreamApi.data;
using Microsoft.AspNetCore.Mvc;

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
        public class WelcomeEmailRequest
        {
            public required string To { get; set; }
            public required string UserName { get; set; }
        }
        
    }
}