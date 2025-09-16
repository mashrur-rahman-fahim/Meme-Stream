using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MemeStreamApi.model;
using MemeStreamApi.data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MemeStreamApi.controller
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class VoiceMessageController : ControllerBase
    {
        private readonly MemeStreamDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<VoiceMessageController> _logger;
        private readonly IHubContext<ChatHub> _hubContext;

        private const long MaxFileSize = 50 * 1024 * 1024; // 50MB
        private const int MaxDuration = 300; // 5 minutes in seconds
        private readonly string[] AllowedAudioTypes = { "audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg" };

        public VoiceMessageController(
            MemeStreamDbContext context,
            IWebHostEnvironment environment,
            ILogger<VoiceMessageController> logger,
            IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _environment = environment;
            _logger = logger;
            _hubContext = hubContext;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadVoiceMessage([FromForm] VoiceMessageUploadDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

                // Validate file
                if (dto.Audio == null || dto.Audio.Length == 0)
                {
                    return BadRequest(new { message = "No audio file provided" });
                }

                if (dto.Audio.Length > MaxFileSize)
                {
                    return BadRequest(new { message = $"File size exceeds maximum limit of {MaxFileSize / (1024 * 1024)}MB" });
                }

                if (!AllowedAudioTypes.Contains(dto.Audio.ContentType.ToLower()))
                {
                    return BadRequest(new { message = "Invalid audio format. Supported formats: WebM, MP4, MP3, WAV, OGG" });
                }

                if (dto.Duration > MaxDuration)
                {
                    return BadRequest(new { message = $"Voice message duration exceeds maximum limit of {MaxDuration} seconds" });
                }

                // Validate chat permissions
                if (dto.ReceiverId.HasValue)
                {
                    // Private message - check if users are friends
                    var friendship = await _context.Friendships
                        .FirstOrDefaultAsync(f =>
                            (f.UserId == userId && f.FriendId == dto.ReceiverId.Value) ||
                            (f.UserId == dto.ReceiverId.Value && f.FriendId == userId));

                    if (friendship == null)
                    {
                        return Forbid();
                    }
                }
                else if (dto.GroupId.HasValue)
                {
                    // Group message - check if user is member
                    var membership = await _context.GroupMemberships
                        .FirstOrDefaultAsync(gm => gm.GroupId == dto.GroupId.Value && gm.UserId == userId);

                    if (membership == null)
                    {
                        return Forbid();
                    }
                }
                else
                {
                    return BadRequest(new { message = "Either ReceiverId or GroupId must be provided" });
                }

                // Create uploads directory
                var uploadsPath = Path.Combine(_environment.WebRootPath, "uploads", "voice");
                if (!Directory.Exists(uploadsPath))
                {
                    Directory.CreateDirectory(uploadsPath);
                }

                // Generate unique filename
                var fileExtension = Path.GetExtension(dto.Audio.FileName) ?? ".webm";
                var fileName = $"{Guid.NewGuid()}{fileExtension}";
                var filePath = Path.Combine(uploadsPath, fileName);

                // Save file
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.Audio.CopyToAsync(stream);
                }

                // Generate waveform data (simplified - in production, use audio analysis library)
                var waveformArray = GenerateWaveformData(dto.Duration);
                var waveform = string.Join(",", waveformArray);

                // Create voice message record
                var voiceMessage = new VoiceMessage
                {
                    SenderId = userId,
                    ReceiverId = dto.ReceiverId,
                    GroupId = dto.GroupId,
                    FileName = dto.Audio.FileName,
                    FilePath = $"uploads/voice/{fileName}",
                    Duration = dto.Duration,
                    FileSize = dto.Audio.Length,
                    WaveformData = waveform,
                    SentAt = DateTime.UtcNow
                };

                _context.VoiceMessages.Add(voiceMessage);

                // Create corresponding message entry
                var message = new Message
                {
                    SenderId = userId,
                    ReceiverId = dto.ReceiverId,
                    GroupId = dto.GroupId,
                    Content = $"🎤 Voice message ({dto.Duration}s)",
                    SentAt = DateTime.UtcNow,
                    // MessageType and VoiceMessageId properties don't exist in Message model yet
                    // TODO: Add these properties to support voice messages
                };

                _context.Messages.Add(message);
                await _context.SaveChangesAsync();

                // Update message with voice message ID
                voiceMessage.MessageId = message.Id;
                await _context.SaveChangesAsync();

                // Send real-time notification
                await SendVoiceMessageNotification(voiceMessage);

                _logger.LogInformation("Voice message uploaded successfully. ID: {VoiceMessageId}, Sender: {UserId}",
                    voiceMessage.Id, userId);

                return Ok(new VoiceMessageResponseDto
                {
                    Id = voiceMessage.Id,
                    MessageId = message.Id,
                    AudioUrl = $"/uploads/voice/{fileName}",
                    Duration = voiceMessage.Duration,
                    Waveform = waveformArray,
                    SentAt = voiceMessage.SentAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading voice message for user {UserId}",
                    User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
                return StatusCode(500, new { message = "An error occurred while uploading the voice message" });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetVoiceMessage(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

                var voiceMessage = await _context.VoiceMessages
                    .Include(vm => vm.Sender)
                    .Include(vm => vm.Receiver)
                    .Include(vm => vm.Group)
                    .FirstOrDefaultAsync(vm => vm.Id == id);

                if (voiceMessage == null)
                {
                    return NotFound(new { message = "Voice message not found" });
                }

                // Check permissions
                var hasAccess = false;

                if (voiceMessage.ReceiverId.HasValue)
                {
                    // Private message
                    hasAccess = voiceMessage.SenderId == userId || voiceMessage.ReceiverId == userId;
                }
                else if (voiceMessage.GroupId.HasValue)
                {
                    // Group message
                    var membership = await _context.GroupMemberships
                        .FirstOrDefaultAsync(gm => gm.GroupId == voiceMessage.GroupId && gm.UserId == userId);
                    hasAccess = membership != null;
                }

                if (!hasAccess)
                {
                    return Forbid();
                }

                return Ok(new VoiceMessageResponseDto
                {
                    Id = voiceMessage.Id,
                    MessageId = voiceMessage.MessageId,
                    AudioUrl = $"/{voiceMessage.FilePath}",
                    Duration = voiceMessage.Duration,
                    Waveform = voiceMessage.WaveformData?.Split(',').Select(int.Parse).ToArray() ?? new int[0],
                    SentAt = voiceMessage.SentAt,
                    SenderName = voiceMessage.Sender?.Name ?? "Unknown"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving voice message {VoiceMessageId}", id);
                return StatusCode(500, new { message = "An error occurred while retrieving the voice message" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVoiceMessage(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

                var voiceMessage = await _context.VoiceMessages
                    .FirstOrDefaultAsync(vm => vm.Id == id);

                if (voiceMessage == null)
                {
                    return NotFound(new { message = "Voice message not found" });
                }

                // Only sender can delete
                if (voiceMessage.SenderId != userId)
                {
                    return Forbid();
                }

                // Delete file from storage
                var fullPath = Path.Combine(_environment.WebRootPath, voiceMessage.FilePath);
                if (System.IO.File.Exists(fullPath))
                {
                    System.IO.File.Delete(fullPath);
                }

                // Mark as deleted in database
                voiceMessage.IsDeleted = true;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Voice message deleted. ID: {VoiceMessageId}, User: {UserId}", id, userId);

                return Ok(new { message = "Voice message deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting voice message {VoiceMessageId}", id);
                return StatusCode(500, new { message = "An error occurred while deleting the voice message" });
            }
        }

        [HttpPost("{id}/mark-played")]
        public async Task<IActionResult> MarkAsPlayed(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

                var voiceMessage = await _context.VoiceMessages
                    .FirstOrDefaultAsync(vm => vm.Id == id);

                if (voiceMessage == null)
                {
                    return NotFound(new { message = "Voice message not found" });
                }

                // Check if user has access to this voice message
                var hasAccess = false;

                if (voiceMessage.ReceiverId.HasValue)
                {
                    hasAccess = voiceMessage.ReceiverId == userId;
                }
                else if (voiceMessage.GroupId.HasValue)
                {
                    var membership = await _context.GroupMemberships
                        .FirstOrDefaultAsync(gm => gm.GroupId == voiceMessage.GroupId && gm.UserId == userId);
                    hasAccess = membership != null;
                }

                if (!hasAccess)
                {
                    return Forbid();
                }

                // Create or update play record
                var existingPlay = await _context.VoiceMessagePlays
                    .FirstOrDefaultAsync(vmp => vmp.VoiceMessageId == id && vmp.UserId == userId);

                if (existingPlay == null)
                {
                    var playRecord = new VoiceMessagePlay
                    {
                        VoiceMessageId = id,
                        UserId = userId,
                        PlayedAt = DateTime.UtcNow
                    };

                    _context.VoiceMessagePlays.Add(playRecord);
                    await _context.SaveChangesAsync();
                }

                return Ok(new { message = "Voice message marked as played" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking voice message as played {VoiceMessageId}", id);
                return StatusCode(500, new { message = "An error occurred while updating play status" });
            }
        }

        private async Task SendVoiceMessageNotification(VoiceMessage voiceMessage)
        {
            try
            {
                var senderName = await _context.Users
                    .Where(u => u.Id == voiceMessage.SenderId)
                    .Select(u => u.Name)
                    .FirstOrDefaultAsync();

                if (voiceMessage.ReceiverId.HasValue)
                {
                    // Private voice message
                    await _hubContext.Clients.User(voiceMessage.ReceiverId.Value.ToString())
                        .SendAsync("ReceiveVoiceMessage", new
                        {
                            Id = voiceMessage.Id,
                            MessageId = voiceMessage.MessageId,
                            SenderId = voiceMessage.SenderId,
                            SenderName = senderName,
                            AudioUrl = $"/{voiceMessage.FilePath}",
                            Duration = voiceMessage.Duration,
                            Waveform = voiceMessage.WaveformData?.Split(',').Select(int.Parse).ToArray() ?? new int[0],
                            SentAt = voiceMessage.SentAt
                        });
                }
                else if (voiceMessage.GroupId.HasValue)
                {
                    // Group voice message
                    await _hubContext.Clients.Group($"group-{voiceMessage.GroupId}")
                        .SendAsync("ReceiveGroupVoiceMessage", new
                        {
                            Id = voiceMessage.Id,
                            MessageId = voiceMessage.MessageId,
                            SenderId = voiceMessage.SenderId,
                            SenderName = senderName,
                            GroupId = voiceMessage.GroupId,
                            AudioUrl = $"/{voiceMessage.FilePath}",
                            Duration = voiceMessage.Duration,
                            Waveform = voiceMessage.WaveformData?.Split(',').Select(int.Parse).ToArray() ?? new int[0],
                            SentAt = voiceMessage.SentAt
                        });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending voice message notification for message {VoiceMessageId}", voiceMessage.Id);
            }
        }

        private int[] GenerateWaveformData(int duration)
        {
            // Simplified waveform generation
            // In production, use audio analysis library like NAudio or FFMpegCore
            var random = new Random();
            var dataPoints = Math.Min(duration * 2, 100); // 2 points per second, max 100 points
            var waveform = new int[dataPoints];

            for (int i = 0; i < dataPoints; i++)
            {
                // Generate realistic waveform pattern
                var baseLevel = 20 + random.Next(40); // Base level 20-60
                var variation = random.Next(-15, 15); // Variation ±15
                waveform[i] = Math.Max(5, Math.Min(80, baseLevel + variation));
            }

            return waveform;
        }
    }

    // DTOs
    public class VoiceMessageUploadDto
    {
        public IFormFile Audio { get; set; }
        public int Duration { get; set; }
        public int? ReceiverId { get; set; }
        public int? GroupId { get; set; }
    }

    public class VoiceMessageResponseDto
    {
        public int Id { get; set; }
        public int? MessageId { get; set; }
        public string AudioUrl { get; set; }
        public int Duration { get; set; }
        public int[] Waveform { get; set; }
        public DateTime SentAt { get; set; }
        public string SenderName { get; set; }
    }
}