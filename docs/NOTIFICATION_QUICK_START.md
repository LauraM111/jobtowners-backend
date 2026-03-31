# Employer Notification System - Quick Start Guide

## ✅ System Status

The employer notification system is **FULLY IMPLEMENTED** and ready to use!

## 🎯 What It Does

Automatically emails employers every 2 hours when new candidates apply to their job postings. The email includes:
- Total number of new applicants
- Breakdown by job posting
- Direct link to employer dashboard

## 🚀 Quick Setup (Already Done!)

### 1. Database Table ✅
The `application_notifications` table has been created in your database.

### 2. Environment Variables ✅
Added to `.env`:
```bash
EMPLOYER_FRONTEND_URL=https://employer.jobtowners.com
ADMIN_FRONTEND_URL=https://admin.jobtowners.com
```

### 3. Dependencies Installed ✅
`@nestjs/schedule` is installed and configured.

### 4. Build Successful ✅
Project builds without errors.

## 🧪 Testing the System

### Method 1: Test for Current Employer (Recommended)

1. Log in as an employer and get your JWT token
2. Make a POST request:

```bash
curl -X POST http://localhost:8080/job-applications/test/trigger-notification-check \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Notification check completed"
}
```

### Method 2: Test All Employers (Admin Only)

1. Log in as admin and get your JWT token
2. Make a POST request:

```bash
curl -X POST http://localhost:8080/job-applications/test/trigger-all-notifications \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Method 3: Wait for Automatic Execution

The cron job runs automatically every 2 hours:
- 12:00 AM, 2:00 AM, 4:00 AM, 6:00 AM, etc.
- Timezone: America/Toronto

## 📋 Test Scenario Walkthrough

### Complete Test Flow:

1. **Create an employer account** (if not exists)
   ```
   POST /auth/register
   Body: { email, password, userType: "employer", ... }
   ```

2. **Create a job posting**
   ```
   POST /jobs
   Body: { jobTitle, jobDescription, ... }
   Status: Set to "active"
   ```

3. **Have a candidate apply** (use a different account)
   ```
   POST /job-applications
   Body: { jobId, resumeId, coverLetter }
   ```

4. **Trigger notification manually** (as employer)
   ```
   POST /job-applications/test/trigger-notification-check
   ```

5. **Check email inbox** - Employer should receive summary email

6. **Verify database tracking**
   ```sql
   SELECT * FROM application_notifications 
   WHERE employerId = 'your-employer-uuid';
   ```

## 📧 Email Configuration

The system uses Mailgun SMTP for sending emails. Current configuration in `.env`:
```
MAILGUN_SMTP_HOST=smtp.mailgun.org
MAILGUN_SMTP_PORT=2525
MAILGUN_SMTP_USERNAME=postmaster@jobtowners.com
MAIL_FROM_ADDRESS=no-reply@jobtowners.com
MAIL_FROM_NAME=JobTowners
```

### Email Template Location
`templates/emails/new-applicants-summary.hbs`

## 🔍 Monitoring

### Check Logs

Watch application logs for these messages:
```
[ApplicationNotificationService] Starting scheduled check for new applications...
[ApplicationNotificationService] Found X employers with active jobs
[ApplicationNotificationService] Sent notification to email@example.com for X new applications
[ApplicationNotificationService] Completed scheduled check for new applications
```

### Database Queries

**View all notification records:**
```sql
SELECT 
  an.*,
  u.email,
  u.firstName
FROM application_notifications an
JOIN users u ON an.employerId = u.id
ORDER BY an.updatedAt DESC;
```

**Check pending notifications:**
```sql
SELECT 
  u.email,
  u.firstName,
  COUNT(ja.id) as pending_count,
  COALESCE(an.lastCheckedAt, '2024-01-01') as last_checked
FROM users u
JOIN jobs j ON j.userId = u.id
JOIN job_applications ja ON ja.jobId = j.id
LEFT JOIN application_notifications an ON an.employerId = u.id
WHERE ja.createdAt > COALESCE(an.lastCheckedAt, '2024-01-01')
  AND u.userType = 'employer'
  AND u.isActive = 1
  AND j.status = 'active'
