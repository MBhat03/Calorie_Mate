# Firebase Cloud Functions - Daily Weight Reminders

This Firebase Cloud Function sends daily weight logging reminders to users who haven't logged their weight today.

## Features

- ⏰ **Daily Schedule**: Runs at 10 PM IST every day
- 📧 **SendGrid Integration**: Sends beautiful HTML emails
- 🔍 **Smart Filtering**: Only sends to users who haven't logged weight today
- 🧪 **Manual Testing**: Test function without waiting for scheduled time
- 📊 **Detailed Logging**: Comprehensive logs for monitoring

## Prerequisites

1. **Firebase Project**: You need a Firebase project with Firestore enabled
2. **SendGrid Account**: Sign up at [sendgrid.com](https://sendgrid.com)
3. **Node.js**: Version 18 or higher
4. **Firebase CLI**: Install with `npm install -g firebase-tools`

## Setup Instructions

### 1. Initialize Firebase Functions

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

### 2. Install Dependencies

```bash
cd functions
npm install
```

### 3. Configure SendGrid

#### Get SendGrid API Key
1. Go to [SendGrid Dashboard](https://app.sendgrid.com)
2. Navigate to Settings → API Keys
3. Create a new API Key with "Mail Send" permissions
4. Copy the API key

#### Verify Sender Email
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

### 5. Update User Documents

Make sure your user documents in Firestore have these fields:
- `email`: User's email address
- `name`: User's name (optional, defaults to "there")
- `last_weight_log_date`: Date of last weight log (YYYY-MM-DD format)

Example user document:
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

### 6. Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:sendWeightReminders
```

## Function Details

### 1. `sendWeightReminders` (Scheduled)
- **Trigger**: Cloud Scheduler (cron: `0 22 * * *`)
- **Timezone**: Asia/Kolkata (10 PM IST)
- **Purpose**: Daily automated reminders

### 2. `testWeightReminders` (Manual)
- **Trigger**: HTTP callable function
- **Purpose**: Test reminders without waiting for schedule
- **Security**: Requires user authentication

## Testing

### Manual Testing

You can test the function manually using Firebase Console:

1. Go to Firebase Console → Functions
2. Find `testWeightReminders` function
3. Click "Test function"
4. Provide test data (empty object is fine)
5. Click "Test function"

### Local Testing

```bash
# Start Firebase emulator
firebase emulators:start --only functions

# In another terminal, test the function
curl -X POST "http://localhost:5001/YOUR_PROJECT_ID/us-central1/testWeightReminders" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Check Logs

```bash
# View function logs
firebase functions:log

# View logs for specific function
firebase functions:log --only sendWeightReminders
```

## Email Template

The function sends beautiful HTML emails with:
- Responsive design
- CalorieMate branding
- Call-to-action button
- Plain text fallback

## Monitoring

### Firebase Console
- Go to Functions → Logs to see execution logs
- Monitor function performance and errors

### SendGrid Dashboard
- Check email delivery status
- Monitor bounce rates
- View email analytics

## Troubleshooting

### Common Issues

1. **"SendGrid API key not found"**
   - Make sure you set the config: `firebase functions:config:set sendgrid.key="YOUR_KEY"`

2. **"Sender email not verified"**
   - Verify your sender email in SendGrid Dashboard

3. **"Function timeout"**
   - Large user base? Consider batching or pagination

4. **"Permission denied"**
   - Check Firestore security rules
   - Ensure function has proper IAM permissions

### Debug Mode

Add more logging by modifying the function:

```javascript
// Add this to see more details
console.log('User data:', JSON.stringify(userData, null, 2));
```

## Security Considerations

1. **API Key Security**: Never commit API keys to version control
2. **Email Verification**: Always verify sender emails in SendGrid
3. **Rate Limiting**: SendGrid has rate limits (100 emails/second by default)
4. **User Consent**: Consider adding email preference settings

## Cost Optimization

- **Free Tier**: Firebase Functions have generous free tier
- **SendGrid**: 100 emails/day free, then $14.95/month for 50k emails
- **Monitoring**: Set up billing alerts in Firebase Console

## Customization

### Modify Email Template
Edit the `sendReminderEmail` function to customize:
- Email subject
- HTML template
- Plain text version
- Branding and colors

### Change Schedule
Modify the cron expression in `sendWeightReminders`:
```javascript
.schedule('0 22 * * *') // 10 PM daily
// Format: minute hour day month day-of-week
```

### Add More Conditions
Add additional checks before sending emails:
```javascript
// Example: Only send to active users
if (!userData.isActive) {
  return;
}
```

## Support

For issues or questions:
1. Check Firebase Functions logs
2. Review SendGrid delivery reports
3. Test with manual function first
4. Check Firestore data structure 