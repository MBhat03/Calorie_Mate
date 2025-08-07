const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin
admin.initializeApp();

// Initialize nodemailer transporter
let transporter;
try {
  const gmailUser = functions.config().gmail?.user || process.env.GMAIL_USER;
  const gmailPass = functions.config().gmail?.pass || process.env.GMAIL_PASS;
  
  if (!gmailUser || !gmailPass) {
    console.log('⚠️ Gmail credentials not configured. Email sending will be simulated.');
  } else {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });
    console.log('✅ Nodemailer transporter initialized successfully');
  }
} catch (error) {
  console.log('❌ Nodemailer initialization failed:', error.message);
}

/**
 * Daily weight logging reminder function
 * Triggered by Cloud Scheduler at 9 PM IST daily
 */
exports.sendWeightReminders = functions.pubsub
  .schedule('0 21 * * *') // 9 PM daily (21:00 UTC = 9 PM IST)
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    try {
      console.log('🕐 Starting daily weight reminder check...');
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      console.log(`📅 Today's date: ${today}`);
      
      // Get all users from Firestore
      const usersSnapshot = await admin.firestore()
        .collection('Users')
        .get();
      
      if (usersSnapshot.empty) {
        console.log('📭 No users found in database');
        return null;
      }
      
      let reminderCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      
      // Process each user
      const promises = usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        try {
          // Validate user has email
          if (!userData.email || typeof userData.email !== 'string' || userData.email.trim() === '') {
            console.log(`⚠️ User ${userId} has no valid email address`);
            skippedCount++;
            return;
          }
          
          const userEmail = userData.email.trim();
          
          // Check if user has logged weight today
          const lastWeightLogDate = userData.last_weight_log_date;
          
          if (lastWeightLogDate === today) {
            console.log(`✅ User ${userEmail} already logged weight today`);
            skippedCount++;
            return;
          }
          
          // Send reminder email
          await sendReminderEmail(userEmail, userData.name || 'there');
          reminderCount++;
          
          console.log(`📧 Reminder sent to ${userEmail}`);
          
        } catch (error) {
          errorCount++;
          console.error(`❌ Error processing user ${userId}:`, error);
        }
      });
      
      // Wait for all emails to be sent
      await Promise.all(promises);
      
      console.log(`✅ Reminder process completed:`);
      console.log(`   📧 Reminders sent: ${reminderCount}`);
      console.log(`   ⏭️ Skipped: ${skippedCount}`);
      console.log(`   ❌ Errors: ${errorCount}`);
      console.log(`   📊 Total users processed: ${usersSnapshot.size}`);
      
      return {
        success: true,
        remindersSent: reminderCount,
        skipped: skippedCount,
        errors: errorCount,
        totalUsers: usersSnapshot.size
      };
      
    } catch (error) {
      console.error('❌ Function execution failed:', error);
      throw error;
    }
  });

/**
 * Manual trigger function for testing (Callable - for Firebase SDK)
 * Call this function manually to test without waiting for 9 PM
 */
exports.testWeightReminders = functions.https.onCall(async (data, context) => {
  try {
    console.log('🧪 Manual test trigger for weight reminders (Callable)');
    
    // Call the same logic as the scheduled function
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Test date: ${today}`);
    
    const usersSnapshot = await admin.firestore()
      .collection('Users')
      .get();
    
    if (usersSnapshot.empty) {
      return { message: 'No users found', remindersSent: 0 };
    }
    
    let reminderCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    const promises = usersSnapshot.docs.map(async (userDoc) => {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      try {
        // Validate user has email
        if (!userData.email || typeof userData.email !== 'string' || userData.email.trim() === '') {
          skippedCount++;
          return;
        }
        
        const userEmail = userData.email.trim();
        
        const lastWeightLogDate = userData.last_weight_log_date;
        
        if (lastWeightLogDate === today) {
          console.log(`✅ User ${userEmail} already logged weight today`);
          skippedCount++;
          return;
        }
        
        await sendReminderEmail(userEmail, userData.name || 'there');
        reminderCount++;
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing user ${userId}:`, error);
      }
    });
    
    await Promise.all(promises);
    
    return {
      success: true,
      message: 'Test completed successfully',
      remindersSent: reminderCount,
      skipped: skippedCount,
      errors: errorCount,
      totalUsers: usersSnapshot.size
    };
    
  } catch (error) {
    console.error('❌ Test function failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Manual trigger function for testing (HTTP Request - for Postman/PowerShell)
 * Call this function with POST request to test without waiting for 9 PM
 */
exports.testWeightRemindersHttp = functions.https.onRequest(async (req, res) => {
  // Enable CORS for testing
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are supported'
    });
    return;
  }
  
  try {
    console.log('🧪 Manual test trigger for weight reminders (HTTP)');
    console.log('📝 Request body:', req.body);
    
    // Call the same logic as the scheduled function
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Test date: ${today}`);
    
    const usersSnapshot = await admin.firestore()
      .collection('Users')
      .get();
    
    if (usersSnapshot.empty) {
      res.status(200).json({
        success: true,
        message: 'No users found',
        remindersSent: 0,
        skipped: 0,
        errors: 0,
        totalUsers: 0
      });
      return;
    }
    
    let reminderCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    const promises = usersSnapshot.docs.map(async (userDoc) => {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      try {
        // Validate user has email
        if (!userData.email || typeof userData.email !== 'string' || userData.email.trim() === '') {
          skippedCount++;
          return;
        }
        
        const userEmail = userData.email.trim();
        
        const lastWeightLogDate = userData.last_weight_log_date;
        
        if (lastWeightLogDate === today) {
          console.log(`✅ User ${userEmail} already logged weight today`);
          skippedCount++;
          return;
        }
        
        await sendReminderEmail(userEmail, userData.name || 'there');
        reminderCount++;
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing user ${userId}:`, error);
      }
    });
    
    await Promise.all(promises);
    
    const result = {
      success: true,
      message: 'Test completed successfully',
      remindersSent: reminderCount,
      skipped: skippedCount,
      errors: errorCount,
      totalUsers: usersSnapshot.size,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Test completed:', result);
    res.status(200).json(result);
    
  } catch (error) {
    console.error('❌ Test function failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Helper function to send reminder email via nodemailer
 */
async function sendReminderEmail(email, userName) {
  if (!transporter) {
    console.log('📧 Nodemailer not available, simulating email send to:', email);
    return;
  }
  
  const fromEmail = functions.config().gmail?.user || process.env.GMAIL_USER || 'noreply@caloriemate.com';
  const appUrl = functions.config().app?.url || process.env.APP_URL || 'https://caloriemate.com';
  
  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: '⏰ Daily Weight Logging Reminder - CalorieMate',
    html: `
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
            <h2>Hello ${userName}!</h2>
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
    `,
    text: `
      ⏰ Daily Weight Logging Reminder - CalorieMate

      Hello ${userName}!

      Don't forget to log your weight today in CalorieMate to keep track of your health journey.

      Consistent weight tracking helps you:
      - Monitor your progress
      - Stay motivated  
      - Achieve your health goals

      Log your weight now: ${appUrl}

      This is an automated reminder. You can disable these emails in your app settings.

      CalorieMate - Your Health Companion
      © ${new Date().getFullYear()} CalorieMate. All rights reserved.
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${email}:`, error);
    throw error;
  }
} 