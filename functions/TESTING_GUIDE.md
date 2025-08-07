# Firebase Cloud Function Testing Guide

## Overview
This guide explains how to test your Firebase Cloud Functions using different methods and tools.

## Available Test Functions

### 1. `testWeightReminders` (Callable Function)
- **Type**: `functions.https.onCall`
- **Use**: Firebase SDK, Firebase Console
- **Authentication**: Required (Firebase Auth)

### 2. `testWeightRemindersHttp` (HTTP Function)
- **Type**: `functions.https.onRequest`
- **Use**: Postman, PowerShell, cURL, any HTTP client
- **Authentication**: None required (public endpoint)

## Testing Methods

### Method 1: Firebase Console (Easiest)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Functions**
4. Find `testWeightReminders` function
5. Click **"Test function"**
6. Click **"Test the function"** button
7. View results in the logs

### Method 2: Postman (HTTP Function)

#### Request Details:
- **Method**: `POST`
- **URL**: `https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/testWeightRemindersHttp`
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "test": true
  }
  ```
  or simply:
  ```json
  {}
  ```

#### Expected Response:
```json
{
  "success": true,
  "message": "Test completed successfully",
  "remindersSent": 2,
  "skipped": 1,
  "errors": 0,
  "totalUsers": 3,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Method 3: PowerShell (HTTP Function)

```powershell
# Replace YOUR-PROJECT-ID with your actual Firebase project ID
$url = "https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/testWeightRemindersHttp"
$body = @{
    test = $true
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Body $body -Headers $headers
    Write-Host "Success: $($response | ConvertTo-Json -Depth 10)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response)"
}
```

### Method 4: cURL (HTTP Function)

```bash
# Replace YOUR-PROJECT-ID with your actual Firebase project ID
curl -X POST \
  https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/testWeightRemindersHttp \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Function Expectations

### HTTP Function (`testWeightRemindersHttp`)

#### Request Body:
- **Required**: None (empty JSON `{}` is fine)
- **Optional**: Any JSON object (function ignores it)
- **Content-Type**: Must be `application/json`

#### No Schema Validation:
The function doesn't validate the request body content. It only checks:
1. ✅ Method is POST
2. ✅ Content-Type is application/json
3. ✅ Valid JSON format

#### Response Structure:
```json
{
  "success": boolean,
  "message": string,
  "remindersSent": number,
  "skipped": number,
  "errors": number,
  "totalUsers": number,
  "timestamp": string
}
```

### Callable Function (`testWeightReminders`)

#### Request Data:
- **Required**: None (empty object `{}` is fine)
- **Authentication**: Firebase Auth required
- **Use**: Firebase SDK only

## Common Issues & Solutions

### 1. 400 INVALID_ARGUMENT Error
**Cause**: Wrong function type or malformed request
**Solution**: 
- Use `testWeightRemindersHttp` for HTTP requests
- Ensure Content-Type is `application/json`
- Send valid JSON in request body

### 2. 403 Forbidden Error
**Cause**: Function requires authentication
**Solution**: Use `testWeightRemindersHttp` (no auth required)

### 3. 404 Not Found Error
**Cause**: Wrong URL or function not deployed
**Solution**:
- Check your project ID in the URL
- Deploy functions: `firebase deploy --only functions`

### 4. 500 Internal Server Error
**Cause**: Function execution error
**Solution**: Check Firebase Console → Functions → Logs

## Testing Checklist

- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Get your Firebase project ID
- [ ] Use correct function URL
- [ ] Set Content-Type header to `application/json`
- [ ] Send valid JSON in request body
- [ ] Check Firebase Console logs for detailed output

## Example URLs

Replace `YOUR-PROJECT-ID` with your actual Firebase project ID:

```
https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/testWeightRemindersHttp
```

## Monitoring & Debugging

1. **Firebase Console Logs**: Functions → Logs
2. **Function Metrics**: Functions → Usage
3. **Real-time Logs**: `firebase functions:log --only testWeightRemindersHttp`

## Security Notes

- `testWeightRemindersHttp` is public (no authentication required)
- Use only for testing in development
- Consider adding authentication for production use
- Monitor function usage to prevent abuse 