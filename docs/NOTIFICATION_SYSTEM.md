# Employer Notification System

## Overview
The JobTowners platform includes an automated notification system that alerts employers when new candidates apply to their job postings. Notifications are sent periodically to avoid overwhelming employers with individual emails for each application.

## Features

### Automated Scheduled Notifications
- **Frequency**: Every 2 hours (configurable)
- **Cron Schedule**: `0 */2 * * *` (runs at :00 minutes of every 2nd hour)
- **Timezone**: America/Toronto
- **Smart Tracking**: Only sends notifications for new applications since the last check

### Email Content
Employers receive a beautifully formatted email containing:
- Total number of new applicants
- Breakdown of applications by job posting
- Job titles with applicant counts
- Direct link to employer dashboard
- Professional HTML design with gradient styling

### Database Tracking
The system maintains a `application_notifications` table that tracks:
- `employerId`: UUID of the employer
- `lastCheckedAt`: Timestamp of last notification check
- `lastNotificationCount`: Number of applications in last notification
- `createdAt` / `updatedAt`: Standard timestamp fields

## Architecture

### Components

#### 1. ApplicationNotificationService
**Location**: `src/modules/job-application/application-notification.service.ts`

**Key Methods**:
- `checkForNewApplications()`: Main cron job method that runs every 2 hours
- `getEmployersWithActiveJobs()`: Retrieves all employers with active job postings
- `processEmployerNotifications(employer)`: Processes notifications for a specific employer
- `triggerNotificationCheckForEmployer(employerId)`: Manual trigger for testing

**Logic Flow**:
1. Find all employers with active jobs
2. For each employer:
   - Get or create notification tracking record
   - Find all jobs by employer
   - Query new applications since `lastCheckedAt`
   - Group applications by job
   - Send summary email if new applications exist
   - Update notification tracking record

#### 2. ApplicationNotification Entity
**Location**: `src/modules/job-application/entities/application-notification.entity.ts`

**Schema**:
```typescript
{
  id: UUID (Primary Key)
  employerId: UUID (Foreign Key -> User, Unique)
  lastCheckedAt: DateTime
  lastNotificationCount: Integer
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### 3. Email Template
**Location**: `templates/emails/new-applicants-summary.hbs`

**Template Variables**:
- `employerName`: Employer's first name
- `totalNewApplicants`: Total count of new applicants
- `jobs`: Array of job objects with:
  - `jobTitle`: Job posting title
  - `newApplicants`: Number of new applicants for this job
- `dashboardUrl`: Link to employer dashboard
- `year`: Current year for footer

#### 4. Mail Service
**Location**: `src/modules/mail/mail.service.ts`

**Method**: `sendNewApplicantsSummaryEmail(employer, applicationsSummary)`
- Uses Handlebars template engine
- Sends via Mailgun SMTP
- Returns boolean indicating success/failure

## Configuration

### Environment Variables

Required variables in `.env`:
```bash
# Email Configuration
MAILGUN_SMTP_HOST=smtp.mailgun.org
MAILGUN_SMTP_PORT=2525
MAILGUN_SMTP_USERNAME=postmaster@jobtowners.com
MAILGUN_SMTP_PASSWORD=your_password
MAIL_FROM_NAME=JobTowners
MAIL_FROM_ADDRESS=no-reply@jobtowners.com

# Frontend URLs
EMPLOYER_FRONTEND_URL=https://employer.jobtowners.com
```

### Cron Schedule Customization

To change the notification frequency, modify the cron expression in `application-notification.service.ts`:

```typescript
@Cron('0 */2 * * *', {  // Current: Every 2 hours
  name: 'check-new-applications',
  timeZone: 'America/Toronto',
})
```

**Common Patterns**:
- Every hour: `0 * * * *`
- Every 3 hours: `0 */3 * * *`
- Every 6 hours: `0 */6 * * *`
- Twice daily (9am, 5pm): `0 9,17 * * *`

## Testing

### Manual Testing Endpoints

#### 1. Test Current Employer's Notifications
```bash
POST /job-applications/test/trigger-notification-check
Authorization: Bearer <employer_jwt_token>
```

**Response**:
```json
{
  "success": true,
  "message": "Notification check completed"
}
```

#### 2. Test All Employers (Admin Only)
```bash
POST /job-applications/test/trigger-all-notifications
Authorization: Bearer <admin_jwt_token>
```

**Response**:
```json
{
  "success": true,
  "message": "Notification check triggered for all employers successfully"
}
```

### Testing Checklist

1. ✅ Create test employer account
2. ✅ Create active job posting
3. ✅ Have candidate apply to the job
4. ✅ Call manual trigger endpoint
5. ✅ Check employer's email inbox
6. ✅ Verify email content and formatting
7. ✅ Check database `application_notifications` table for tracking record

## Database Migration

The system requires the `application_notifications` table. Migration file location:
```
migrations/create-application-notifications-table.sql
```

**To run manually**:
```bash
mysql -u<username> -p<password> <database> < migrations/create-application-notifications-table.sql
```

**SQL Schema**:
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

## Monitoring & Logs

### Log Messages

The service logs important events:

```typescript
// Successful notifications
`Sent notification to {email} for {count} new applications`

