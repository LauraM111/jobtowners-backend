# Admin Notification Emails Implementation

## Overview
This implementation adds admin notification emails for three key events:
1. New student registration
2. New employer registration  
3. Document uploads (verification files)

All admin notifications are sent to:
- laura@jobtowners.com
- lauram.f.rodriguezg@gmail.com

These notifications are sent **in addition to** the existing user confirmation emails.

---

## Files Modified

### 1. Email Templates Created

#### `/src/templates/emails/admin-new-registration.hbs`
- Template for new user registration notifications (both students and employers)
- Displays: Name, Email, Phone, School/Company, Registration Date, Document status
- Includes link to admin user profile
- Subject: "New {Student/Employer} Registration – Action Required"

#### `/src/templates/emails/admin-document-upload.hbs`
- Template for document upload notifications
- Displays: User info, document types uploaded, upload date
- Includes direct links to view documents
- Subject: "📎 New Document Uploaded – Review Required"

#### `/templates/emails/` (Root Directory)
- Copies of the same templates placed here for compatibility

### 2. Mail Service (`/src/modules/mail/mail.service.ts`)

#### New Method: `sendAdminRegistrationNotification()`
```typescript
async sendAdminRegistrationNotification(user: any, userRole: string): Promise<boolean>
```
- Sends registration notification to both admin emails
- Parameters:
  - `user`: User object with registration details
  - `userRole`: 'Student' or 'Employer'
