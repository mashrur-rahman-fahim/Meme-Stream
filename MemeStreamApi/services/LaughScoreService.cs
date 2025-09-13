using MemeStreamApi.data;
using MemeStreamApi.model;
using Microsoft.EntityFrameworkCore;

namespace MemeStreamApi.services
{
    public interface ILaughScoreService
    {
        Task<int> CalculateLaughScoreAsync(int userId);
        Task<LaughScoreBreakdown> GetDetailedLaughScoreAsync(int userId);
        Task UpdateLaughScoreAsync(int userId);
        Task RecalculateAllLaughScoresAsync();
        Task<List<UserLaughScoreRanking>> GetLaughScoreLeaderboardAsync(int limit = 10);
    }

    public class LaughScoreService : ILaughScoreService
    {
        private readonly MemeStreamDbContext _context;
        private readonly ILogger<LaughScoreService> _logger;

        // LaughScore Algorithm Configuration
        private const int REACTION_POINTS = 5;    // Highest value - direct humor indicator
        private const int SHARE_POINTS = 3;       // Moderate value - shows worth sharing  
        private const int COMMENT_POINTS = 2;     // Lower value - engagement but not humor
        
        public LaughScoreService(MemeStreamDbContext context, ILogger<LaughScoreService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<int> CalculateLaughScoreAsync(int userId)
        {
            try
            {
                // Get all posts by this user
                var userPosts = await _context.Posts
                    .Where(p => p.UserId == userId)
                    .Select(p => p.Id)
                    .ToListAsync();

                if (!userPosts.Any())
                {
                    return 0;
                }

                int totalScore = 0;

                // Calculate Reaction Points (5 points each, unique users only)
                var reactionScore = await _context.Reactions
                    .Where(r => userPosts.Contains(r.PostId))
                    .GroupBy(r => new { r.PostId, r.UserId })
                    .CountAsync();
                totalScore += reactionScore * REACTION_POINTS;

                // Calculate Share Points (3 points each, unique users only)
                var shareScore = await _context.SharedPosts
                    .Where(s => userPosts.Contains(s.PostId))
                    .GroupBy(s => new { s.PostId, s.UserId })
                    .CountAsync();
                totalScore += shareScore * SHARE_POINTS;

                // Calculate Comment Points (2 points each, unique users only per post)
                var commentScore = await _context.Comments
                    .Where(c => userPosts.Contains(c.PostId))
                    .GroupBy(c => new { c.PostId, c.UserId })
                    .CountAsync();
                totalScore += commentScore * COMMENT_POINTS;

                _logger.LogInformation("LaughScore calculated for user {UserId}: Reactions={ReactionsCount}*{ReactionPoints}={ReactionTotal}, Shares={SharesCount}*{SharePoints}={ShareTotal}, Comments={CommentsCount}*{CommentPoints}={CommentTotal}, Total={TotalScore}",
                    userId, reactionScore, REACTION_POINTS, reactionScore * REACTION_POINTS,
                    shareScore, SHARE_POINTS, shareScore * SHARE_POINTS,
                    commentScore, COMMENT_POINTS, commentScore * COMMENT_POINTS,
                    totalScore);

                return totalScore;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating LaughScore for user {UserId}", userId);
                return 0;
            }
        }

        public async Task<LaughScoreBreakdown> GetDetailedLaughScoreAsync(int userId)
        {
            try
            {
                var userPosts = await _context.Posts
                    .Where(p => p.UserId == userId)
                    .Select(p => p.Id)
                    .ToListAsync();

                var breakdown = new LaughScoreBreakdown
                {
                    UserId = userId,
                    TotalPosts = userPosts.Count
                };

                if (!userPosts.Any())
                {
                    return breakdown;
                }

                // Get detailed breakdowns
                breakdown.UniqueReactions = await _context.Reactions
                    .Where(r => userPosts.Contains(r.PostId))
                    .GroupBy(r => new { r.PostId, r.UserId })
                    .CountAsync();

                breakdown.UniqueShares = await _context.SharedPosts
                    .Where(s => userPosts.Contains(s.PostId))
                    .GroupBy(s => new { s.PostId, s.UserId })
                    .CountAsync();

                breakdown.UniqueComments = await _context.Comments
                    .Where(c => userPosts.Contains(c.PostId))
                    .GroupBy(c => new { c.PostId, c.UserId })
                    .CountAsync();

                // Calculate scores
                breakdown.ReactionPoints = breakdown.UniqueReactions * REACTION_POINTS;
                breakdown.SharePoints = breakdown.UniqueShares * SHARE_POINTS;
                breakdown.CommentPoints = breakdown.UniqueComments * COMMENT_POINTS;
                breakdown.TotalScore = breakdown.ReactionPoints + breakdown.SharePoints + breakdown.CommentPoints;

                // Calculate averages per meme
                if (breakdown.TotalPosts > 0)
                {
                    breakdown.AverageScorePerMeme = (double)breakdown.TotalScore / breakdown.TotalPosts;
                    breakdown.AverageReactionsPerMeme = (double)breakdown.UniqueReactions / breakdown.TotalPosts;
                    breakdown.AverageSharesPerMeme = (double)breakdown.UniqueShares / breakdown.TotalPosts;
                    breakdown.AverageCommentsPerMeme = (double)breakdown.UniqueComments / breakdown.TotalPosts;
                }

                // Get funniness level
                breakdown.FunninessLevel = GetFunninessLevel(breakdown.TotalScore);
                
                // Auto-update the user's LaughScore in the database if it's different
                var user = await _context.Users.FindAsync(userId);
                if (user != null && user.LaughScore != breakdown.TotalScore)
                {
                    var oldScore = user.LaughScore;
                    user.LaughScore = breakdown.TotalScore;
                    user.LastLaughScoreUpdate = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Auto-updated LaughScore for user {UserId}: {OldScore} -> {NewScore}", 
                        userId, oldScore, breakdown.TotalScore);
                }

                return breakdown;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting detailed LaughScore for user {UserId}", userId);
                return new LaughScoreBreakdown { UserId = userId };
            }
        }

