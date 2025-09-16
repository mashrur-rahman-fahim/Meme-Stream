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
    public class MediaController : ControllerBase
    {
        private readonly MemeStreamDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<MediaController> _logger;
        private readonly IHubContext<ChatHub> _hubContext;

        private const long MaxFileSize = 100 * 1024 * 1024; // 100MB
        private readonly string[] AllowedImageTypes = { "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp" };
        private readonly string[] AllowedVideoTypes = { "video/mp4", "video/webm", "video/avi", "video/mov", "video/mkv" };

        public MediaController(
            MemeStreamDbContext context,
            IWebHostEnvironment environment,
            ILogger<MediaController> logger,
            IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _environment = environment;
            _logger = logger;
            _hubContext = hubContext;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadMedia([FromForm] MediaUploadDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

                // Validate file
                if (dto.File == null || dto.File.Length == 0)
                {
                    return BadRequest(new { message = "No file provided" });
                }

                if (dto.File.Length > MaxFileSize)
                {
                    return BadRequest(new { message = $"File size exceeds maximum limit of {MaxFileSize / (1024 * 1024)}MB" });
                }

                var contentType = dto.File.ContentType.ToLower();
                var mediaType = dto.Type?.ToLower() ?? DetermineMediaType(contentType);

                if (mediaType == "image" && !AllowedImageTypes.Contains(contentType))
                {
                    return BadRequest(new { message = "Invalid image format. Supported formats: JPEG, PNG, GIF, WebP" });
                }

                if (mediaType == "video" && !AllowedVideoTypes.Contains(contentType))
                {
                    return BadRequest(new { message = "Invalid video format. Supported formats: MP4, WebM, AVI, MOV, MKV" });
                }

                // Validate chat permissions
                if (dto.ReceiverId.HasValue)
                {
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
                var uploadsPath = Path.Combine(_environment.WebRootPath, "uploads", "media");
                if (!Directory.Exists(uploadsPath))
                {
                    Directory.CreateDirectory(uploadsPath);
                }

                // Generate unique filename
                var fileExtension = Path.GetExtension(dto.File.FileName);
                var fileName = $"{Guid.NewGuid()}{fileExtension}";
                var filePath = Path.Combine(uploadsPath, fileName);

                // Save original file
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.File.CopyToAsync(stream);
                }

                string? thumbnailPath = null;
                int? width = null;
                int? height = null;

                // Generate thumbnail for images and videos
                if (mediaType == "image")
                {
                    var imageInfo = await GenerateImageThumbnail(filePath, fileName);
                    thumbnailPath = imageInfo.ThumbnailPath;
                    width = imageInfo.Width;
                    height = imageInfo.Height;
                }
                else if (mediaType == "video")
                {
                    thumbnailPath = await GenerateVideoThumbnail(filePath, fileName);
                }

                // Create media message record
                var mediaMessage = new MediaMessage
                {
                    SenderId = userId,
                    ReceiverId = dto.ReceiverId,
                    GroupId = dto.GroupId,
                    FileName = dto.File.FileName,
                    FilePath = $"uploads/media/{fileName}",
                    ThumbnailPath = thumbnailPath,
                    MediaType = mediaType,
                    FileSize = dto.File.Length,
                    Width = width,
                    Height = height,
                    SentAt = DateTime.UtcNow
                };

                _context.MediaMessages.Add(mediaMessage);

                // Create corresponding message entry
                var message = new Message
                {
                    SenderId = userId,
                    ReceiverId = dto.ReceiverId,
                    GroupId = dto.GroupId,
                    Content = $"{GetMediaIcon(mediaType)} {mediaType.Substring(0, 1).ToUpper() + mediaType.Substring(1)}",
                    SentAt = DateTime.UtcNow,
                    // MessageType and MediaMessageId properties don't exist in Message model yet
                    // TODO: Add these properties to support media messages
                };

                _context.Messages.Add(message);
                await _context.SaveChangesAsync();

                // Update media message with message ID
                mediaMessage.MessageId = message.Id;
                await _context.SaveChangesAsync();

                // Send real-time notification
                await SendMediaMessageNotification(mediaMessage);

                _logger.LogInformation("Media uploaded successfully. ID: {MediaMessageId}, Type: {MediaType}, Sender: {UserId}",
                    mediaMessage.Id, mediaType, userId);

                return Ok(new MediaMessageResponseDto
                {
                    Id = mediaMessage.Id,
                    MessageId = message.Id,
                    MediaUrl = $"/uploads/media/{fileName}",
                    ThumbnailUrl = thumbnailPath != null ? $"/{thumbnailPath}" : null,
                    MediaType = mediaType,
                    FileName = dto.File.FileName,
                    FileSize = dto.File.Length,
                    Width = width,
                    Height = height,
                    SentAt = mediaMessage.SentAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading media for user {UserId}",
                    User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
                return StatusCode(500, new { message = "An error occurred while uploading the media" });
            }
        }

        [HttpGet("gallery/{chatId}")]
        public async Task<IActionResult> GetMediaGallery(string chatId, [FromQuery] string type = "all", [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
                var isGroup = chatId.StartsWith("group-");

                IQueryable<MediaMessage> query;

                if (isGroup)
                {
                    var groupId = int.Parse(chatId.Replace("group-", ""));

                    // Check if user is member
                    var membership = await _context.GroupMemberships
                        .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == userId);

                    if (membership == null)
                    {
                        return Forbid();
                    }

                    query = _context.MediaMessages
                        .Where(mm => mm.GroupId == groupId && !mm.IsDeleted);
                }
                else
                {
                    var receiverId = int.Parse(chatId);

                    // Check if users are friends
                    var friendship = await _context.Friendships
                        .FirstOrDefaultAsync(f =>
                            (f.UserId == userId && f.FriendId == receiverId) ||
                            (f.UserId == receiverId && f.FriendId == userId));

                    if (friendship == null)
                    {
                        return Forbid();
                    }

                    query = _context.MediaMessages
                        .Where(mm =>
                            ((mm.SenderId == userId && mm.ReceiverId == receiverId) ||
                             (mm.SenderId == receiverId && mm.ReceiverId == userId)) &&
                            !mm.IsDeleted);
                }

                // Filter by media type
                if (type != "all")
                {
                    query = query.Where(mm => mm.MediaType == type);
                }

                // Apply pagination
                var totalCount = await query.CountAsync();
                var mediaItems = await query
                    .Include(mm => mm.Sender)
                    .OrderByDescending(mm => mm.SentAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(mm => new MediaGalleryItemDto
                    {
                        Id = mm.Id,
                        MessageId = mm.MessageId,
                        MediaUrl = $"/{mm.FilePath}",
                        ThumbnailUrl = mm.ThumbnailPath != null ? $"/{mm.ThumbnailPath}" : null,
                        MediaType = mm.MediaType,
                        FileName = mm.FileName,
                        FileSize = mm.FileSize,
                        Width = mm.Width,
                        Height = mm.Height,
                        SentAt = mm.SentAt,
                        SenderName = mm.Sender.Name
                    })
                    .ToListAsync();

                return Ok(new
                {
                    Items = mediaItems,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving media gallery for chat {ChatId}", chatId);
                return StatusCode(500, new { message = "An error occurred while retrieving the media gallery" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMedia(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

                var mediaMessage = await _context.MediaMessages
                    .FirstOrDefaultAsync(mm => mm.Id == id);

                if (mediaMessage == null)
                {
                    return NotFound(new { message = "Media not found" });
                }

                // Only sender can delete
                if (mediaMessage.SenderId != userId)
                {
                    return Forbid();
                }

                // Delete files from storage
                var fullPath = Path.Combine(_environment.WebRootPath, mediaMessage.FilePath);
                if (System.IO.File.Exists(fullPath))
                {
                    System.IO.File.Delete(fullPath);
                }

                if (!string.IsNullOrEmpty(mediaMessage.ThumbnailPath))
                {
                    var thumbnailFullPath = Path.Combine(_environment.WebRootPath, mediaMessage.ThumbnailPath);
                    if (System.IO.File.Exists(thumbnailFullPath))
                    {
                        System.IO.File.Delete(thumbnailFullPath);
                    }
                }

                // Mark as deleted in database
                mediaMessage.IsDeleted = true;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Media deleted. ID: {MediaMessageId}, User: {UserId}", id, userId);

                return Ok(new { message = "Media deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting media {MediaMessageId}", id);
                return StatusCode(500, new { message = "An error occurred while deleting the media" });
            }
        }

        private string DetermineMediaType(string contentType)
        {
            if (AllowedImageTypes.Contains(contentType))
                return "image";
            if (AllowedVideoTypes.Contains(contentType))
                return "video";
            return "file";
        }

        private string GetMediaIcon(string mediaType)
        {
            return mediaType switch
            {
                "image" => "🖼️",
                "video" => "🎥",
                "audio" => "🎵",
                _ => "📎"
            };
        }

        private async Task<(string? ThumbnailPath, int Width, int Height)> GenerateImageThumbnail(string imagePath, string fileName)
        {
            try
            {
                var thumbnailsPath = Path.Combine(_environment.WebRootPath, "uploads", "thumbnails");
                if (!Directory.Exists(thumbnailsPath))
                {
                    Directory.CreateDirectory(thumbnailsPath);
                }

                var thumbnailFileName = $"thumb_{fileName}";
                var thumbnailPath = Path.Combine(thumbnailsPath, thumbnailFileName);

                // For now, just copy the original image as thumbnail
                // In production, use ImageSharp or System.Drawing to resize
                await Task.Run(() => System.IO.File.Copy(imagePath, thumbnailPath, true));

                // Return placeholder dimensions - in production, read actual image dimensions
                return ($"uploads/thumbnails/{thumbnailFileName}", 800, 600);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating image thumbnail for {FileName}", fileName);
                return (null, 0, 0);
            }
        }

        private async Task<string?> GenerateVideoThumbnail(string videoPath, string fileName)
        {
            try
            {
                // This is a placeholder. In production, use FFMpegCore or similar library
                // to extract video thumbnail at a specific timestamp

                var thumbnailsPath = Path.Combine(_environment.WebRootPath, "uploads", "thumbnails");
                if (!Directory.Exists(thumbnailsPath))
                {
                    Directory.CreateDirectory(thumbnailsPath);
                }

                var thumbnailFileName = $"thumb_{Path.GetFileNameWithoutExtension(fileName)}.jpg";
                var thumbnailPath = Path.Combine(thumbnailsPath, thumbnailFileName);

                // For now, create a placeholder file
                // In production, use FFMpegCore: FFMpeg.Snapshot(videoPath, thumbnailPath, TimeSpan.FromSeconds(1));
                await Task.Run(() => System.IO.File.WriteAllText(thumbnailPath + ".placeholder", "Video thumbnail placeholder"));

                // Return null for now since we can't generate actual thumbnails without additional libraries
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating video thumbnail for {FileName}", fileName);
                return null;
            }
        }

        private async Task SendMediaMessageNotification(MediaMessage mediaMessage)
        {
            try
            {
                var senderName = await _context.Users
                    .Where(u => u.Id == mediaMessage.SenderId)
                    .Select(u => u.Name)
                    .FirstOrDefaultAsync();

                var mediaData = new
                {
                    Id = mediaMessage.Id,
                    MessageId = mediaMessage.MessageId,
                    SenderId = mediaMessage.SenderId,
                    SenderName = senderName,
                    MediaUrl = $"/{mediaMessage.FilePath}",
                    ThumbnailUrl = mediaMessage.ThumbnailPath != null ? $"/{mediaMessage.ThumbnailPath}" : null,
                    MediaType = mediaMessage.MediaType,
                    FileName = mediaMessage.FileName,
                    FileSize = mediaMessage.FileSize,
                    Width = mediaMessage.Width,
                    Height = mediaMessage.Height,
                    SentAt = mediaMessage.SentAt
                };

                if (mediaMessage.ReceiverId.HasValue)
                {
                    await _hubContext.Clients.User(mediaMessage.ReceiverId.Value.ToString())
                        .SendAsync("ReceiveMediaMessage", mediaData);
                }
                else if (mediaMessage.GroupId.HasValue)
                {
                    await _hubContext.Clients.Group($"group-{mediaMessage.GroupId}")
                        .SendAsync("ReceiveGroupMediaMessage", new {
                            GroupId = mediaMessage.GroupId,
                            Id = mediaData.Id,
                            MessageId = mediaData.MessageId,
                            SenderId = mediaData.SenderId,
                            SenderName = mediaData.SenderName,
                            MediaUrl = mediaData.MediaUrl,
                            ThumbnailUrl = mediaData.ThumbnailUrl,
                            MediaType = mediaData.MediaType,
                            FileName = mediaData.FileName,
                            FileSize = mediaData.FileSize,
                            Width = mediaData.Width,
                            Height = mediaData.Height,
                            SentAt = mediaData.SentAt
                        });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending media message notification for message {MediaMessageId}", mediaMessage.Id);
            }
        }
    }

    // DTOs
    public class MediaUploadDto
    {
        public IFormFile File { get; set; }
        public string? Type { get; set; }
        public int? ReceiverId { get; set; }
        public int? GroupId { get; set; }
    }

    public class MediaMessageResponseDto
    {
        public int Id { get; set; }
        public int? MessageId { get; set; }
        public string MediaUrl { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string MediaType { get; set; }
        public string FileName { get; set; }
        public long FileSize { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }
        public DateTime SentAt { get; set; }
    }

    public class MediaGalleryItemDto
    {
        public int Id { get; set; }
        public int? MessageId { get; set; }
        public string MediaUrl { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string MediaType { get; set; }
        public string FileName { get; set; }
        public long FileSize { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }
        public DateTime SentAt { get; set; }
        public string SenderName { get; set; }
    }
}