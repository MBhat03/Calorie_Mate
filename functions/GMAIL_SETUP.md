# Gmail Setup Guide for Firebase Cloud Functions

## Overview
This guide will help you set up Gmail authentication for sending automated weight reminder emails using Firebase Cloud Functions with nodemailer.

## Prerequisites
- A Gmail account
- Firebase project with Cloud Functions enabled
- Firebase CLI installed

## Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to "Security" → "2-Step Verification"
3. Enable 2-Step Verification if not already enabled

## Step 2: Generate App Password
1. In your Google Account settings, go to "Security" → "App passwords"
2. Select "Mail" as the app and "Other" as the device
3. Click "Generate"
4. Copy the 16-character app password (you'll only see it once!)

## Step 3: Configure Firebase Functions

### Option A: Using Firebase CLI (Recommended)
```bash
# Set Gmail credentials (use the correct config keys)
firebase functions:config:set gmail.user="your-email@gmail.com"
firebase functions:config:set gmail.pass="your-16-char-app-password"

# Set app URL (optional)
firebase functions:config:set app.url="https://your-app-domain.com"
```

### Option B: Using Environment Variables
Create a `.env` file in the `functions/` directory:
```env
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-16-char-app-password
APP_URL=https://your-app-domain.com
```

## Step 4: Install Dependencies
```bash
cd functions
npm install
```

## Step 5: Deploy Functions
```bash
firebase deploy --only functions
```

## Step 6: Test the Function
You can test the function manually using the Firebase Console:
1. Go to Firebase Console → Functions
2. Find `testWeightReminders` function
3. Click "Test function" to trigger it manually

## Function Details

### Scheduled Function: `sendWeightReminders`
- **Schedule**: Runs daily at 9:00 PM IST (Asia/Kolkata timezone)
- **Trigger**: Firebase Cloud Scheduler (cron job)
- **Purpose**: Sends reminder emails to users who haven't logged their weight today

### Test Function: `testWeightReminders`
- **Trigger**: Manual HTTP callable function
- **Purpose**: Test the email functionality without waiting for the scheduled time

## Email Content
The function sends beautifully formatted HTML emails with:
- Motivational message
- Direct link to log weight
- Professional styling
- Fallback plain text version

## Troubleshooting

### Common Issues:

1. **"nodemailer.createTransporter is not a function" error**
   - ✅ **FIXED**: The correct method is `nodemailer.createTransport` (with 'r')
   - This has been corrected in the code

2. **"Invalid login" error**
   - Ensure you're using an App Password, not your regular Gmail password
   - Verify 2-Factor Authentication is enabled

3. **"Less secure app access" error**
   - App passwords are the recommended approach
   - Don't enable "less secure app access"

4. **Function not triggering**
   - Check Firebase Console → Functions → Logs
   - Verify the cron schedule is correct

5. **Emails not sending**
   - Check function logs in Firebase Console
   - Verify Gmail credentials are correctly set using the right config keys

6. **Config values returning undefined**
   - ✅ **FIXED**: Use `gmail.user` and `gmail.pass` (not `gmail.email` and `gmail.password`)
   - Set configs using: `firebase functions:config:set gmail.user="your-email@gmail.com"`

## Security Notes
- Never commit your `.env` file to version control
- Use App Passwords instead of regular passwords
- The `.env` file is already in `.gitignore`

## Monitoring
Monitor your function's performance in Firebase Console:
- Functions → Logs
- Functions → Usage
- Functions → Metrics

## Cost Considerations
- Firebase Cloud Functions have a generous free tier
- Email sending is handled by Gmail (free)
- Monitor usage in Firebase Console

## Recent Fixes Applied
- ✅ Fixed `nodemailer.createTransporter` → `nodemailer.createTransport`
- ✅ Corrected config keys: `gmail.user` and `gmail.pass`
- ✅ Added proper email validation before sending
- ✅ Enhanced error handling and logging
- ✅ Added skipped user tracking
- ✅ Improved function organization and readability 