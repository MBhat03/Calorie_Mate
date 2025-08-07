#!/bin/bash

# Firebase Cloud Functions Deployment Script
# This script helps you deploy the weight reminder functions

set -e  # Exit on any error

echo "🚀 Starting Firebase Functions deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    print_error "You are not logged in to Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

# Check if we're in the functions directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the functions directory"
    exit 1
fi

print_status "Installing dependencies..."
npm install

print_status "Checking Firebase configuration..."

# Check if SendGrid API key is configured
if ! firebase functions:config:get sendgrid.key &> /dev/null; then
    print_warning "SendGrid API key not configured. Please set it:"
    echo "firebase functions:config:set sendgrid.key=\"YOUR_SENDGRID_API_KEY\""
    echo ""
    read -p "Enter your SendGrid API key: " sendgrid_key
    if [ -n "$sendgrid_key" ]; then
        firebase functions:config:set sendgrid.key="$sendgrid_key"
        print_success "SendGrid API key configured"
    else
        print_error "SendGrid API key is required"
        exit 1
    fi
fi

# Check if sender email is configured
if ! firebase functions:config:get sendgrid.from_email &> /dev/null; then
    print_warning "Sender email not configured. Please set it:"
    echo "firebase functions:config:set sendgrid.from_email=\"noreply@yourdomain.com\""
    echo ""
    read -p "Enter your verified sender email: " sender_email
    if [ -n "$sender_email" ]; then
        firebase functions:config:set sendgrid.from_email="$sender_email"
        print_success "Sender email configured"
    else
        print_error "Sender email is required"
        exit 1
    fi
fi

# Check if app URL is configured
if ! firebase functions:config:get app.url &> /dev/null; then
    print_warning "App URL not configured. Please set it:"
    echo "firebase functions:config:set app.url=\"https://your-app-domain.com\""
    echo ""
    read -p "Enter your app URL: " app_url
    if [ -n "$app_url" ]; then
        firebase functions:config:set app.url="$app_url"
        print_success "App URL configured"
    else
        print_error "App URL is required"
        exit 1
    fi
fi

print_status "Current configuration:"
firebase functions:config:get

print_status "Deploying functions..."
firebase deploy --only functions

print_success "Deployment completed successfully!"

echo ""
print_status "Next steps:"
echo "1. Test the function manually using Firebase Console"
echo "2. Check the function logs: firebase functions:log"
echo "3. Monitor email delivery in SendGrid Dashboard"
echo ""
print_status "Function URLs:"
echo "- Scheduled function: Automatically runs at 10 PM IST daily"
echo "- Test function: Call manually from Firebase Console"
echo ""
print_status "To view logs:"
echo "firebase functions:log --only sendWeightReminders"
echo ""
print_success "🎉 Your weight reminder system is now live!" 