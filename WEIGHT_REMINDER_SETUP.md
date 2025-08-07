# 🎯 Daily Weight Reminder System Setup Guide

This guide will help you set up a completely serverless daily weight logging reminder system using Firebase Cloud Functions and SendGrid.

## 📋 What You'll Get

- ⏰ **Daily Schedule**: Automatic reminders at 10 PM IST every day
- 📧 **Beautiful Emails**: Professional HTML emails with CalorieMate branding
- 🔍 **Smart Filtering**: Only sends to users who haven't logged weight today
- 🧪 **Manual Testing**: Test function without waiting for scheduled time
- 📊 **Detailed Logging**: Comprehensive logs for monitoring
- 💰 **Cost Effective**: Uses Firebase free tier and SendGrid free tier

## 🚀 Quick Start (Windows)

### 1. Prerequisites

- [Firebase Project](https://console.firebase.google.com/) with Firestore enabled
- [SendGrid Account](https://sendgrid.com) (free tier: 100 emails/day)
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [Firebase CLI](https://firebase.google.com/docs/cli) installed globally

### 2. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 3. Login to Firebase

```bash
firebase login
```

### 4. Initialize Firebase Functions

```bash
# Navigate to your project root
cd your-project-directory

# Initialize Firebase (if not already done)
firebase init

# Select Functions when prompted
# Choose JavaScript
# Say YES to ESLint
# Say YES to installing dependencies
```

### 5. Copy Files

Copy the following files to your project:
- `functions/index.js` - Main Cloud Function code
- `functions/package.json` - Dependencies
- `functions/deploy.bat` - Windows deployment script
- `functions/test-reminder.js` - Test script

### 6. Run Deployment Script

```bash
cd functions
deploy.bat
```

The script will:
- Install dependencies
- Prompt for SendGrid API key
- Prompt for sender email
- Prompt for app URL
- Deploy the functions

## 🔧 Manual Setup (Alternative)

If you prefer manual setup, follow these steps:

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Get SendGrid API Key

1. Go to [SendGrid Dashboard](https://app.sendgrid.com)
2. Navigate to Settings → API Keys
3. Create a new API Key with "Mail Send" permissions
4. Copy the API key

### 3. Verify Sender Email

1. In SendGrid Dashboard, go to Settings → Sender Authentication
2. Verify your sender email address (e.g., `noreply@yourdomain.com`)

### 4. Set Firebase Configuration

```bash
# Set SendGrid API key
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"

# Set sender email (must be verified in SendGrid)
firebase functions:config:set sendgrid.from_email="noreply@yourdomain.com"

# Set your app URL
firebase functions:config:set app.url="https://your-app-domain.com"
```

### 5. Deploy Functions

```bash
firebase deploy --only functions
```

## 📊 User Data Requirements

Make sure your user documents in Firestore have these fields:

```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "last_weight_log_date": "2024-01-15",
  "weight": 70.5,
  "height": 175,
  "age": 30
}
```

**Required Fields:**
- `email`: User's email address
- `last_weight_log_date`: Date of last weight log (YYYY-MM-DD format)

**Optional Fields:**
- `name`: User's name (defaults to "there" if missing)

## 🧪 Testing

### Manual Testing via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Functions
4. Find `testWeightReminders` function
5. Click "Test function"
6. Provide test data (empty object `{}` is fine)
7. Click "Test function"

### Local Testing

```bash
# Start Firebase emulator
firebase emulators:start --only functions

# Test the function logic
node test-reminder.js
```

### Check Logs

```bash
# View function logs
firebase functions:log

# View logs for specific function
firebase functions:log --only sendWeightReminders
```

## 📧 Email Template

The system sends beautiful HTML emails with:
- Responsive design
- CalorieMate branding
- Call-to-action button
- Plain text fallback
- Professional styling

## 🔍 How It Works

### Daily Schedule
- **Time**: 10 PM IST (22:00 UTC)
- **Frequency**: Every day
- **Timezone**: Asia/Kolkata

### Logic Flow
1. Function triggers at 10 PM IST
2. Gets current date (YYYY-MM-DD format)
3. Fetches all users from Firestore
4. For each user:
   - Checks if they have an email
   - Checks if `last_weight_log_date` equals today
   - If not today, sends reminder email
5. Logs results and statistics

### Email Conditions
- ✅ User has email address
- ❌ User hasn't logged weight today
- ❌ User hasn't logged weight ever (no `last_weight_log_date` field)

## 📈 Monitoring

### Firebase Console
- Go to Functions → Logs to see execution logs
- Monitor function performance and errors
- Check execution times and memory usage

### SendGrid Dashboard
- Check email delivery status
- Monitor bounce rates
- View email analytics
- Track open rates and click rates

## 🛠️ Customization

### Change Schedule
Edit the cron expression in `functions/index.js`:
```javascript
.schedule('0 22 * * *') // 10 PM daily
// Format: minute hour day month day-of-week
```

### Modify Email Template
Edit the `sendReminderEmail` function to customize:
- Email subject
- HTML template
- Plain text version
- Branding and colors

### Add More Conditions
Add additional checks before sending emails:
```javascript
// Example: Only send to active users
if (!userData.isActive) {
  return;
}
```

## 🔒 Security

### API Key Security
- Never commit API keys to version control
- Use Firebase Functions config for sensitive data
- Rotate API keys regularly

### Email Verification
- Always verify sender emails in SendGrid
- Use domain authentication for better deliverability
- Monitor bounce rates

### Rate Limiting
- SendGrid has rate limits (100 emails/second by default)
- Consider batching for large user bases
- Monitor quota usage

## 💰 Cost Analysis

### Firebase Functions (Free Tier)
- 2 million invocations/month
- 400,000 GB-seconds/month
- 200,000 CPU-seconds/month
- **Cost**: $0 for typical usage

### SendGrid (Free Tier)
- 100 emails/day
- **Cost**: $0 for up to 100 emails/day
- **Paid**: $14.95/month for 50k emails

### Total Cost
- **Small app (< 100 users)**: $0/month
- **Medium app (100-1000 users)**: $14.95/month
- **Large app (> 1000 users)**: $14.95/month + additional SendGrid plans

## 🚨 Troubleshooting

### Common Issues

1. **"SendGrid API key not found"**
   ```bash
   firebase functions:config:set sendgrid.key="YOUR_KEY"
   ```

2. **"Sender email not verified"**
   - Verify your sender email in SendGrid Dashboard
   - Use domain authentication for better deliverability

3. **"Function timeout"**
   - Large user base? Consider batching or pagination
   - Increase function timeout in Firebase Console

4. **"Permission denied"**
   - Check Firestore security rules
   - Ensure function has proper IAM permissions

5. **"No emails sent"**
   - Check if users have email addresses
   - Verify SendGrid configuration
   - Check function logs for errors

### Debug Mode

Add more logging by modifying the function:
```javascript
// Add this to see more details
console.log('User data:', JSON.stringify(userData, null, 2));
```

## 📞 Support

### Before Asking for Help
1. Check Firebase Functions logs
2. Review SendGrid delivery reports
3. Test with manual function first
4. Check Firestore data structure
5. Verify all configuration settings

### Useful Commands
```bash
# View all function logs
firebase functions:log

# View specific function logs
firebase functions:log --only sendWeightReminders

# Check configuration
firebase functions:config:get

# Test function locally
firebase emulators:start --only functions
```

## 🎉 Success!

Once deployed, your weight reminder system will:
- ✅ Run automatically every day at 10 PM IST
- ✅ Send beautiful reminder emails to users
- ✅ Only remind users who haven't logged weight today
- ✅ Provide detailed logs for monitoring
- ✅ Work completely serverless (no server maintenance needed)

Your users will receive professional reminder emails that encourage them to log their weight daily, helping them stay on track with their health goals! 🎯 