# Email Notifications for New Job Applicants

## Overview

This feature implements periodic email notifications for employers when new candidates apply to their job postings. The system checks for new applications every 2-3 hours and sends a summary email to employers only when there are new applicants.

## Key Features

✅ **Summary Email Format**: Employers receive a single email with a summary of all new applicants
✅ **No Zero-Applicant Emails**: Emails are only sent when there are actual new applications
✅ **Periodic Checks**: System checks every 2 hours for new applications
✅ **Per-Job Breakdown**: Email shows how many new applicants each job received
✅ **Tracking**: Tracks the last notification time per employer to avoid duplicate notifications

## Components

### 1. Database Entity (`application-notification.entity.ts`)

Tracks notification state for each employer:
- `employerId`: The employer user ID
- `lastCheckedAt`: Timestamp of the last notification check
- `lastNotificationCount`: Count of applications in the last notification

### 2. Email Template (`new-applicants-summary.hbs`)

Beautiful, responsive email template located at:
`/templates/emails/new-applicants-summary.hbs`

Features:
- Professional gradient header
- Summary box showing total new applicants
- Breakdown by job posting
- Call-to-action button to view applications
- Mobile-responsive design

### 3. Mail Service Method (`mail.service.ts`)

New method: `sendNewApplicantsSummaryEmail()`
- Sends formatted summary emails to employers
- Includes job-specific breakdown
- Configurable dashboard URL via environment variables

### 4. Notification Scheduler (`application-notification.service.ts`)

Core service that handles:
- **Automated Scheduling**: Runs every 2 hours via cron job
- **Employer Detection**: Finds all employers with active jobs
- **New Application Detection**: Queries for applications since last check
- **Email Dispatch**: Sends summary emails only when new applications exist
- **State Tracking**: Updates last check timestamp after sending

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Frontend URL for employers (used in email links)
EMPLOYER_FRONTEND_URL=https://employer.jobtowners.com

