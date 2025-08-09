using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MemeStreamApi.data;
using MemeStreamApi.model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MemeStreamApi.controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class FriendRequestController
    {
        private readonly MemeStreamDbContext _context;
        public FriendRequestController(MemeStreamDbContext context)
        {
            this._context = context;
        }
        public class FriendRequestDto
        {
            public int SenderId { get; set; }
            public int ReceiverId { get; set; }
        }
        [Authorize]
        [HttpPost("create")]
        public IActionResult CreateFriendRequest([FromBody] FriendRequestDto friendRequestDto){
            try{
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized("User ID claim not found.");
                }
                var userId = int.Parse(userIdClaim);
                var receiver = _context.Users.FirstOrDefault(u => u.Id == friendRequestDto.ReceiverId);
                if (receiver == null)
                {
                    return NotFound("Receiver not found.");
                }
                var friendRequest = new FriendRequest{
                    SenderId = userId,
                    ReceiverId = friendRequestDto.ReceiverId,
                    Status = FriendRequest.RequestStatus.Pending
                };
                _context.FriendRequests.Add(friendRequest);
                _context.SaveChanges();
                return Ok(friendRequest);
            }
            catch (Exception ex){
                Console.WriteLine($"Error in CreateFriendRequest: {ex.Message}");
                return BadRequest("Error creating friend request.");
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
                var friendRequests = _context.FriendRequests.Where(fr => fr.ReceiverId == userId).ToList();
                return Ok(friendRequests);
            }
            catch (Exception ex){
                Console.WriteLine($"Error in GetFriendRequestsByUserId: {ex.Message}");
                return BadRequest("Error retrieving friend requests.");
            }
        }
        [Authorize]
        public IActionResult AcceptFriendRequest(int id){
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
                friendRequest.Status = FriendRequest.RequestStatus.Accepted;
                _context.SaveChanges();
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
                var friends = _context.FriendRequests.Where(fr => fr.ReceiverId == userId && fr.Status == FriendRequest.RequestStatus.Accepted).ToList();
                return Ok(friends);
            }
            catch (Exception ex){
                Console.WriteLine($"Error in GetFriends: {ex.Message}");
                return BadRequest("Error retrieving friends.");
            }
        }
    }
}