using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MemeStreamApi.services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string to, string subject, string body,bool isHtml=false);
        Task SendWelcomeEmailAsync(string to, string userName);
        Task SendVerificationEmailAsync(string to, string token);
        Task SendPasswordResetEmailAsync(string to, string token);
    }
}