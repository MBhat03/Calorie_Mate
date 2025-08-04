import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

const profileForm = document.getElementById('profileForm');
const messageDiv = document.getElementById('message');
const loadingDiv = document.getElementById('loading');

function showLoading(show) {
  if (loadingDiv) loadingDiv.style.display = show ? 'block' : 'none';
}

// ✅ FIXED: Updated showMessage function with persistent display
function showMessage(msg, type = 'success') {
  if (!messageDiv) return;
  
  // Clear any existing message first
  messageDiv.innerHTML = '';
  
  messageDiv.innerHTML = `
    <div class="flex items-center justify-between p-4 rounded-lg ${type === 'success' ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'} mb-4">
      <div class="flex items-center space-x-3">
        <i class="fas fa-${type === 'success' ? 'check-circle text-green-400' : 'exclamation-circle text-red-400'} text-lg"></i>
        <span class="${type === 'success' ? 'text-green-300' : 'text-red-300'} font-medium text-base">${msg}</span>
      </div>
      <button onclick="this.parentElement.parentElement.innerHTML=''" class="text-gray-400 hover:text-white ml-4 text-lg hover:bg-gray-600/30 rounded p-1 transition-colors">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  
  // FIXED: Messages now stay for 60 seconds instead of auto-hiding
  // Users must manually close them or they stay visible
  setTimeout(() => {
    if (messageDiv && messageDiv.innerHTML) {
      messageDiv.innerHTML = '';
    }
  }, 60000); // Changed from 20000 to 60000 (60 seconds)
}

function getValue(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing field: ${id}`);
  return el.value;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '/login';
    return;
  }

  // ✅ Check email verification before allowing profile access
  if (!user.emailVerified) {
    await auth.signOut();
    window.location.href = '/login';
    return;
  }

  showLoading(true);
  
  // Fetch user profile from Firestore
  const userDocRef = doc(db, 'Users', user.uid);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      if (document.getElementById('name')) document.getElementById('name').value = data.name || '';
      if (document.getElementById('age')) document.getElementById('age').value = data.age || '';
      if (document.getElementById('gender')) document.getElementById('gender').value = data.gender || '';
      if (document.getElementById('height')) document.getElementById('height').value = data.height || '';
      if (document.getElementById('weight')) document.getElementById('weight').value = data.weight || '';
      if (document.getElementById('activity_level')) document.getElementById('activity_level').value = data.activity_level || '';
      if (document.getElementById('goal')) document.getElementById('goal').value = data.goal || '';
      if (document.getElementById('region')) document.getElementById('region').value = data.region || '';
    }
    showLoading(false);
  } catch (err) {
    showLoading(false);
    showMessage('❌ Failed to load profile: ' + err.message, 'error');
  }

  profileForm.onsubmit = async function(e) {
    e.preventDefault();
    
    // Clear any existing messages
    showMessage('');
    showLoading(true);
    
    try {
      // ✅ Double-check email verification before saving profile changes
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.emailVerified) {
        await auth.signOut();
        window.location.href = '/login';
        return;
      }

      // Validate fields
      const name = getValue('name').trim();
      const age = parseInt(getValue('age'));
      const gender = getValue('gender');
      const height = parseFloat(getValue('height'));
      const weight = parseFloat(getValue('weight'));
      const activity_level = getValue('activity_level');
      const goal = getValue('goal');
      const region = getValue('region').trim();
      
      if (!name || !age || !gender || !height || !weight || !activity_level || !goal || !region) {
        showLoading(false);
        showMessage('❌ Please fill in all fields completely.', 'error');
        return;
      }
      
      // Additional validation
      if (age < 10 || age > 120) {
        showLoading(false);
        showMessage('❌ Please enter a valid age between 10 and 120.', 'error');
        return;
      }
      
      if (height < 100 || height > 250) {
        showLoading(false);
        showMessage('❌ Please enter a valid height between 100cm and 250cm.', 'error');
        return;
      }
      
      if (weight < 30 || weight > 300) {
        showLoading(false);
        showMessage('❌ Please enter a valid weight between 30kg and 300kg.', 'error');
        return;
      }
      
      const updatedData = {
        name, age, gender, height, weight, activity_level, goal, region,
        updated_at: new Date().toISOString()
      };
      
      console.log('Attempting to update profile with:', updatedData);
      await setDoc(userDocRef, updatedData, { merge: true });
      showLoading(false);
      
      // ✅ FIXED: Better success message with more information
      showMessage(`✅ Profile updated successfully! Your changes have been saved and will be reflected across the app.`, 'success');
      
      // Redirect after a longer delay to allow user to see the success message
      setTimeout(() => {
        window.location.replace('/dashboard');
      }, 2000); // Increased from immediate to 2 seconds
      
    } catch (err) {
      showLoading(false);
      console.error('Profile update error:', err);
      
      // ✅ FIXED: More detailed error messages
      let errorMessage = '❌ Failed to update profile. ';
      if (err.code === 'permission-denied') {
        errorMessage += 'You do not have permission to update this profile.';
      } else if (err.code === 'unavailable') {
        errorMessage += 'Service is temporarily unavailable. Please try again later.';
      } else if (err.code === 'unauthenticated') {
        errorMessage += 'Authentication expired. Please log in again.';
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      } else {
        errorMessage += err.message || 'An unexpected error occurred. Please try again.';
      }
      
      showMessage(errorMessage, 'error');
    }
  };
});

// ✅ FIXED: Enhanced resend verification email function with better feedback
window.resendVerificationEmail = async function() {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    // Show loading state
    showMessage('📧 Sending verification email...', 'success');
    
    try {
      await sendEmailVerification(user);
      showMessage(`✅ Verification email sent successfully to ${user.email}! Please check your inbox and spam folder. The email may take a few minutes to arrive.`, 'success');
    } catch (error) {
      console.error('Failed to send verification email:', error);
      let errorMsg = '❌ Failed to send verification email. ';
      
      if (error.code === 'too-many-requests') {
        errorMsg += 'Too many requests. Please wait a few minutes before trying again.';
      } else if (error.code === 'auth/user-token-expired') {
        errorMsg += 'Session expired. Please log in again.';
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      } else {
        errorMsg += error.message || 'Please try again later.';
      }
      
      showMessage(errorMsg, 'error');
    }
  } else if (user && user.emailVerified) {
    showMessage('✅ Your email is already verified!', 'success');
  } else {
    showMessage('❌ No user logged in. Please log in first.', 'error');
  }
};