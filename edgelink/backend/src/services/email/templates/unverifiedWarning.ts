/**
 * Unverified Account Warning Email Template
 */

export function UnverifiedWarningTemplate(data: {
  daysUntilDeletion: number;
  loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your account</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #f0f0f0;">
    <h1 style="color: #4F46E5; margin: 0;">EdgeLink</h1>
  </div>

  <div style="padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background: #fbbf24; color: white; width: 60px; height: 60px; border-radius: 50%; line-height: 60px; font-size: 30px;">⚠️</div>
    </div>

    <h2 style="color: #1a1a1a; margin: 0 0 20px 0; text-align: center;">Don't lose your account!</h2>

    <p style="color: #555; font-size: 16px; margin: 0 0 20px 0;">
      You signed up for EdgeLink but never verified your email. Your account will be deleted in <strong>${data.daysUntilDeletion} days</strong> unless you verify now.
    </p>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="color: #92400e; font-size: 14px; margin: 0;">
        <strong>Why are we doing this?</strong> We automatically remove unverified accounts after 90 days to keep our system clean and secure.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.loginUrl}"
         style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Log In & Verify Email
      </a>
    </div>

    <p style="color: #666; font-size: 14px; margin: 30px 0 0 0; text-align: center;">
      If you don't want this account, no action needed. It will be automatically deleted after ${data.daysUntilDeletion} days.
    </p>
  </div>

  <div style="border-top: 1px solid #e0e0e0; padding: 20px; text-align: center; color: #999; font-size: 12px;">
    <p style="margin: 0 0 10px 0;">EdgeLink - Smart URL Shortening</p>
    <p style="margin: 0; color: #ccc;">© 2025 EdgeLink. All rights reserved.</p>
  </div>

</body>
</html>
  `.trim();
}
