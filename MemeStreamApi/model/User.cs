using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

namespace MemeStreamApi.model
{
    public class User
    {
        public int Id { get; set; }
        public string Image { get; set; }= string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
        public  required  string Email { get; set; }
        public required string Password { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // public bool IsEmailVerified { get; set; } = false;
        // public string? EmailVerificationToken { get; set; } 
        // public DateTime? EmailVerificationTokenExpiresAt { get; set; }
        // public string? ResetPasswordToken { get; set; }
        // public DateTime? ResetPasswordTokenExpiresAt { get; set; }
       
 
        
    }
}