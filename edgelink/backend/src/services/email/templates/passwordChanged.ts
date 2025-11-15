/**
 * Password Changed Confirmation Email Template
 */

export function PasswordChangedEmailTemplate({ email }: { email: string }): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Changed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #f0f0f0;">
    <h1 style="color: #4F46E5; margin: 0;">EdgeLink</h1>
  </div>

  <div style="padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background: #10b981; color: white; width: 60px; height: 60px; border-radius: 50%; line-height: 60px; font-size: 30px;">✓</div>
    </div>

    <h2 style="color: #1a1a1a; margin: 0 0 20px 0; text-align: center;">Password Changed Successfully</h2>

    <p style="color: #555; font-size: 16px; margin: 0 0 20px 0;">
      Your EdgeLink password was changed successfully. You can now use your new password to log in.
    </p>

    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 30px 0; border-radius: 4px;">
      <p style="color: #1e40af; font-size: 14px; margin: 0;">
        <strong>Account:</strong> ${email}<br>
        <strong>Changed at:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC
      </p>
    </div>

    <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 30px 0; border-radius: 4px;">
      <p style="color: #991b1b; font-size: 14px; margin: 0;">
        ⚠️ <strong>Didn't change your password?</strong><br>
        If you didn't make this change, please contact support immediately at support@shortedbro.xyz
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://shortedbro.xyz/login"
         style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 14px;">
        Log In Now
      </a>
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
