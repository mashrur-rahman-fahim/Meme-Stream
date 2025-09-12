using System;
using System.Security.Claims;

namespace MemeStreamApi.extensions
{
    public static class ClaimsPrincipalExtensions
    {
        public static int GetUserId(this ClaimsPrincipal principal)
        {
            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
            {
                return userId;
            }
            
            // Alternative claim type if the above doesn't work
            userIdClaim = principal.FindFirst("id");
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out userId))
            {
                return userId;
            }
            
            throw new InvalidOperationException("User ID not found in token claims");
        }
        
        public static string GetUserEmail(this ClaimsPrincipal principal)
        {
            var emailClaim = principal.FindFirst(ClaimTypes.Email);
            if (emailClaim != null)
            {
                return emailClaim.Value;
            }
            
            // Alternative claim type
            emailClaim = principal.FindFirst("email");
            if (emailClaim != null)
            {
                return emailClaim.Value;
            }
            
            throw new InvalidOperationException("User email not found in token claims");
        }
        
        public static string GetUsername(this ClaimsPrincipal principal)
        {
            var usernameClaim = principal.FindFirst(ClaimTypes.Name);
            if (usernameClaim != null)
            {
                return usernameClaim.Value;
            }
            
            // Alternative claim type
            usernameClaim = principal.FindFirst("username");
            if (usernameClaim != null)
            {
                return usernameClaim.Value;
            }
            
            throw new InvalidOperationException("Username not found in token claims");
        }
    }
}