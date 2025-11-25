# SMTP Email Authentication Setup

## Environment Variables Required

Add these to your `.env` file:

```env
DATABASE_URL="your_database_url_here"
DIRECT_URL="your_direct_url_here"

NEXT_PUBLIC_BASE_URL=http://localhost:3000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@autumnspires.com
```

### For Gmail:

1. Enable 2FA on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password as `SMTP_PASS`

### For Other Providers:

- **Outlook/Hotmail**: smtp-mail.outlook.com, port 587
- **Yahoo**: smtp.mail.yahoo.com, port 587
- **SendGrid**: smtp.sendgrid.net, port 587

## Database Migration

Run this command to update your database:

```bash
bunx prisma db push
bunx prisma generate
```

## What Was Implemented

1. **OTP Table** - Stores temporary verification codes and magic link tokens
2. **Email Service** - Sends styled HTML emails via SMTP
3. **API Routes**:
   - `/api/auth/send-otp` - Sends OTP email with magic link
   - `/api/auth/verify-otp` - Verifies OTP code
   - `/api/auth/verify-magic` - Verifies magic link token
4. **Magic Link Authentication** - Click a button in email to login instantly
5. **OTP Fallback** - Copy/paste 6-digit code as alternative

## Authentication Methods

**Primary: Magic Link (Recommended)** - Users click a button in the email to login instantly

**Secondary: OTP Code** - Users can copy the 6-digit code and enter it manually

## Testing

1. Sign up with an email
2. Check your inbox for the styled email
3. Click the magic link button to login instantly OR copy the 6-digit code
4. Login uses the same flow
