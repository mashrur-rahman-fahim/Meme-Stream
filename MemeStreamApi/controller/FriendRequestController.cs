using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MemeStreamApi.data;
using MemeStreamApi.model;
using MemeStreamApi.services;
using MemeStreamApi.hubs;
using MemeStreamApi.extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace MemeStreamApi.controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class FriendRequestController:ControllerBase
    {
        private readonly MemeStreamDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IHubContext<NotificationHub> _hubContext;
        
        public FriendRequestController(MemeStreamDbContext context,
            INotificationService notificationService,
            IHubContext<NotificationHub> hubContext)
        {
            this._context = context;
            this._notificationService = notificationService;
            this._hubContext = hubContext;
        }
        public class FriendRequestDto
        {
           
            public int ReceiverId { get; set; }
        }
        [Authorize]
        [HttpPost("send")]
        public async Task<IActionResult> SendFriendRequest([FromBody] FriendRequestDto friendRequestDto){
            try{
                var userId = User.GetUserId();
                
                if (userId == friendRequestDto.ReceiverId)
                {
                    return BadRequest("You cannot send a friend request to yourself.");
                }
                
                var receiver = await _context.Users.FindAsync(friendRequestDto.ReceiverId);
                if (receiver == null)
                {
                    return NotFound("Receiver not found.");
                }
                
                // Check if friend request already exists in either direction
                var existingFriendRequest = _context.FriendRequests.FirstOrDefault(fr => 
                    (fr.SenderId == userId && fr.ReceiverId == friendRequestDto.ReceiverId) ||
                    (fr.SenderId == friendRequestDto.ReceiverId && fr.ReceiverId == userId));
                    
                if (existingFriendRequest != null)
                {
                    if (existingFriendRequest.Status == FriendRequest.RequestStatus.Accepted)
                    {
                        return BadRequest("You are already friends with this user.");
                    }
                    else if (existingFriendRequest.Status == FriendRequest.RequestStatus.Pending)
                    {
                        return BadRequest("Friend request already exists.");
                    }
                }
                
                var friendRequest = new FriendRequest{
                    SenderId = userId,
                    ReceiverId = friendRequestDto.ReceiverId,
                    Status = FriendRequest.RequestStatus.Pending
                };
                _context.FriendRequests.Add(friendRequest);
                _context.SaveChanges();
                
                // Create notification for receiver
                var senderUser = await _context.Users.FindAsync(userId);
                var notification = await _notificationService.CreateNotificationAsync(
                    friendRequestDto.ReceiverId,
                    "friend_request",
                    $"{senderUser?.Name ?? "Someone"} sent you a friend request",
                    "New Friend Request",
                    userId,
                    null,
                    null,
                    "/friends/requests"
                );
                
                // Send real-time notification
                if (notification != null)
                {
                    await NotificationHub.SendNotificationToUser(_hubContext, friendRequestDto.ReceiverId, new {
                        id = notification.Id,
                        type = notification.Type,
                        message = notification.Message,
                        title = notification.Title,
                        createdAt = notification.CreatedAt,
                        relatedUser = new { id = userId, name = senderUser?.Name, image = senderUser?.Image },
                        actionUrl = notification.ActionUrl
                    });
                }
                
                return Ok(friendRequest);
            }
            catch (Exception ex){
                Console.WriteLine($"Error in SendFriendRequest: {ex.Message}");
                return BadRequest("Error sending friend request.");
            }
        }
        [Authorize]
        [HttpGet("get/friend-requests")]
        public IActionResult GetFriendRequests(){
            try{
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var userId = int.Parse(userIdClaim);
                var friendRequests = _context.FriendRequests
                    .Include(fr => fr.Sender)
                    .Where(fr => fr.ReceiverId == userId && fr.Status == FriendRequest.RequestStatus.Pending)
                    .Select(fr => new {
                        Id = fr.Id,
                        SenderId = fr.SenderId,
                        SenderName = fr.Sender.Name,
                        SenderEmail = fr.Sender.Email,
                        SenderImage = fr.Sender.Image,
                        SenderBio = fr.Sender.Bio,
                        CreatedAt = fr.CreatedAt,
                        Status = fr.Status.ToString()
                    })
                    .ToList();
                return Ok(friendRequests);
            }
            catch (Exception ex){
                Console.WriteLine($"Error in GetFriendRequestsByUserId: {ex.Message}");
                return BadRequest("Error retrieving friend requests.");
            }
        }
        [Authorize]
        [HttpPut("accept/{id}")]
        public async Task<IActionResult> AcceptFriendRequest(int id){
            try{
                var userId = User.GetUserId();
                
                var friendRequest = await _context.FriendRequests
                    .Include(fr => fr.Sender)
                    .Include(fr => fr.Receiver)
                    .FirstOrDefaultAsync(fr => fr.Id == id && fr.ReceiverId == userId);
                    
                if (friendRequest == null)
                {
                    return NotFound("Friend request not found.");
                }
                
                friendRequest.Status = FriendRequest.RequestStatus.Accepted;
                _context.SaveChanges();
                
                // Create notification for sender
                var receiverUser = await _context.Users.FindAsync(userId);
                var notification = await _notificationService.CreateNotificationAsync(
                    friendRequest.SenderId,
                    "friend_request",
                    $"{receiverUser?.Name ?? "Someone"} accepted your friend request",
                    "Friend Request Accepted",
                    userId,
                    null,
                    null,
                    "/friends"
                );
                
                // Send real-time notification
                if (notification != null)
                {
                    await NotificationHub.SendNotificationToUser(_hubContext, friendRequest.SenderId, new {
                        id = notification.Id,
                        type = notification.Type,
                        message = notification.Message,
                        title = notification.Title,
                        createdAt = notification.CreatedAt,
                        relatedUser = new { id = userId, name = receiverUser?.Name, image = receiverUser?.Image },
                        actionUrl = notification.ActionUrl
                    });
                }
                
                return Ok(friendRequest);
            }
            catch (Exception ex){
                Console.WriteLine($"Error in AcceptFriendRequest: {ex.Message}");
                return BadRequest("Error accepting friend request.");
            }
        }
        [Authorize]
        [HttpDelete("delete/{id}")]
        public IActionResult DeleteFriendRequest(int id){
            try{
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var userId = int.Parse(userIdClaim);
                var friendRequest = _context.FriendRequests.FirstOrDefault(fr => fr.Id == id && fr.ReceiverId == userId);
                if (friendRequest == null)
                {
                    return NotFound("Friend request not found.");
                }
                _context.FriendRequests.Remove(friendRequest);
                _context.SaveChanges();
                return Ok("Friend request deleted successfully.");
            }
            catch (Exception ex){
                Console.WriteLine($"Error in DeleteFriendRequest: {ex.Message}");
                return BadRequest("Error deleting friend request.");
            }
        }
        [Authorize]
        [HttpGet("get/friends")]
        public IActionResult GetFriends(){
            try{
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var userId = int.Parse(userIdClaim);
                var friends = _context.FriendRequests
                    .Include(fr => fr.Sender)
                    .Include(fr => fr.Receiver)
                    .Where(fr => (fr.ReceiverId == userId || fr.SenderId == userId) && fr.Status == FriendRequest.RequestStatus.Accepted)
                    .Select(fr => new {
                        Id = fr.Id,
                        FriendId = fr.ReceiverId == userId ? fr.SenderId : fr.ReceiverId,
                        FriendName = fr.ReceiverId == userId ? fr.Sender.Name : fr.Receiver.Name,
                        FriendEmail = fr.ReceiverId == userId ? fr.Sender.Email : fr.Receiver.Email,
                        FriendImage = fr.ReceiverId == userId ? fr.Sender.Image : fr.Receiver.Image,
                        FriendBio = fr.ReceiverId == userId ? fr.Sender.Bio : fr.Receiver.Bio,
                        CreatedAt = fr.CreatedAt,
                        Status = fr.Status.ToString()
                    })
                    .ToList();
                return Ok(friends);
            }
            catch (Exception ex){
                Console.WriteLine($"Error in GetFriends: {ex.Message}");
                return BadRequest("Error retrieving friends.");
            }
        }

        [Authorize]
        [HttpGet("search-users/{query}")]
        public IActionResult SearchUsersForFriendRequest(string query)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var userId = int.Parse(userIdClaim);

                if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
                {
                    return BadRequest("Search query must be at least 2 characters long.");
                }

                // Get all friend request relationships for current user
                var friendshipData = _context.FriendRequests
                    .Where(fr => (fr.SenderId == userId || fr.ReceiverId == userId))
                    .Select(fr => new {
                        OtherUserId = fr.SenderId == userId ? fr.ReceiverId : fr.SenderId,
                        Status = fr.Status,
                        IsSender = fr.SenderId == userId
                    })
                    .ToList();

                // Create lookup dictionary for friendship status
                var friendshipLookup = friendshipData.ToDictionary(
                    f => f.OtherUserId,
                    f => new { f.Status, f.IsSender }
                );

                // Search for users excluding current user only
                var users = _context.Users
                    .Where(u => u.Id != userId && 
                               u.Name.ToLower().Contains(query.ToLower()) &&
                               u.IsEmailVerified) // Only include verified users
                    .Select(u => new {
                        Id = u.Id,
                        Name = u.Name,
                        Email = u.Email,
                        Image = u.Image,
                        Bio = u.Bio
                    })
                    .Take(20) // Limit results for performance
                    .ToList()
                    .Select(u => {
                        var friendshipStatus = "None";
                        var canSendRequest = true;
                        
                        if (friendshipLookup.ContainsKey(u.Id))
                        {
                            var friendship = friendshipLookup[u.Id];
                            switch (friendship.Status)
                            {
                                case FriendRequest.RequestStatus.Accepted:
                                    friendshipStatus = "Friend";
                                    canSendRequest = false;
                                    break;
                                case FriendRequest.RequestStatus.Pending:
                                    friendshipStatus = friendship.IsSender ? "Request Sent" : "Request Received";
                                    canSendRequest = false;
                                    break;
                                case FriendRequest.RequestStatus.Rejected:
                                    friendshipStatus = "Request Declined";
                                    canSendRequest = true;
                                    break;
                            }
                        }

                        return new {
                            u.Id,
                            u.Name,
                            u.Email,
                            u.Image,
                            u.Bio,
                            FriendshipStatus = friendshipStatus,
                            CanSendRequest = canSendRequest
                        };
                    })
                    .ToList();

                return Ok(users);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SearchUsersForFriendRequest: {ex.Message}");
                return BadRequest("Error searching users.");
            }
        }

        [Authorize]
        [HttpDelete("unfriend/{friendId}")]
        public IActionResult UnfriendUser(int friendId)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var userId = int.Parse(userIdClaim);

                if (userId == friendId)
                {
                    return BadRequest("You cannot unfriend yourself.");
                }

                // Find the friendship (could be in either direction)
                var friendship = _context.FriendRequests.FirstOrDefault(fr => 
                    ((fr.SenderId == userId && fr.ReceiverId == friendId) ||
                     (fr.SenderId == friendId && fr.ReceiverId == userId)) &&
                    fr.Status == FriendRequest.RequestStatus.Accepted);

                if (friendship == null)
                {
                    return NotFound("Friendship not found or users are not friends.");
                }

                // Remove the friendship record
                _context.FriendRequests.Remove(friendship);
                _context.SaveChanges();

                return Ok("Friend removed successfully.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UnfriendUser: {ex.Message}");
                return BadRequest("Error removing friend.");
            }
        }

        [Authorize]
        [HttpGet("search-friends/{query}")]
        public IActionResult SearchFriends(string query)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var userId = int.Parse(userIdClaim);

                if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
                {
                    return BadRequest("Search query must be at least 2 characters long.");
                }

                // Search only among current user's friends
                var friends = _context.FriendRequests
                    .Include(fr => fr.Sender)
                    .Include(fr => fr.Receiver)
                    .Where(fr => (fr.ReceiverId == userId || fr.SenderId == userId) && 
                                fr.Status == FriendRequest.RequestStatus.Accepted)
                    .Select(fr => new {
                        Friend = fr.ReceiverId == userId ? fr.Sender : fr.Receiver,
                        FriendId = fr.ReceiverId == userId ? fr.SenderId : fr.ReceiverId
                    })
                    .Where(f => f.Friend.Name.ToLower().Contains(query.ToLower()))
                    .Select(f => new {
                        Id = f.FriendId,
                        Name = f.Friend.Name,
                        Email = f.Friend.Email,
                        Image = f.Friend.Image,
                        Bio = f.Friend.Bio,
                        FriendshipStatus = "Friend"
                    })
                    .Take(20) // Limit results for performance
                    .ToList();

                return Ok(friends);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SearchFriends: {ex.Message}");
                return BadRequest("Error searching friends.");
            }
        }

        [Authorize]
        [HttpPost("accept")]
        public IActionResult AcceptFriendRequestBySender([FromBody] AcceptDeclineRequestDto dto)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var receiverId = int.Parse(userIdClaim);
                
                var friendRequest = _context.FriendRequests.FirstOrDefault(fr => 
                    fr.SenderId == dto.SenderId && fr.ReceiverId == receiverId && fr.Status == FriendRequest.RequestStatus.Pending);
                
                if (friendRequest == null)
                {
                    return NotFound("Friend request not found.");
                }
                
                friendRequest.Status = FriendRequest.RequestStatus.Accepted;
                _context.SaveChanges();
                
                return Ok(new { message = "Friend request accepted successfully." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in AcceptFriendRequestBySender: {ex.Message}");
                return BadRequest("Error accepting friend request.");
            }
        }

        [Authorize]
        [HttpPost("decline")]
        public IActionResult DeclineFriendRequestBySender([FromBody] AcceptDeclineRequestDto dto)
        {
            try
            {
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var receiverId = int.Parse(userIdClaim);
                
                var friendRequest = _context.FriendRequests.FirstOrDefault(fr => 
                    fr.SenderId == dto.SenderId && fr.ReceiverId == receiverId && fr.Status == FriendRequest.RequestStatus.Pending);
                
                if (friendRequest == null)
                {
                    return NotFound("Friend request not found.");
                }
                
                friendRequest.Status = FriendRequest.RequestStatus.Rejected;
                _context.SaveChanges();
                
                return Ok(new { message = "Friend request declined successfully." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in DeclineFriendRequestBySender: {ex.Message}");
                return BadRequest("Error declining friend request.");
            }
        }

        public class AcceptDeclineRequestDto
        {
            public int SenderId { get; set; }
        }
    }
}