- Automatically determines organization label (School/Company)
- Formats registration date
- Generates admin profile link
- Fire-and-forget pattern (doesn't block registration)

#### New Method: `sendAdminDocumentUploadNotification()`
```typescript
async sendAdminDocumentUploadNotification(user: any, documentUrls: object): Promise<boolean>
```
- Sends document upload notification to both admin emails
- Parameters:
  - `user`: User object
  - `documentUrls`: Object with `studentPermitUrl` and/or `enrollmentProofUrl`
- Converts user type to display name (candidate → Student)
- Provides direct links to view uploaded documents
- Fire-and-forget pattern (doesn't block document upload)

### 3. User Service (`/src/modules/user/user.service.ts`)

#### Modified: `registerCandidate()`
**Added after user creation:**
```typescript
// Send admin notification for new student registration
this.mailService.sendAdminRegistrationNotification(user, 'Student').catch(error => {
  this.logger.error(`Failed to send admin registration notification: ${error.message}`);
});

// Send admin notification for document uploads if documents were provided
if (studentPermitUrl || enrollmentProofUrl) {
  this.mailService.sendAdminDocumentUploadNotification(user, {
    studentPermitUrl,
    enrollmentProofUrl
  }).catch(error => {
    this.logger.error(`Failed to send admin document upload notification: ${error.message}`);
  });
}
```

#### Modified: `registerEmployer()`
**Added after user creation:**
```typescript
// Send admin notification for new employer registration
this.mailService.sendAdminRegistrationNotification(user, 'Employer').catch(error => {
  this.logger.error(`Failed to send admin registration notification: ${error.message}`);
});
```

#### Modified: `updateCandidateProfile()`
**Added document upload tracking:**
- Detects when new documents are uploaded (different from existing ones)
- Sends admin notification only for newly uploaded documents
- Tracks both student permit and proof of enrollment changes
- Fire-and-forget pattern to avoid blocking profile updates

---

## Email Format Details

### Registration Notification Email

**Subject:** `New {Student/Employer} Registration – Action Required`

**Contents:**
- Header with role type
- Full Name
- Email
- Phone Number
- School/Company (context-aware label)
- Registration Date (formatted)
- Documents Uploaded indicator (if applicable)
- "View User Profile" button (links to admin dashboard)
- Action Required notice

### Document Upload Notification Email

**Subject:** `📎 New Document Uploaded – Review Required`

**Contents:**
- User Name
- User Role (Student/Employer)
- Email
- Document List with direct view links:
  - Student Permit (if uploaded)
  - Proof of Enrollment (if uploaded)
- Upload Date (formatted)
- "View User Profile" button
- Action Required notice

---

## Technical Details

### Email Sending Pattern
All admin notifications use a **fire-and-forget** pattern:
```typescript
this.mailService.sendAdminNotification(...).catch(error => {
  this.logger.error(`Failed to send notification: ${error.message}`);
});
```

**Benefits:**
- Registration/updates are never blocked by email failures
- Errors are logged but don't affect user experience
- Non-blocking async execution

### Admin Profile Links
Profile links are generated using the frontend URL from config:
```typescript
const frontendUrl = this.configService.get('FRONTEND_URL') || this.configService.get('frontendUrl');
const profileLink = `${frontendUrl}/admin/users/${user.id}`;
```

**Expected format:** `https://yourdomain.com/admin/users/{userId}`

### Date Formatting
Dates are formatted using locale string:
```typescript
new Date(user.createdAt).toLocaleString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short'
})
```

**Example output:** `March 6, 2026, 10:30 AM EST`

---

## Testing the Implementation

### 1. Test Student Registration
```bash
# Register a new student
POST /api/v1/users/register/candidate
{
  "firstName": "Test",
  "lastName": "Student",
  "email": "test@example.com",
  "phoneNumber": "+1234567890",
  "password": "Password123!",
  "termsAccepted": true,
  "studentPermitImage": "base64-encoded-data",
  "proofOfEnrollmentImage": "base64-encoded-data"
}
```

**Expected:** 
- User receives welcome email
- Admins receive registration notification
- Admins receive document upload notification

### 2. Test Employer Registration
```bash
# Register a new employer
POST /api/v1/users/register/employer
{
  "firstName": "Test",
  "lastName": "Employer",
  "email": "employer@example.com",
  "phoneNumber": "+1234567890",
  "password": "Password123!",
  "termsAccepted": true
}
```

**Expected:**
- User receives welcome email
- Admins receive registration notification

### 3. Test Document Upload (Profile Update)
```bash
# Update candidate profile with new documents
PATCH /api/v1/users/candidate/update/profile
Authorization: Bearer {token}
{
  "studentPermitImage": "new-document-url",
  "proofOfEnrollmentImage": "new-document-url"
}
```

**Expected:**
- Profile updates successfully
- Admins receive document upload notification

---

## Configuration Requirements

### Environment Variables
Ensure these are set in your `.env` file:

```env
# Mail Configuration
MAILGUN_SMTP_HOST=smtp.mailgun.org
MAILGUN_SMTP_PORT=587
MAILGUN_SMTP_USERNAME=your-username@yourdomain.com
MAILGUN_SMTP_PASSWORD=your-password

# Mail From Configuration (at least one is required)
# Option 1: Use separate name and address
MAIL_FROM_NAME=JobTowners
MAIL_FROM_ADDRESS=noreply@jobtowners.com

# Option 2: Or use combined MAIL_FROM (deprecated but supported)
# MAIL_FROM=noreply@jobtowners.com

# Frontend URL (for admin profile links)
FRONTEND_URL=https://yourdomain.com
```

**Note:** The mail service will try to use:
1. `MAIL_FROM_ADDRESS` (preferred)
2. `MAIL_FROM` (fallback)
3. `MAILGUN_SMTP_USERNAME` (last resort)

Make sure at least one of these is properly configured with a valid email address.

### Template Files
Templates must be present in:
- `/src/templates/emails/` (source)
- `/templates/emails/` (fallback)

The build process copies templates from `src/templates/emails/` to `dist/templates/emails/`.

---

## Deployment Notes

### Before Deploying
1. Verify email configuration is correct
2. Test email sending in staging environment
3. Confirm admin email addresses are correct
4. Verify frontend URL is set correctly for profile links

### Build Process
The templates are automatically copied during build:
```bash
npm run build
# Templates are copied from src/templates/emails/ to dist/templates/emails/
```

### Monitoring
Check logs for email sending errors:
```bash
# Look for these log messages:
"Admin registration notification sent for user: {email}"
"Admin document upload notification sent for user: {email}"
"Failed to send admin registration notification: {error}"
"Failed to send admin document upload notification: {error}"
```

---

## Troubleshooting

### Emails Not Being Sent

1. **Check SMTP Configuration**
   - Verify all MAILGUN_* environment variables are set
   - Ensure `MAILGUN_SMTP_USERNAME` is a valid email address (e.g., `postmaster@mg.yourdomain.com`)
   - Test SMTP connection manually

2. **Check From Address Configuration**
   - Error: "501 Invalid command or cannot parse from address"
     - Ensure `MAIL_FROM_ADDRESS` or `MAIL_FROM` is set to a valid email
     - The system will fallback to `MAILGUN_SMTP_USERNAME` if neither is set
     - Make sure the address format is: `user@domain.com` (no spaces, valid format)

3. **Check Logs**
   - Look for error messages in application logs
   - Check for "Failed to send" messages
   - Verify template loading errors

4. **Verify Templates**
   - Ensure templates exist in `dist/templates/emails/`
   - Check template syntax (Handlebars)

### Profile Links Not Working

1. **Check Frontend URL**
   - Verify `FRONTEND_URL` environment variable
   - Ensure it matches your actual frontend domain

2. **Admin Dashboard Route**
   - Confirm frontend has route: `/admin/users/:userId`
   - Update template if route is different

### Documents Not Triggering Notifications

1. **Registration Documents**
   - Only triggers if documents are provided during registration
   - Check if `studentPermitImage` or `proofOfEnrollmentImage` is present

2. **Profile Update Documents**
   - Only triggers if NEW documents are uploaded
   - Won't trigger if same URL is re-submitted

---

## Future Enhancements

Potential improvements to consider:

1. **Additional Admin Emails**
   - Make admin email list configurable via environment variables
   - Support dynamic admin list from database

2. **Notification Preferences**
   - Allow admins to opt in/out of specific notification types
   - Add notification frequency controls (immediate, daily digest)

3. **Rich Notifications**
   - Add inline document previews in emails
   - Include thumbnail images

4. **Notification Dashboard**
   - Create admin dashboard for viewing notification history
   - Track notification delivery status

5. **Document Status Updates**
   - Send notifications when documents are approved/rejected
   - Notify users of document status changes

---

## Summary

✅ **Implemented:**
- Admin notifications for new student registrations
- Admin notifications for new employer registrations
- Admin notifications for document uploads (registration + profile updates)
- Two beautiful HTML email templates
- Proper error handling and logging
- Non-blocking email sending

✅ **Email Recipients:**
- laura@jobtowners.com
- lauram.f.rodriguezg@gmail.com

✅ **Separate from User Emails:**
- Admin notifications are independent
- User confirmation emails continue as normal
- No impact on user experience if admin emails fail
