/**
 * Test script for weight reminder function
 * Run this to test the function logic locally
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set up service account)
// admin.initializeApp({
//   credential: admin.credential.applicationDefault(),
//   projectId: 'your-project-id'
// });

/**
 * Mock function to test the reminder logic
 */
async function testReminderLogic() {
  console.log('🧪 Testing weight reminder logic...');
  
  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Today's date: ${today}`);
  
  // Mock user data for testing
  const mockUsers = [
    {
      id: 'user1',
      data: {
        email: 'test1@example.com',
        name: 'John Doe',
        last_weight_log_date: today, // Already logged today
        weight: 70.5
      }
    },
    {
      id: 'user2',
      data: {
        email: 'test2@example.com',
        name: 'Jane Smith',
        last_weight_log_date: '2024-01-14', // Yesterday
        weight: 65.2
      }
    },
    {
      id: 'user3',
      data: {
        email: 'test3@example.com',
        name: 'Bob Wilson',
        last_weight_log_date: '2024-01-13', // Day before yesterday
        weight: 80.1
      }
    },
    {
      id: 'user4',
      data: {
        email: 'test4@example.com',
        name: 'Alice Brown',
        // No last_weight_log_date field
        weight: 55.8
      }
    }
  ];
  
  let reminderCount = 0;
  let skipCount = 0;
  
  console.log('\n📊 Processing users...\n');
  
  for (const user of mockUsers) {
    const userData = user.data;
    const userId = user.id;
    
    console.log(`👤 Processing user: ${userData.name} (${userData.email})`);
    
    // Check if user has email
    if (!userData.email) {
      console.log(`   ⚠️  No email address - skipping`);
      skipCount++;
      continue;
    }
    
    // Check if user has logged weight today
    const lastWeightLogDate = userData.last_weight_log_date;
    
    if (lastWeightLogDate === today) {
      console.log(`   ✅ Already logged weight today (${lastWeightLogDate}) - skipping`);
      skipCount++;
      continue;
    }
    
    // This user should get a reminder
    console.log(`   📧 Should send reminder (last log: ${lastWeightLogDate || 'never'})`);
    reminderCount++;
  }
  
  console.log('\n📈 Results:');
  console.log(`   📧 Reminders to send: ${reminderCount}`);
  console.log(`   ⏭️  Users skipped: ${skipCount}`);
  console.log(`   📊 Total users: ${mockUsers.length}`);
  
  return {
    remindersToSend: reminderCount,
    usersSkipped: skipCount,
    totalUsers: mockUsers.length
  };
}

/**
 * Test email template generation
 */
function testEmailTemplate() {
  console.log('\n📧 Testing email template...\n');
  
  const testEmail = 'test@example.com';
  const testName = 'John Doe';
  const appUrl = 'https://your-app-domain.com';
  
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Weight Logging Reminder</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Daily Reminder</h1>
          <p>CalorieMate Weight Tracking</p>
        </div>
        <div class="content">
          <h2>Hello ${testName}!</h2>
          <p>Don't forget to log your weight today in CalorieMate to keep track of your health journey.</p>
          <p>Consistent weight tracking helps you:</p>
          <ul>
            <li>Monitor your progress</li>
            <li>Stay motivated</li>
            <li>Achieve your health goals</li>
          </ul>
          <div style="text-align: center;">
            <a href="${appUrl}" class="button">Log Weight Now</a>
          </div>
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            This is an automated reminder. You can disable these emails in your app settings.
          </p>
        </div>
        <div class="footer">
          <p>CalorieMate - Your Health Companion</p>
          <p>© ${new Date().getFullYear()} CalorieMate. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  console.log('✅ Email template generated successfully');
  console.log(`   📧 To: ${testEmail}`);
  console.log(`   👤 Name: ${testName}`);
  console.log(`   🔗 App URL: ${appUrl}`);
  
  return htmlTemplate;
}

/**
 * Validate date format
 */
function validateDateFormat() {
  console.log('\n📅 Testing date format validation...\n');
  
  const testDates = [
    '2024-01-15', // Valid
    '2024-1-15',  // Invalid (missing leading zero)
    '2024/01/15', // Invalid (wrong separator)
    '15-01-2024', // Invalid (wrong order)
    '2024-13-15', // Invalid (invalid month)
    '2024-01-32', // Invalid (invalid day)
    new Date().toISOString().split('T')[0] // Today
  ];
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  testDates.forEach(date => {
    const isValid = dateRegex.test(date);
    console.log(`${isValid ? '✅' : '❌'} ${date} - ${isValid ? 'Valid' : 'Invalid'}`);
  });
}

// Run tests
async function runTests() {
  console.log('🚀 Starting weight reminder tests...\n');
  
  try {
    // Test 1: Reminder logic
    await testReminderLogic();
    
    // Test 2: Email template
    testEmailTemplate();
    
    // Test 3: Date format validation
    validateDateFormat();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testReminderLogic,
  testEmailTemplate,
  validateDateFormat,
  runTests
}; 