GROUP BY u.id
HAVING pending_count > 0;
```

## ⚙️ Configuration

### Change Notification Frequency

Edit `src/modules/job-application/application-notification.service.ts`:

```typescript
@Cron('0 */2 * * *', {  // ← Change this line
  name: 'check-new-applications',
  timeZone: 'America/Toronto',
})
```

**Common Patterns:**
- Every hour: `'0 * * * *'`
- Every 3 hours: `'0 */3 * * *'`
- Every 6 hours: `'0 */6 * * *'`
- Twice daily (9am, 5pm): `'0 9,17 * * *'`
- Once daily at 9am: `'0 9 * * *'`

### Change Timezone

Modify the `timeZone` option:
```typescript
timeZone: 'America/New_York',  // or 'UTC', 'Europe/London', etc.
```

## 🐛 Troubleshooting

### Notifications Not Sending

**Check 1: Application is running**
```bash
ps aux | grep node
```
The NestJS application must be running continuously for cron jobs to work.

**Check 2: Cron job is scheduled**
Look for this log on application startup:
```
[ScheduleModule] Scheduling Cron Job "check-new-applications"
```

**Check 3: Email configuration**
Test email sending:
```bash
curl -X POST http://localhost:8080/mail/test \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com"}'
```

**Check 4: Active employers and jobs**
```sql
SELECT COUNT(*) FROM users WHERE userType = 'employer' AND isActive = 1;
SELECT COUNT(*) FROM jobs WHERE status = 'active';
```

### Email Not Received

1. Check spam folder
2. Verify Mailgun dashboard for delivery status
3. Check email address is correct in user profile
4. Review application logs for email errors

### Database Errors

If you get errors about missing table:
```bash
mysql -uroot -pAdmin@1234 jobtowners < migrations/create-application-notifications-table.sql
```

## 📝 Code Locations

| Component | File Path |
|-----------|-----------|
| Service | `src/modules/job-application/application-notification.service.ts` |
| Entity | `src/modules/job-application/entities/application-notification.entity.ts` |
| Controller Endpoints | `src/modules/job-application/job-application.controller.ts` (lines 500-533) |
| Module Registration | `src/modules/job-application/job-application.module.ts` |
| Email Template | `templates/emails/new-applicants-summary.hbs` |
| Mail Service | `src/modules/mail/mail.service.ts` (lines 394-425) |
| Database Migration | `migrations/create-application-notifications-table.sql` |

## 📚 Additional Documentation

For detailed architecture, database schema, and advanced configuration, see:
- `docs/NOTIFICATION_SYSTEM.md` - Complete technical documentation

## ✨ Features

- ✅ Automatic periodic checks (every 2 hours)
- ✅ Grouped by job posting
- ✅ Beautiful HTML email template
- ✅ Tracks last notification time per employer
- ✅ Only sends when there are new applications
- ✅ Manual trigger endpoints for testing
- ✅ Admin endpoint to trigger for all employers
- ✅ Database tracking to prevent duplicates
- ✅ Professional logging

## 🎉 Next Steps

1. **Test the system** using the test endpoints above
2. **Monitor logs** to ensure cron jobs are running
3. **Check Mailgun dashboard** for email delivery metrics
4. **Adjust frequency** if needed (currently 2 hours)
5. **Consider adding**:
   - User preferences for notification frequency
   - SMS notifications
   - In-app notifications
   - Daily/weekly digest options

## 🆘 Support

If you encounter any issues:

1. Check application logs: `tail -f logs/application.log`
2. Verify environment variables are loaded
3. Test email configuration with test endpoint
4. Review this document's troubleshooting section
5. Check `docs/NOTIFICATION_SYSTEM.md` for advanced debugging

---

**Last Updated:** March 31, 2026  
**System Version:** 1.0  
**Status:** ✅ Production Ready
