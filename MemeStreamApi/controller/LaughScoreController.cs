using MemeStreamApi.data;
using MemeStreamApi.services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Security.Claims;

namespace MemeStreamApi.controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class LaughScoreController : ControllerBase
    {
        private readonly ILaughScoreService _laughScoreService;
        private readonly ILogger<LaughScoreController> _logger;
        private readonly MemeStreamDbContext _context;

        public LaughScoreController(ILaughScoreService laughScoreService, ILogger<LaughScoreController> logger, MemeStreamDbContext context)
        {
            _laughScoreService = laughScoreService;
            _logger = logger;
            _context = context;
        }

        /// <summary>
        /// Get current authenticated user's LaughScore
        /// </summary>
        [HttpGet("user")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUserLaughScore()
        {
            try
            {
                var userIdClaim = HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { error = "Invalid user authentication" });
                }

                var breakdown = await _laughScoreService.GetDetailedLaughScoreAsync(userId);
                
                // Also ensure the score is saved to the database
                await _laughScoreService.UpdateLaughScoreAsync(userId);
                
                return Ok(breakdown);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current user's LaughScore");
                return StatusCode(500, new { error = "Failed to calculate LaughScore" });
            }
        }

        /// <summary>
        /// Get current LaughScore for a specific user
        /// </summary>
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserLaughScore(int userId)
        {
            try
            {
                var score = await _laughScoreService.CalculateLaughScoreAsync(userId);
                return Ok(new { userId, laughScore = score });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting LaughScore for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to calculate LaughScore" });
            }
        }

        /// <summary>
        /// Get detailed LaughScore breakdown for a user
        /// </summary>
        [HttpGet("user/{userId}/detailed")]
        public async Task<IActionResult> GetDetailedLaughScore(int userId)
        {
            try
            {
                var breakdown = await _laughScoreService.GetDetailedLaughScoreAsync(userId);
                return Ok(breakdown);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting detailed LaughScore for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to get detailed LaughScore" });
            }
        }

        /// <summary>
        /// Initialize current user's LaughScore in the database
        /// </summary>
        [HttpPost("initialize")]
        [Authorize]
        public async Task<IActionResult> InitializeMyLaughScore()
        {
            try
            {
                var userIdClaim = HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { error = "Invalid user authentication" });
                }

                await _laughScoreService.UpdateLaughScoreAsync(userId);
                var newScore = await _laughScoreService.CalculateLaughScoreAsync(userId);
                
                _logger.LogInformation("Initialized LaughScore for user {UserId}: {Score}", userId, newScore);
                
                return Ok(new { 
                    message = "LaughScore initialized successfully", 
                    userId, 
                    laughScore = newScore 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing LaughScore");
                return StatusCode(500, new { error = "Failed to initialize LaughScore" });
            }
        }
        
        /// <summary>
        /// Update LaughScore for a specific user
        /// </summary>
        [HttpPost("user/{userId}/update")]
        [Authorize]
        public async Task<IActionResult> UpdateUserLaughScore(int userId)
        {
            try
            {
                await _laughScoreService.UpdateLaughScoreAsync(userId);
                var newScore = await _laughScoreService.CalculateLaughScoreAsync(userId);
                return Ok(new { 
                    message = "LaughScore updated successfully", 
                    userId, 
                    newLaughScore = newScore 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating LaughScore for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to update LaughScore" });
            }
        }

        /// <summary>
        /// Get LaughScore leaderboard - funniest people on the platform
        /// </summary>
        [HttpGet("leaderboard")]
        public async Task<IActionResult> GetLeaderboard([FromQuery] int limit = 10)
        {
            try
            {
                if (limit > 100) limit = 100; // Prevent excessive queries
                
                var leaderboard = await _laughScoreService.GetLaughScoreLeaderboardAsync(limit);
                return Ok(new { 
                    title = "🏆 Funniest People on MemeStream",
                    leaderboard 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting LaughScore leaderboard");
                return StatusCode(500, new { error = "Failed to get leaderboard" });
            }
        }

        /// <summary>
        /// Recalculate all LaughScores (admin only)
        /// </summary>
        [HttpPost("recalculate-all")]
        [Authorize] // Add admin role check if needed
        public async Task<IActionResult> RecalculateAllScores()
        {
            try
            {
                await _laughScoreService.RecalculateAllLaughScoresAsync();
                return Ok(new { message = "All LaughScores recalculated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during bulk LaughScore recalculation");
                return StatusCode(500, new { error = "Failed to recalculate scores" });
            }
        }

        /// <summary>
        /// Debug endpoint to check and fix user scores in database
        /// </summary>
        [HttpGet("debug/check-scores")]
        public async Task<IActionResult> CheckDatabaseScores()
        {
            try
            {
                var users = await _context.Users.ToListAsync();
                var result = new List<object>();
                
                foreach (var user in users)
                {
                    var calculatedScore = await _laughScoreService.CalculateLaughScoreAsync(user.Id);
                    result.Add(new 
                    {
                        userId = user.Id,
                        name = user.Name,
                        databaseScore = user.LaughScore,
                        calculatedScore = calculatedScore,
                        needsUpdate = user.LaughScore != calculatedScore
                    });
                }
                
                return Ok(new 
                { 
                    message = "Database score check",
                    users = result,
                    summary = new
                    {
                        totalUsers = result.Count,
                        usersNeedingUpdate = result.Count(r => ((dynamic)r).needsUpdate),
                        usersWithScores = result.Count(r => ((dynamic)r).databaseScore > 0)
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking database scores");
                return StatusCode(500, new { error = "Failed to check scores" });
            }
        }
        
        /// <summary>
        /// Get LaughScore algorithm information and scoring rules
        /// </summary>
        [HttpGet("info")]
        public IActionResult GetScoringInfo()
        {
            var info = new
            {
                title = "🤣 LaughScore Algorithm",
                description = "LaughScore measures how funny you are based on meme engagement from unique users",
                scoringRules = new
                {
                    reactions = new { points = 5, description = "Each unique user reaction (laugh) - highest value!" },
                    shares = new { points = 3, description = "Each unique user share - shows your meme is worth sharing" },
                    comments = new { points = 2, description = "Each unique user comment - engagement indicator" }
                },
                funninessLevels = new[]
                {
                    new { score = "1000+", level = "👑 Meme Legend", description = "You're a comedy genius!" },
                    new { score = "500-999", level = "🏆 Comedy Gold", description = "Your memes are pure gold!" },
                    new { score = "250-499", level = "😄 Laugh Master", description = "Master of making people laugh!" },
                    new { score = "100-249", level = "😊 Funny Person", description = "You've got comedic talent!" },
                    new { score = "50-99", level = "🙂 Meme Rookie", description = "Getting some laughs!" },
                    new { score = "10-49", level = "😐 Getting There", description = "Keep improving your memes!" },
                    new { score = "1-9", level = "🤨 Meme Newbie", description = "Just getting started!" },
                    new { score = "0", level = "😴 No Laughs Yet", description = "Time to create your first meme!" }
                },
                notes = new[]
                {
                    "Only unique users count (prevents spam)",
                    "All your memes contribute to your total score",
                    "Score updates when people engage with your content",
                    "Higher engagement = Higher LaughScore!"
                }
            };

            return Ok(info);
        }

        /// <summary>
        /// Compare LaughScores between two users
        /// </summary>
        [HttpGet("compare/{userId1}/{userId2}")]
        public async Task<IActionResult> CompareLaughScores(int userId1, int userId2)
        {
            try
            {
                var breakdown1 = await _laughScoreService.GetDetailedLaughScoreAsync(userId1);
                var breakdown2 = await _laughScoreService.GetDetailedLaughScoreAsync(userId2);

                var comparison = new
                {
                    user1 = new
                    {
                        userId = userId1,
                        laughScore = breakdown1.TotalScore,
                        funninessLevel = breakdown1.FunninessLevel,
                        totalMemes = breakdown1.TotalPosts,
                        averageScorePerMeme = breakdown1.AverageScorePerMeme
                    },
                    user2 = new
                    {
                        userId = userId2,
                        laughScore = breakdown2.TotalScore,
                        funninessLevel = breakdown2.FunninessLevel,
                        totalMemes = breakdown2.TotalPosts,
                        averageScorePerMeme = breakdown2.AverageScorePerMeme
                    },
                    winner = breakdown1.TotalScore > breakdown2.TotalScore ? 
                        $"User {userId1} is funnier! 🏆" : 
                        breakdown2.TotalScore > breakdown1.TotalScore ? 
                        $"User {userId2} is funnier! 🏆" : 
                        "It's a tie! Both equally funny! 🤝",
                    scoreDifference = Math.Abs(breakdown1.TotalScore - breakdown2.TotalScore)
                };

                return Ok(comparison);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error comparing LaughScores for users {User1} and {User2}", userId1, userId2);
                return StatusCode(500, new { error = "Failed to compare LaughScores" });
            }
        }
    }
}