        public async Task UpdateLaughScoreAsync(int userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("User {UserId} not found for LaughScore update", userId);
                    return;
                }

                var newScore = await CalculateLaughScoreAsync(userId);
                var oldScore = user.LaughScore;

                user.LaughScore = newScore;
                user.LastLaughScoreUpdate = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("LaughScore updated for user {UserId}: {OldScore} -> {NewScore}", 
                    userId, oldScore, newScore);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating LaughScore for user {UserId}", userId);
            }
        }

        public async Task RecalculateAllLaughScoresAsync()
        {
            try
            {
                _logger.LogInformation("Starting bulk LaughScore recalculation for all users");
                var startTime = DateTime.UtcNow;

                var allUsers = await _context.Users.ToListAsync();
                var updatedCount = 0;

                foreach (var user in allUsers)
                {
                    var newScore = await CalculateLaughScoreAsync(user.Id);
                    if (user.LaughScore != newScore)
                    {
                        user.LaughScore = newScore;
                        user.LastLaughScoreUpdate = DateTime.UtcNow;
                        updatedCount++;
                    }
                }

                await _context.SaveChangesAsync();

                var duration = DateTime.UtcNow - startTime;
                _logger.LogInformation("Bulk LaughScore recalculation completed: {UpdatedCount}/{TotalCount} users updated in {Duration}ms",
                    updatedCount, allUsers.Count, duration.TotalMilliseconds);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during bulk LaughScore recalculation");
            }
        }

        public async Task<List<UserLaughScoreRanking>> GetLaughScoreLeaderboardAsync(int limit = 10)
        {
            try
            {
                var leaderboard = await _context.Users
                    .Where(u => u.LaughScore > 0)
                    .OrderByDescending(u => u.LaughScore)
                    .Take(limit)
                    .Select(u => new UserLaughScoreRanking
                    {
                        UserId = u.Id,
                        Name = u.Name,
                        Image = u.Image,
                        LaughScore = u.LaughScore,
                        FunninessLevel = "",
                        LastUpdated = u.LastLaughScoreUpdate
                    })
                    .ToListAsync();

                // Add ranking positions and funniness levels
                for (int i = 0; i < leaderboard.Count; i++)
                {
                    leaderboard[i].Rank = i + 1;
                    leaderboard[i].FunninessLevel = GetFunninessLevel(leaderboard[i].LaughScore);
                }

                return leaderboard;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting LaughScore leaderboard");
                return new List<UserLaughScoreRanking>();
            }
        }

        private string GetFunninessLevel(int score)
        {
            return score switch
            {
                >= 1000 => "👑 Meme Legend",
                >= 500 => "🏆 Comedy Gold",
                >= 250 => "😄 Laugh Master", 
                >= 100 => "😊 Funny Person",
                >= 50 => "🙂 Meme Rookie",
                >= 10 => "😐 Getting There",
                >= 1 => "🤨 Meme Newbie",
                _ => "😴 No Laughs Yet"
            };
        }
    }

    // Supporting models for detailed analysis
    public class LaughScoreBreakdown
    {
        public int UserId { get; set; }
        public int TotalScore { get; set; }
        public int TotalPosts { get; set; }
        
        // Engagement counts (unique users only)
        public int UniqueReactions { get; set; }
        public int UniqueShares { get; set; }
        public int UniqueComments { get; set; }
        
        // Points breakdown
        public int ReactionPoints { get; set; }
        public int SharePoints { get; set; }
        public int CommentPoints { get; set; }
        
        // Averages per meme
        public double AverageScorePerMeme { get; set; }
        public double AverageReactionsPerMeme { get; set; }
        public double AverageSharesPerMeme { get; set; }
        public double AverageCommentsPerMeme { get; set; }
        
        public string FunninessLevel { get; set; } = "😴 No Laughs Yet";
    }

    public class UserLaughScoreRanking
    {
        public int Rank { get; set; }
        public int UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Image { get; set; } = string.Empty;
        public int LaughScore { get; set; }
        public string FunninessLevel { get; set; } = string.Empty;
        public DateTime? LastUpdated { get; set; }
    }
}