/**
 * Account Deleted Confirmation Email Template
 */

export function AccountDeletedTemplate(data: {
  reason: string;
  deletedAt: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Deleted</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #f0f0f0;">
    <h1 style="color: #6b7280; margin: 0;">EdgeLink</h1>
  </div>

  <div style="padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background: #6b7280; color: white; width: 60px; height: 60px; border-radius: 50%; line-height: 60px; font-size: 30px;">✓</div>
    </div>

    <h2 style="color: #1a1a1a; margin: 0 0 20px 0; text-align: center;">Your Account Has Been Deleted</h2>

    <p style="color: #555; font-size: 15px; margin: 0 0 20px 0;">
      Your EdgeLink account and all associated data have been permanently deleted on ${data.deletedAt}.
    </p>

    <div style="background: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 30px 0; border-radius: 4px;">
      <p style="color: #374151; font-size: 14px; margin: 0;">
        <strong>Reason:</strong> ${data.reason}
      </p>
    </div>

    <h3 style="color: #1a1a1a; font-size: 17px; margin: 30px 0 15px 0;">What was deleted:</h3>
    <ul style="color: #555; font-size: 14px; margin: 0 0 20px 0; padding-left: 20px;">
      <li>Your account and login credentials</li>
      <li>All shortened links</li>
      <li>All analytics data</li>
    </ul>

    <h3 style="color: #1a1a1a; font-size: 17px; margin: 30px 0 15px 0;">Want to use EdgeLink again?</h3>
    <p style="color: #555; font-size: 14px; margin: 0 0 20px 0;">
      You're welcome to create a new account anytime at <a href="https://shortedbro.xyz/signup" style="color: #4F46E5;">shortedbro.xyz</a>
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
