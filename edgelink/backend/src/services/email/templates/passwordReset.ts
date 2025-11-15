/**
 * Password Reset Email Template
 */

export function PasswordResetEmailTemplate({ resetUrl, expiryMinutes = 15 }: { resetUrl: string; expiryMinutes?: number }): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #f0f0f0;">
    <h1 style="color: #4F46E5; margin: 0;">EdgeLink</h1>
  </div>

  <div style="padding: 40px 20px;">
    <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">Reset your password</h2>

    <p style="color: #555; font-size: 16px; margin: 0 0 20px 0;">
      You requested to reset your password. Click the button below to create a new password.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}"
         style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Reset Password
      </a>
    </div>

    <p style="color: #666; font-size: 14px; margin: 30px 0 0 0;">
      Or copy and paste this link into your browser:
    </p>
    <p style="color: #4F46E5; font-size: 13px; word-break: break-all; background: #f8f9fa; padding: 12px; border-radius: 4px; margin: 10px 0 0 0;">
      ${resetUrl}
    </p>

    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 30px 0; border-radius: 4px;">
      <p style="color: #856404; font-size: 14px; margin: 0;">
        ⚠️ <strong>Security Notice:</strong> This link will expire in ${expiryMinutes} minutes. If you didn't request this reset, please ignore this email.
      </p>
    </div>
  </div>

  <div style="border-top: 1px solid #e0e0e0; padding: 20px; text-align: center; color: #999; font-size: 12px;">
    <p style="margin: 0 0 10px 0;">EdgeLink - Smart URL Shortening</p>
    <p style="margin: 0; color: #ccc;">© 2025 EdgeLink. All rights reserved.</p>
  </div>

</body>
</html>
  `.trim();
}
