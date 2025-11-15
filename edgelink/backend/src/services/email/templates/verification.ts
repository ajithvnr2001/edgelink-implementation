/**
 * Email Verification Template
 */

export function VerificationEmailTemplate({ verificationUrl }: { verificationUrl: string }): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #f0f0f0;">
    <h1 style="color: #4F46E5; margin: 0;">EdgeLink</h1>
    <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">URL Shortener & Link Management</p>
  </div>

  <div style="padding: 40px 20px;">
    <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">Verify your email address</h2>

    <p style="color: #555; font-size: 16px; margin: 0 0 20px 0;">
      Thanks for signing up for EdgeLink! To complete your registration and start creating short links, please verify your email address.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}"
         style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Verify Email Address
      </a>
    </div>

    <p style="color: #666; font-size: 14px; margin: 30px 0 0 0;">
      Or copy and paste this link into your browser:
    </p>
    <p style="color: #4F46E5; font-size: 13px; word-break: break-all; background: #f8f9fa; padding: 12px; border-radius: 4px; margin: 10px 0 0 0;">
      ${verificationUrl}
    </p>

    <p style="color: #999; font-size: 13px; margin: 30px 0 0 0;">
      This link will expire in 48 hours. Unverified accounts are automatically deleted after 90 days.
    </p>
  </div>

  <div style="border-top: 1px solid #e0e0e0; padding: 20px; text-align: center; color: #999; font-size: 12px;">
    <p style="margin: 0 0 10px 0;">EdgeLink - Smart URL Shortening</p>
    <p style="margin: 0 0 10px 0;">
      <a href="https://shortedbro.xyz" style="color: #4F46E5; text-decoration: none;">Dashboard</a> •
      <a href="https://shortedbro.xyz/help" style="color: #4F46E5; text-decoration: none;">Help Center</a>
    </p>
    <p style="margin: 0; color: #ccc;">© 2025 EdgeLink. All rights reserved.</p>
  </div>

</body>
</html>
  `.trim();
}
