using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MemeStreamApi.services;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using DotNetEnv;

namespace MemeStreamApi.services
{
    public class EmailService: IEmailService
    {
        public async Task SendEmailAsync(string to, string subject, string body,bool isHtml=false)
        {
            var email= new MimeMessage();
            email.From.Add(new MailboxAddress(
                Env.GetString("SENDER_NAME"),
                Env.GetString("SENDER_EMAIL")
            ));
            email.To.Add(MailboxAddress.Parse(to));
            email.Subject=subject;
           
             var builder=new BodyBuilder();
            if(isHtml)
            {
                builder.HtmlBody=body;
            }
            else 
            {
                builder.TextBody=body;
            }
            email.Body=builder.ToMessageBody();
            using var smtp=new SmtpClient();
            await smtp.ConnectAsync(
                Env.GetString("SMTP_SERVER"),
                int.Parse(Env.GetString("SMTP_PORT")),
                SecureSocketOptions.StartTls
            );
            await smtp.AuthenticateAsync(
                Env.GetString("SMTP_USERNAME"),
                Env.GetString("SMTP_PASSWORD")
            );
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
        }
        public async Task SendWelcomeEmailAsync(string to, string userName)
        {
            var subject= "Welcome to MemeStream";
            var body= $"Hello {userName},<br/>Welcome to MemeStream!<br/>We're excited to have you on board.";
            await SendEmailAsync(to,subject,body,true);
        }
        public async Task SendVerificationEmailAsync(string to, string token)
        {
            var subject = "Verify Your Email - MemeStream";
            var verificationLink = $"{Env.GetString("FRONTEND_URL")}/verify-email?token={token}";
            var body = $@"
                <html>
                <body>
                    <h2>Verify Your Email Address</h2>
                    <p>Please click the link below to verify your email address:</p>
                    <a href='{verificationLink}'>Verify Email</a>
                    <p>Best regards,<br>The MemeStream Team</p>
                </body>
                </html>";

            await SendEmailAsync(to, subject, body, true);

        }
        public async Task SendPasswordResetEmailAsync(string to, string token)
        {
            var subject = "Reset Your Password - MemeStream";
            var resetLink = $"{Env.GetString("FRONTEND_URL")}/reset-password?token={token}";
            var body = $@"
                <html>
                <body>
                    <h2>Reset Your Password</h2>
                    <p>Please click the link below to reset your password:</p>
                    <a href='{resetLink}'>Reset Password</a>
                    <p>If you did not request a password reset, please ignore this email.</p>
                    <p>Best regards,<br>The MemeStream Team</p>
                </body>
                </html>";

            await SendEmailAsync(to, subject, body, true);
        }



        
        
    }
}