# Or use default: https://employer.jobtowners.com
```

### Cron Schedule

The scheduler runs every 2 hours. To modify the schedule, edit the cron expression in `application-notification.service.ts`:

```typescript
@Cron('0 */2 * * *', {  // Every 2 hours
  name: 'check-new-applications',
  timeZone: 'America/Toronto',
})
```

**Cron Expression Examples:**
- `'0 */2 * * *'` - Every 2 hours (current)
- `'0 */3 * * *'` - Every 3 hours
- `'0 */4 * * *'` - Every 4 hours
- `'0 9,12,15,18 * * *'` - At 9am, 12pm, 3pm, 6pm

## Database Migration

Run the migration to create the tracking table:

```bash
mysql -u your_username -p your_database < migrations/create-application-notifications-table.sql
```

Or manually execute the SQL:

```sql
CREATE TABLE IF NOT EXISTS `application_notifications` (
  `id` VARCHAR(36) PRIMARY KEY,
  `employerId` VARCHAR(36) NOT NULL UNIQUE,
  `lastCheckedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastNotificationCount` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`employerId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_employer` (`employerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Installation

### 1. Install Dependencies

```bash
npm install @nestjs/schedule
```

### 2. Run Database Migration

```bash
mysql -u your_user -p your_database < migrations/create-application-notifications-table.sql
```

### 3. Restart Application

```bash
npm run start:dev
```

## How It Works

### Workflow

1. **Scheduled Trigger**: Every 2 hours, the cron job runs automatically
2. **Find Employers**: System identifies all employers with active job postings
3. **Check Each Employer**:
   - Retrieves or creates notification tracking record
   - Queries for applications created since `lastCheckedAt`
   - If new applications found:
     - Groups applications by job
     - Sends summary email
     - Updates `lastCheckedAt` timestamp
   - If no new applications: Does nothing (no email sent)

### Example Email Content

**Subject:** "You have 3 new applicants"

**Body:**
```
Hello John,

Great news! You have received new applications for your job postings.

━━━━━━━━━━━━━━━━━━━━
  3
  new applicants since your last notification
━━━━━━━━━━━━━━━━━━━━

Applications by Job:
• Senior Software Engineer - 2 new applicants
• Marketing Manager - 1 new applicant

[View All Applications]
```

## Testing

### Manual Testing

You can manually trigger a notification check for testing:

```typescript
// In a controller or service
await this.applicationNotificationService.triggerNotificationCheckForEmployer(employerId);
```

### Testing Checklist

- [ ] Create test employer account
- [ ] Post active job(s)
- [ ] Submit applications from candidate accounts
- [ ] Wait for cron job OR manually trigger
- [ ] Verify email received
- [ ] Check email formatting
- [ ] Verify no email sent when no new applications
- [ ] Check database tracking records

## Monitoring

### Logs

The service logs important events:

```
[ApplicationNotificationService] Starting scheduled check for new applications...
[ApplicationNotificationService] Found 5 employers with active jobs
[ApplicationNotificationService] No new applications for employer: john@example.com
[ApplicationNotificationService] Sent notification to jane@example.com for 3 new applications
[ApplicationNotificationService] Completed scheduled check for new applications
```

### Check Cron Job Status

```bash
# View recent logs
pm2 logs your-app-name --lines 100 | grep ApplicationNotificationService

# Or if using systemd
journalctl -u your-service-name | grep ApplicationNotificationService
```

## Customization

### Change Email Template

Edit `/templates/emails/new-applicants-summary.hbs` to customize:
- Colors and styling
- Email content
- Layout structure
- Branding elements

### Adjust Notification Frequency

Modify the cron expression in `application-notification.service.ts`:

```typescript
@Cron('0 */3 * * *', { ... }) // Change to every 3 hours
```

### Filter Job Types

To only notify for specific job types, update the query in `getEmployersWithActiveJobs()`:

```typescript
const activeJobs = await this.jobModel.findAll({
  where: {
    status: 'active',
    jobType: 'full-time', // Add filters
  },
  // ...
});
```

## Troubleshooting

### Emails Not Sending

1. Check mail service configuration
2. Verify SMTP credentials in `.env`
3. Check application logs for errors
4. Ensure `MailModule` is properly imported

### Notifications Not Running

1. Verify `@nestjs/schedule` is installed
2. Check `ScheduleModule.forRoot()` in `app.module.ts`
3. Ensure application is running (cron jobs don't run in stopped apps)
4. Check timezone configuration

### Duplicate Notifications

1. Check `lastCheckedAt` is updating correctly
2. Verify database constraint on `employerId` (should be UNIQUE)
3. Check for multiple app instances (use distributed locking if needed)

### Missing New Applications

1. Verify `lastCheckedAt` timestamp is correct
2. Check application `createdAt` timestamps
3. Ensure timezone consistency

## Production Considerations

### Performance

- The service processes employers sequentially to avoid database overload
- Consider batching for very large numbers of employers (1000+)
- Add rate limiting if needed

### Scalability

For multiple server instances:
1. Use a distributed lock (Redis) to prevent duplicate runs
2. Or designate a single instance for cron jobs
3. Consider a dedicated job queue (Bull, BullMQ)

### Email Deliverability

- Ensure SPF, DKIM, and DMARC records are configured
- Monitor bounce rates
- Use a reputable email service (Mailgun, SendGrid, etc.)

## Future Enhancements

Potential improvements:
- [ ] User preference for notification frequency
- [ ] Digest mode (daily/weekly summaries)
- [ ] Email notification opt-out
- [ ] Real-time notifications via WebSocket
- [ ] SMS notifications
- [ ] Slack/Teams integration
- [ ] Application quality score in notifications

## Support

For issues or questions:
1. Check application logs
2. Review this documentation
3. Contact development team

---

**Version:** 1.0  
**Last Updated:** March 24, 2026  
**Author:** JobTowners Development Team
