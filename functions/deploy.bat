@echo off
REM Firebase Cloud Functions Deployment Script for Windows
REM This script helps you deploy the weight reminder functions

echo 🚀 Starting Firebase Functions deployment...

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Firebase CLI is not installed. Please install it first:
    echo npm install -g firebase-tools
    pause
    exit /b 1
)

REM Check if user is logged in to Firebase
firebase projects:list >nul 2>&1
if errorlevel 1 (
    echo [ERROR] You are not logged in to Firebase. Please login first:
    echo firebase login
    pause
    exit /b 1
)

REM Check if we're in the functions directory
if not exist "package.json" (
    echo [ERROR] Please run this script from the functions directory
    pause
    exit /b 1
)

echo [INFO] Installing dependencies...
call npm install

echo [INFO] Checking Firebase configuration...

REM Check if SendGrid API key is configured
firebase functions:config:get sendgrid.key >nul 2>&1
if errorlevel 1 (
    echo [WARNING] SendGrid API key not configured. Please set it:
    echo firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"
    echo.
    set /p sendgrid_key="Enter your SendGrid API key: "
    if not "%sendgrid_key%"=="" (
        firebase functions:config:set sendgrid.key="%sendgrid_key%"
        echo [SUCCESS] SendGrid API key configured
    ) else (
        echo [ERROR] SendGrid API key is required
        pause
        exit /b 1
    )
)

REM Check if sender email is configured
firebase functions:config:get sendgrid.from_email >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Sender email not configured. Please set it:
    echo firebase functions:config:set sendgrid.from_email="noreply@yourdomain.com"
    echo.
    set /p sender_email="Enter your verified sender email: "
    if not "%sender_email%"=="" (
        firebase functions:config:set sendgrid.from_email="%sender_email%"
        echo [SUCCESS] Sender email configured
    ) else (
        echo [ERROR] Sender email is required
        pause
        exit /b 1
    )
)

REM Check if app URL is configured
firebase functions:config:get app.url >nul 2>&1
if errorlevel 1 (
    echo [WARNING] App URL not configured. Please set it:
    echo firebase functions:config:set app.url="https://your-app-domain.com"
    echo.
    set /p app_url="Enter your app URL: "
    if not "%app_url%"=="" (
        firebase functions:config:set app.url="%app_url%"
        echo [SUCCESS] App URL configured
    ) else (
        echo [ERROR] App URL is required
        pause
        exit /b 1
    )
)

echo [INFO] Current configuration:
firebase functions:config:get

echo [INFO] Deploying functions...
firebase deploy --only functions

echo [SUCCESS] Deployment completed successfully!

echo.
echo [INFO] Next steps:
echo 1. Test the function manually using Firebase Console
echo 2. Check the function logs: firebase functions:log
echo 3. Monitor email delivery in SendGrid Dashboard
echo.
echo [INFO] Function URLs:
echo - Scheduled function: Automatically runs at 10 PM IST daily
echo - Test function: Call manually from Firebase Console
echo.
echo [INFO] To view logs:
echo firebase functions:log --only sendWeightReminders
echo.
echo [SUCCESS] 🎉 Your weight reminder system is now live!
pause 