using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MemeStreamApi.data;
using MemeStreamApi.model;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FileUploadController : ControllerBase
{
    private readonly MemeStreamDbContext _context;

    public FileUploadController(MemeStreamDbContext context)
    {
        _context = context;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadFile(IFormFile file, int? receiverId, int? groupId)
    {
        try
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var fileName = Path.GetFileName(file.FileName);
            var filePath = Path.Combine("Uploads", Guid.NewGuid() + "_" + fileName);

            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            var chatFile = new ChatFile
            {
                SenderId = userId,
                ReceiverId = receiverId,
                GroupId = groupId,
                FileName = fileName,
                FilePath = filePath
            };

            _context.ChatFiles.Add(chatFile);
            await _context.SaveChangesAsync();

            return Ok(chatFile);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Upload failed: " + ex.Message);
            return StatusCode(500, "Internal Server Error");
        }
    }
}