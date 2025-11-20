# Email OTP Setup Instructions

## Where to Add Email Credentials

Add the following environment variables to your `.env` file in the `server` directory:

```env
# Email Configuration (for OTP verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_or_email_password
```

## Gmail Setup (Recommended)

If you're using Gmail, you need to use an **App Password** instead of your regular password:

1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable it if not already enabled)
3. Scroll down to **App passwords**
4. Generate a new app password for "Mail" and "Other (Custom name)" - name it "LiveMart"
5. Copy the 16-character password (no spaces)
6. Use this password as `SMTP_PASS` in your `.env` file

## Other Email Providers

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Custom SMTP Server
Use your email provider's SMTP settings. Common ports:
- 587 (TLS/STARTTLS) - recommended
- 465 (SSL) - set `SMTP_SECURE=true`
- 25 (usually blocked by ISPs)

## Testing

After setting up your credentials, restart your server and try registering a new account. The OTP will be sent to the email address you provide during registration.

## Security Notes

- Never commit your `.env` file to version control
- Use App Passwords for Gmail instead of your main password
- Keep your SMTP credentials secure
- The OTP expires after 10 minutes
- Users have 5 attempts to verify the OTP before it expires

