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
using MemeStreamApi.services;

namespace MemeStreamApi.controller
{
    
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly MemeStreamDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILaughScoreService _laughScoreService;
        public UserController(MemeStreamDbContext context, IEmailService emailService, ILaughScoreService laughScoreService)
        {
            _context = context;
            _emailService = emailService;
            _laughScoreService = laughScoreService;
        }
        public class RegisterDto
        {
            public required string Name { get; set; }
            public string Bio { get; set; } = string.Empty;
            public required string Email { get; set; }
            public required string Password { get; set; }
            public string Image { get; set; } = string.Empty;
        }
        [HttpPost("register")]
        public async Task<IActionResult> CreateUser([FromBody] RegisterDto registerDto)
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
                await _emailService.SendWelcomeEmailAsync(user.Email, user.Name);

                var userResponse = new UserResponseDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Bio = user.Bio,
                    Image = user.Image,
                    IsEmailVerified = user.IsEmailVerified
                };

                var response = new RegisterResponseDto
                {
                    Token = Token,
                    User = userResponse
                };

                transaction.Commit();
                return Ok(response);
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
                if (!user.IsEmailVerified)
                {
                    return BadRequest("Email not verified. Please check your email for verification.");
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

                var userResponse = new UserResponseDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Bio = user.Bio,
                    Image = user.Image,
                    IsEmailVerified = user.IsEmailVerified
                };

                var response = new LoginResponseDto
                {
                    Token = Token,
                    User = userResponse
                };

                transaction.Commit();
                return Ok(response);
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
                if (string.IsNullOrWhiteSpace(name) || name.Length < 2)
                {
                    return BadRequest("Search query must be at least 2 characters long.");
                }

                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                var currentUserId = 0;
                if (!string.IsNullOrEmpty(userIdClaim))
                {
                    currentUserId = int.Parse(userIdClaim);
                }

                var users = _context.Users
                     .Where(u => u.Id != currentUserId && 
                                u.Name.ToLower().Contains(name.ToLower()) &&
                                u.IsEmailVerified) // Only include verified users
                     .Select(u => new UserSearchDto {
                         Id = u.Id,
                         Name = u.Name,
                         Email = u.Email,
                         Image = u.Image,
                         Bio = u.Bio
                     })
                     .Take(20) // Limit results for performance
                     .ToList();
                
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
        public IActionResult DeleteUser()
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
        public class UpdateProfileDto
        {
            public string Name { get; set; } = string.Empty;
            public string Bio { get; set; } = string.Empty;
            public string Image { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
        }

        [Authorize]
        [HttpPut("profile")]
        public IActionResult UpdateProfile([FromBody] UpdateProfileDto updateDto)
        {
            try
            {
                // Validate input
                if (updateDto == null)
                {
                    return BadRequest("Invalid profile data.");
                }

                // Validate required fields
                if (string.IsNullOrWhiteSpace(updateDto.Name) || updateDto.Name.Length < 2)
                {
                    return BadRequest("Name must be at least 2 characters long.");
                }

                if (string.IsNullOrWhiteSpace(updateDto.Email) || !IsValidEmail(updateDto.Email))
                {
                    return BadRequest("Valid email is required.");
                }

                // Validate bio length (optional but if provided, should be reasonable)
                if (!string.IsNullOrEmpty(updateDto.Bio) && updateDto.Bio.Length > 500)
                {
                    return BadRequest("Bio cannot exceed 500 characters.");
                }

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

                // Check if email is already taken by another user
                var emailExists = _context.Users.Any(u => u.Email == updateDto.Email && u.Id != userId);
                if (emailExists)
                {
                    return BadRequest("Email is already in use by another account.");
                }

                // Update user properties
                user.Name = updateDto.Name.Trim();
                user.Bio = updateDto.Bio?.Trim() ?? string.Empty;
                user.Email = updateDto.Email.Trim().ToLower();
                
                // Always update image (including empty string to remove image)
                user.Image = updateDto.Image?.Trim() ?? string.Empty;

                _context.SaveChanges();

                // Return updated user data (excluding sensitive information)
                var updatedUserResponse = new UserResponseDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Bio = user.Bio,
                    Image = user.Image,
                    IsEmailVerified = user.IsEmailVerified
                };

                var response = new ProfileUpdateResponseDto
                { 
                    Message = "Profile updated successfully.",
                    User = updatedUserResponse
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new ErrorResponseDto { Error = ex.Message });
            }
        }

        [Authorize]
        [HttpPatch("profile/image")]
        public IActionResult UpdateProfileImage([FromBody] UpdateImageDto imageDto)
        {
            try
            {
                if (imageDto == null)
                {
                    return BadRequest("Image data is required.");
                }

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

                // Allow empty string to remove image
                user.Image = imageDto.ImageUrl?.Trim() ?? string.Empty;
                _context.SaveChanges();

                var response = new ImageUpdateResponseDto
                { 
                    Message = string.IsNullOrEmpty(user.Image) ? "Profile image removed successfully." : "Profile image updated successfully.",
                    ImageUrl = user.Image
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new ErrorResponseDto { Error = ex.Message });
            }
        }

        [Authorize]
        [HttpDelete("profile/image")]
        public IActionResult RemoveProfileImage()
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

                user.Image = string.Empty;
                _context.SaveChanges();

                var response = new ImageUpdateResponseDto
                { 
                    Message = "Profile image removed successfully.",
                    ImageUrl = string.Empty
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new ErrorResponseDto { Error = ex.Message });
            }
        }

        public class UpdateImageDto
        {
            public string ImageUrl { get; set; } = string.Empty;
        }

        public class UserResponseDto
        {
            public int Id { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Bio { get; set; } = string.Empty;
            public string Image { get; set; } = string.Empty;
            public bool IsEmailVerified { get; set; }
        }

        public class ProfileUpdateResponseDto
        {
            public string Message { get; set; } = string.Empty;
            public UserResponseDto User { get; set; } = new UserResponseDto();
        }

        public class ImageUpdateResponseDto
        {
            public string Message { get; set; } = string.Empty;
            public string ImageUrl { get; set; } = string.Empty;
        }

        public class ErrorResponseDto
        {
            public string Error { get; set; } = string.Empty;
        }

        public class LoginResponseDto
        {
            public string Token { get; set; } = string.Empty;
            public UserResponseDto User { get; set; } = new UserResponseDto();
        }

        public class RegisterResponseDto
        {
            public string Token { get; set; } = string.Empty;
            public UserResponseDto User { get; set; } = new UserResponseDto();
        }

        public class UserSearchDto
        {
            public int Id { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Image { get; set; } = string.Empty;
            public string Bio { get; set; } = string.Empty;
        }

        private bool IsValidEmail(string email)
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }
        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
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
                
                // Get detailed LaughScore breakdown
                var laughScoreBreakdown = await _laughScoreService.GetDetailedLaughScoreAsync(userId);
                
                var userProfile = new
                {
                    user.Id,
                    user.Name,
                    user.Email,
                    user.Image,
                    user.Bio,
                    user.CreatedAt,
                    user.IsEmailVerified,
                    user.LaughScore,
                    user.LastLaughScoreUpdate,
                    LaughScoreDetails = laughScoreBreakdown
                };
                
                return Ok(userProfile);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpGet("profile/{userId}")]
        public async Task<IActionResult> GetPublicProfile(int userId)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var currentUserId = int.Parse(userIdClaim);

                var user = _context.Users.FirstOrDefault(u => u.Id == userId && u.IsEmailVerified);
                if (user == null)
                {
                    return NotFound("User not found.");
                }

                // Get friendship status if not viewing own profile
                string friendshipStatus = "None";
                bool canSendRequest = true;
                
                if (currentUserId != userId)
                {
                    var friendship = _context.FriendRequests.FirstOrDefault(fr => 
                        (fr.SenderId == currentUserId && fr.ReceiverId == userId) ||
                        (fr.SenderId == userId && fr.ReceiverId == currentUserId));

                    if (friendship != null)
                    {
                        switch (friendship.Status)
                        {
                            case FriendRequest.RequestStatus.Accepted:
                                friendshipStatus = "Friend";
                                canSendRequest = false;
                                break;
                            case FriendRequest.RequestStatus.Pending:
                                friendshipStatus = friendship.SenderId == currentUserId ? "Request Sent" : "Request Received";
                                canSendRequest = false;
                                break;
                            case FriendRequest.RequestStatus.Rejected:
                                friendshipStatus = "Request Declined";
                                canSendRequest = true;
                                break;
                        }
                    }
                }
                else
                {
                    friendshipStatus = "Own Profile";
                    canSendRequest = false;
                }

                // Get LaughScore breakdown for public profile
                var laughScoreBreakdown = await _laughScoreService.GetDetailedLaughScoreAsync(userId);
                
                var publicProfile = new PublicProfileDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Bio = user.Bio,
                    Image = user.Image,
                    FriendshipStatus = friendshipStatus,
                    CanSendRequest = canSendRequest,
                    IsOwnProfile = currentUserId == userId,
                    LaughScore = user.LaughScore,
                    FunninessLevel = laughScoreBreakdown.FunninessLevel,
                    LastLaughScoreUpdate = user.LastLaughScoreUpdate
                };

                return Ok(publicProfile);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPublicProfile: {ex.Message}");
                return BadRequest("Error retrieving user profile.");
            }
        }

        public class PublicProfileDto
        {
            public int Id { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Bio { get; set; } = string.Empty;
            public string Image { get; set; } = string.Empty;
            public string FriendshipStatus { get; set; } = string.Empty;
            public bool CanSendRequest { get; set; }
            public bool IsOwnProfile { get; set; }
            public int LaughScore { get; set; }
            public string FunninessLevel { get; set; } = string.Empty;
            public DateTime? LastLaughScoreUpdate { get; set; }
        }

    }
}