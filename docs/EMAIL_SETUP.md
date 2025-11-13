# Email Notifications for Handovers

This document explains the email notification system for handover reports in the Cloackroom app.

## Overview

When a new handover is created, the system automatically sends email notifications to:
1. **The client** (if an email address is provided) - Confirmation email with handover details
2. **All admin users** in the database - Alert notification about the new handover

The system dynamically fetches admin email addresses from the `admins` collection in the database, ensuring that all current admin users receive notifications without manual configuration.

## Setup

### 1. Gmail Configuration

You need a Gmail account with an App Password to send emails:

1. Go to your [Google Account settings](https://myaccount.google.com/)
2. Navigate to **Security** → **2-Step Verification** (enable if not already)
3. Go to **App passwords** and create a new app password for "Mail"
4. Copy the 16-character app password

### 2. Environment Variables

Add these variables to your `.env.local` file:

```bash
# Gmail account to send emails from
GMAIL_USER=your-email@gmail.com

# Gmail App Password (16 characters, no spaces)
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

**Note**: Admin email addresses are automatically fetched from all admin users in the database. No additional configuration needed.

## Email Templates

### Client Confirmation Email

- **Languages**: Romanian (ro) and English (en) based on handover language setting
- **Content**: 
  - Handover details (coat number, client name, phone, email, clothing type, etc.)
  - Staff member who handled the handover
  - Event information
  - Instructions for item retrieval
- **Subject**: 
  - Romanian: "Confirmare predare haine - #[coat_number]"
  - English: "Coat Check Confirmation - #[coat_number]"

### Admin Alert Email

- **Language**: English only
- **Content**:
  - New handover alert notification
  - Complete handover details
  - Photo count
  - Staff member information
- **Subject**: "New Handover Alert - #[coat_number]"

## Testing

### Using the Test Interface

Visit `/admin/email-test` in your browser (admin login required) to:
- Send test emails with sample data
- Verify your email configuration
- Check both client and admin email templates

### Using the API Directly

```bash
curl -X POST /api/test-email \
  -H "Content-Type: application/json" \
  -d '{"handoverId": "test-123", "testEmail": "test@example.com"}'
```

## Error Handling

- **Email failures do not prevent handover creation**
- Emails are sent asynchronously after handover is saved
- Missing configuration is logged but doesn't cause errors
- Individual email failures are logged with details

## Troubleshooting

### Common Issues

1. **"Gmail configuration missing"**
   - Check that `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set in your environment

2. **"Authentication failed"**
   - Verify the Gmail App Password is correct
   - Ensure 2-Step Verification is enabled on the Gmail account

3. **"No admin users found in database"**
   - Ensure there are admin users created in the system
   - Check that admin users have valid email addresses

4. **Emails not being received**
   - Check spam/junk folders
   - Verify email addresses are correct
   - Check server logs for error messages

### Logs

Email activity is logged to the console:
- Configuration checks
- Email sending attempts
- Success/failure results
- Error details

## Security Notes

- Never commit real credentials to version control
- Use App Passwords instead of regular Gmail passwords
- Keep the `.env.local` file in `.gitignore`
- Consider using a dedicated Gmail account for the application

## File Structure

```
lib/email.ts                    # Email service implementation
app/api/handover/route.ts       # Handover API with email integration
app/api/test-email/route.ts     # Email testing endpoint
app/admin/email-test/page.tsx   # Email testing interface
.env.example                    # Environment variable examples
```