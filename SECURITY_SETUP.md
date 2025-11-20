# Security Setup for Contact Form

This document explains how to set up the security features for the contact form endpoint.

## Environment Variables

Add the following environment variable to your `.env` file:

```bash
# Google reCAPTCHA v2 Secret Key
# Get this from: https://www.google.com/recaptcha/admin
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_here
```

## Getting Your reCAPTCHA Secret Key

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Register your site if you haven't already
3. Choose reCAPTCHA v2 (checkbox or invisible badge)
4. Add your domain(s)
5. You'll receive two keys:
   - **Site Key**: Use this on the frontend (already configured)
   - **Secret Key**: Add this to your backend `.env` file as `RECAPTCHA_SECRET_KEY`

## Security Features Implemented

### 1. reCAPTCHA Verification
- Every contact form submission must include a valid `recaptchaToken`
- The token is verified with Google's reCAPTCHA API
- Invalid tokens result in a 400 Bad Request error

### 2. Rate Limiting
- Contact form submissions are limited to **5 requests per hour per IP address**
- This prevents spam and abuse
- Exceeding the limit returns a 429 Too Many Requests error

### 3. Input Sanitization
- All text inputs are sanitized to prevent XSS attacks
- Special characters (`<`, `>`, `"`, `'`, `/`) are escaped
- Email addresses are normalized (lowercase, trimmed)

### 4. Spam Detection
- Messages are checked for common spam patterns:
  - Spam keywords (viagra, cialis, poker, casino, lottery)
  - Multiple URLs (5 or more)
  - Long number sequences (potential spam)
- Messages must be between 10 and 5000 characters

## API Usage

### Contact Form Endpoint

**POST** `/contact`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "subject": "Inquiry about services",
  "message": "I would like to know more about your services...",
  "recaptchaToken": "03AGdBq27..." 
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Your message has been sent successfully. We will get back to you soon."
}
```

**Error Responses:**

- **400 Bad Request**: Invalid input, reCAPTCHA verification failed, or spam detected
- **429 Too Many Requests**: Rate limit exceeded (5 requests per hour)

## Testing

### Development Mode
If `RECAPTCHA_SECRET_KEY` is not configured, the system will log a warning and skip reCAPTCHA verification. This is useful for development/testing.

### Testing Rate Limiting
To test the rate limiting:
1. Make 5 contact form submissions within an hour
2. The 6th request should return a 429 error
3. Wait an hour or restart the server to reset the limit

## Notes

- Rate limiting is tracked by IP address
- All contact submissions are stored in the database
- Admin users can view and respond to submissions through the admin endpoints
- The test endpoint `/contact/test-reply-to` is also protected with the same security measures