// No new applications
`No new applications for employer: {email}`

// Errors
`Error processing notifications for employer {email}: {error}`
`Error in scheduled check for new applications: {error}`
```

### Log Locations

- **Development**: Console output
- **Production**: Check your application log aggregation service (e.g., CloudWatch, Datadog)

### Monitoring Queries

Check notification activity:
```sql
-- Recent notifications sent
SELECT 
  u.email,
  u.firstName,
  an.lastCheckedAt,
  an.lastNotificationCount,
  an.updatedAt
FROM application_notifications an
JOIN users u ON an.employerId = u.id
ORDER BY an.updatedAt DESC
LIMIT 20;

-- Employers with pending notifications
SELECT 
  u.email,
  COUNT(ja.id) as pending_applications
FROM users u
JOIN jobs j ON j.userId = u.id
JOIN job_applications ja ON ja.jobId = j.id
LEFT JOIN application_notifications an ON an.employerId = u.id
WHERE ja.createdAt > COALESCE(an.lastCheckedAt, '2024-01-01')
  AND u.userType = 'employer'
GROUP BY u.id, u.email
HAVING pending_applications > 0;
```

## Troubleshooting

### Issue: Notifications Not Sending

**Possible Causes**:
1. Cron job not running
   - Check if `ScheduleModule` is imported in `app.module.ts`
   - Verify application is running continuously (not just for API requests)

2. Email configuration issues
   - Verify Mailgun credentials in `.env`
   - Check Mailgun dashboard for rejected/failed emails
   - Test with `sendTestEmail()` method

3. No active employers or jobs
   - Verify employers have `isActive: true`
   - Verify jobs have `status: 'active'`

4. Database table missing
   - Run migration: `migrations/create-application-notifications-table.sql`

### Issue: Duplicate Notifications

**Solution**: Check the `lastCheckedAt` timestamp is being updated correctly after each notification.

```sql
SELECT * FROM application_notifications WHERE employerId = '<employer_uuid>';
```

### Issue: Wrong Dashboard URL

**Solution**: Set `EMPLOYER_FRONTEND_URL` in `.env`:
```bash
EMPLOYER_FRONTEND_URL=https://employer.jobtowners.com
```

## Performance Considerations

### Current Scale
- Handles hundreds of employers efficiently
- Each cron run processes all active employers sequentially
- Email sending is non-blocking but synchronous per employer

### Optimization for Large Scale

If you have 1000+ employers:

1. **Batch Processing**: Process employers in batches
```typescript
const batchSize = 50;
for (let i = 0; i < employers.length; i += batchSize) {
  const batch = employers.slice(i, i + batchSize);
  await Promise.all(batch.map(emp => this.processEmployerNotifications(emp)));
}
```

2. **Queue System**: Use Bull/BullMQ for background job processing
3. **Database Indexing**: Already indexed on `employerId`

## Future Enhancements

Potential improvements:
- [ ] User preference for notification frequency
- [ ] Digest mode: Daily/weekly summaries instead of periodic
- [ ] SMS notifications via Twilio
- [ ] In-app notifications
- [ ] Notification preferences per job posting
- [ ] Real-time notifications for premium employers
- [ ] Email open tracking
- [ ] Unsubscribe option

## Related Files

- `src/modules/job-application/application-notification.service.ts` - Main service
- `src/modules/job-application/entities/application-notification.entity.ts` - Database entity
- `src/modules/job-application/job-application.module.ts` - Module registration
- `src/modules/mail/mail.service.ts` - Email sending
- `templates/emails/new-applicants-summary.hbs` - Email template
- `migrations/create-application-notifications-table.sql` - Database schema
- `src/app.module.ts` - ScheduleModule import

## Support

For issues or questions:
1. Check application logs for error messages
2. Verify environment variables are set correctly
3. Test using manual trigger endpoints
4. Check Mailgun dashboard for email delivery status
