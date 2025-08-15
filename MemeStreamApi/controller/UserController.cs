using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using BCrypt.Net;
using DotNetEnv;
using MemeStreamApi.data;
using MemeStreamApi.model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace MemeStreamApi.controller
{
    
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly MemeStreamDbContext _context;
        public UserController(MemeStreamDbContext context)
        {
            _context = context;
        }
        public class RegisterDto
        {
            public required string Name { get; set; }
            public required string Bio { get; set; }
            public required string Email { get; set; }
            public required string Password { get; set; }
            public string Image { get; set; } = string.Empty;
        }
        [HttpPost("register")]
        public IActionResult CreateUser([FromBody] RegisterDto registerDto)
        {
            if (registerDto == null)
            {
                return BadRequest("Invalid user data.");
            }
            var user = new User
            {
                Name = registerDto.Name,
                Bio = registerDto.Bio,
                Email = registerDto.Email,
                Password = registerDto.Password,
                Image = registerDto.Image
            };
            using var transaction = _context.Database.BeginTransaction();
            try
            {
                user.Password = BCrypt.Net.BCrypt.HashPassword(user.Password);
                if (_context.Users.Any(u => u.Email == user.Email))
                {
                    return BadRequest("Email already exists.");
                }
                
                _context.Users.Add(user);
                _context.SaveChanges(); // Save first to get the ID
                
                var claims = new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email)
                };
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Env.GetString("Jwt__Key")));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
                var token = new JwtSecurityToken(
                    issuer: Env.GetString("Jwt__Issuer"),
                    audience: Env.GetString("Jwt__Audience"),
                    claims: claims,
                    expires: DateTime.Now.AddMinutes(30),
                    signingCredentials: creds
                );
                var Token = new JwtSecurityTokenHandler().WriteToken(token);

                transaction.Commit();
                return Ok(new { Token = Token, User = user });
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                return BadRequest(ex.Message);
            }
        }
        
        public class LoginDto
        {
            public required string Email { get; set; }
            public required string Password { get; set; }
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto login)
        {
            if (login == null || string.IsNullOrEmpty(login.Email) || string.IsNullOrEmpty(login.Password))
            {
                return BadRequest("Email and password are required.");
            }

            using var transaction = _context.Database.BeginTransaction();
            try
            {
                var user = _context.Users.FirstOrDefault(u => u.Email == login.Email);
                if (user == null || !BCrypt.Net.BCrypt.Verify(login.Password, user.Password))
                {
                    return Unauthorized("Invalid email or password.");
                }
                var claims = new[]
                {
                    new Claim(ClaimTypes.NameIdentifier,user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email)
                };
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Env.GetString("Jwt__Key")));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
                var token = new JwtSecurityToken(
                    issuer: Env.GetString("Jwt__Issuer"),
                    audience: Env.GetString("Jwt__Audience"),
                    claims: claims,
                    expires: DateTime.Now.AddMinutes(30),
                    signingCredentials: creds
                );
                var Token = new JwtSecurityTokenHandler().WriteToken(token);

                transaction.Commit();
                return Ok(new { token  = Token, user = user });
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                return BadRequest(ex.Message);
            }
        }
        [Authorize]
        [HttpGet("{name}")]
        public IActionResult GetUserByName(string name)
        {
            try
            {
                var users = _context.Users
                     .Where(u => u.Name.ToLower().Contains(name.ToLower())).ToList();
                if (users.Count == 0)
                {
                    return NotFound("No users found with that name.");
                }
                return Ok(users);

            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
        [Authorize]
        [HttpDelete("delete")]
        public IActionResult DeleteUser(string email)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                int userId = int.Parse(userIdClaim);
                var user = _context.Users.FirstOrDefault(u => u.Id == userId);
                if (user == null)
                {
                    return NotFound("User not found.");
                }
                _context.Users.Remove(user);
                _context.SaveChanges();
                return Ok("User deleted successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }    
        [Authorize]
        [HttpPut("profile")]
        public IActionResult UpdateProfile(User updatedUser)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                int userId = int.Parse(userIdClaim);
                var user = _context.Users.FirstOrDefault(u => u.Id == userId);
                if (user == null)
                {
                    return NotFound("User not found.");
                }
                user.Name = updatedUser.Name;
                user.Bio = updatedUser.Bio;
                user.Email = updatedUser.Email;
                
                if (!string.IsNullOrEmpty(updatedUser.Image))
                {
                    user.Image = updatedUser.Image;
                }
                _context.SaveChanges();
                return Ok("Profile updated successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
        [Authorize]
        [HttpGet("profile")]
        public IActionResult GetProfile()
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                int userId = int.Parse(userIdClaim);
                var user = _context.Users.FirstOrDefault(u => u.Id == userId);
                if (user == null)
                {
                    return NotFound("User not found.");
                }
                return Ok(user);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}