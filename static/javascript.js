// --- Meals Tab Visibility Logic ---
function updateMealsTabVisibility() {
  let show = false;
  let userId = null;
  try {
    if (window.firebaseAuthUser && window.firebaseAuthUser.uid) {
      userId = window.firebaseAuthUser.uid;
    } else if (window.localStorage.getItem('lastUserId')) {
      userId = window.localStorage.getItem('lastUserId');
    }
  } catch (e) {}
  if (userId) {
    show = localStorage.getItem(`mealsEnabled_${userId}`) !== 'false';
  } else {
    show = localStorage.getItem('mealsEnabled') !== 'false';
  }
  const mealsTab = document.getElementById('mealsTab');
  if (mealsTab) {
    mealsTab.style.display = show ? '' : 'none';
  }
}

import { auth, db } from './js/firebase-config.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Listen for auth state and update tab visibility accordingly
onAuthStateChanged(auth, async user => {
  if (user) {
    // ✅ Check email verification for all authenticated users
    if (!user.emailVerified) {
      await auth.signOut();
      if (window.location.pathname !== '/login' && !window.location.pathname.endsWith('/login.html')) {
        window.location.href = '/login';
      }
      return;
    }
    
    window.firebaseAuthUser = user;
    window.localStorage.setItem('lastUserId', user.uid);
  } else {
    window.firebaseAuthUser = null;
  }
  updateMealsTabVisibility();
});

window.addEventListener('mealsEnabledChanged', updateMealsTabVisibility);
console.log('Calorie Mate SPA JS loaded');

// ✅ ADDED: Test function to verify email verification is working
window.testEmailVerification = async function(email, password) {
  console.log('🧪 Testing email verification for:', email);
  
  try {
    // Create user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("✅ User created:", user.email);
    
          // Send verification email - let Firebase handle the redirect
      sendEmailVerification(user)
        .then(() => {
          console.log("📧 Verification email sent to:", user.email);
          alert("Verification email sent! Please check your inbox.");
        })
        .catch((error) => {
          console.error("Error sending verification:", error);
          alert("Error: " + error.message);
        });
    
    // Sign out
    await signOut(auth);
    console.log("🚪 User signed out");
    
    alert("✅ Test successful! Verification email sent to " + email);
    return true;
  } catch (error) {
    console.error("❌ Test failed:", error.code, error.message);
    alert("❌ Test failed: " + error.message);
    return false;
  }
};

// ✅ ADDED: Reusable showError function for consistent error handling
function showError(message, duration = 5000) {
  const errorDiv = document.getElementById('error-message');
  if (!errorDiv) return;
  
  // Determine message type based on content
  let messageType = 'error';
  let icon = 'exclamation-circle';
  let bgColor = 'bg-red-500/20';
  let borderColor = 'border-red-500/30';
  let textColor = 'text-red-400';
  
  if (message.includes('✅') || message.includes('Successfully') || message.includes('sent')) {
    messageType = 'success';
    icon = 'check-circle';
    bgColor = 'bg-green-500/20';
    borderColor = 'border-green-500/30';
    textColor = 'text-green-400';
  } else if (message.includes('⚠') || message.includes('Please verify')) {
    messageType = 'warning';
    icon = 'exclamation-triangle';
    bgColor = 'bg-yellow-500/20';
    borderColor = 'border-yellow-500/30';
    textColor = 'text-yellow-400';
  }
  
  errorDiv.innerHTML = `
    <div class="${bgColor} border ${borderColor} rounded-lg p-4">
      <div class="flex items-center space-x-2">
        <i class="fas fa-${icon} ${textColor}"></i>
        <span class="text-white font-medium">${message}</span>
      </div>
    </div>
  `;
  errorDiv.classList.remove('hidden');
  
  // Clear the message after the specified duration
  setTimeout(() => {
    if (errorDiv) {
      errorDiv.classList.add('hidden');
      errorDiv.innerHTML = '';
    }
  }, duration);
}

// ---------------------------- LOGIN PAGE FOR login.html ---------------------------- //
if (window.location.pathname.endsWith('/login') || window.location.pathname.endsWith('/login.html')) {
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const loginFormDiv = document.getElementById('login-form');
  const registerFormDiv = document.getElementById('register-form');
  const onboardingForm = document.getElementById('onboardingForm');
  const errorDiv = document.getElementById('error-message');

  function showLogin() {
    loginFormDiv.style.display = 'block';
    registerFormDiv.style.display = 'none';
    onboardingForm.style.display = 'none';
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
  }
  function showRegister() {
    loginFormDiv.style.display = 'none';
    registerFormDiv.style.display = 'block';
    onboardingForm.style.display = 'none';
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
  }
  window.showLogin = showLogin;
  window.showRegister = showRegister;

  if (window.location.search.includes('edit=true')) {
    loginFormDiv.style.display = 'none';
    registerFormDiv.style.display = 'none';
    onboardingForm.style.display = 'block';
    loginTab.classList.remove('active');
    registerTab.classList.remove('active');
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
  }

  // ✅ ADDED: Show verification notice if coming from registration
  window.addEventListener("DOMContentLoaded", () => {
    // Check for verification success from email link
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true") {
      const errorDiv = document.getElementById('error-message');
      errorDiv.innerHTML = `
        <div class="text-green-400 space-y-3">
          <div class="flex items-center space-x-2">
            <i class="fas fa-check-circle text-green-400 text-lg"></i>
            <p class="font-semibold text-lg">✅ Email verified successfully! Please log in.</p>
          </div>
        </div>
      `;
      errorDiv.classList.remove('hidden');
      
      // Clear the URL parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
    
    // Check for verification notice from registration
    const notice = localStorage.getItem("verificationNotice");
    if (notice) {
      const errorDiv = document.getElementById('error-message');
      errorDiv.innerHTML = `
        <div class="text-green-400 space-y-3">
          <div class="flex items-center space-x-2">
            <i class="fas fa-check-circle text-green-400 text-lg"></i>
            <p class="font-semibold text-lg">${notice}</p>
          </div>
        </div>
      `;
      errorDiv.classList.remove('hidden');
      localStorage.removeItem("verificationNotice");
    }
  });

  // ✅ FIXED: Login logic with proper email verification check
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    try {
      console.log('🔐 Attempting login for:', email);
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;
      console.log("✅ Login successful for:", user.email);
      
      // Check if email is verified
      if (!user.emailVerified) {
        console.log("⚠️ Email not verified for:", user.email);
        // Force sign out if not verified
        await auth.signOut();
        showError("⚠ Please verify your email before logging in.", 5000);
        return;
      }
      
      console.log("✅ Email verified, redirecting to dashboard");
      // If verified, continue to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      let msg = err.message;
      if (msg.includes('user-not-found')) msg = '❌ No user found with this email address.';
      if (msg.includes('wrong-password')) msg = '❌ Incorrect password. Please try again.';
      if (msg.includes('invalid-email')) msg = '❌ Please enter a valid email address.';
      if (msg.includes('too-many-requests')) msg = '❌ Too many failed attempts. Please try again later.';
      
      showError(msg, 5000);
    }
  });

  // ✅ FIXED: Registration logic with proper email verification flow
  const registerForm = document.getElementById('registerForm');
  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('🎯 Registration form submitted!');
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
      showError("❌ Passwords do not match", 5000);
      return;
    }
    if (!name) {
      showError("❌ Please enter your full name", 5000);
      return;
    }
    
    try {
      console.log('🚀 Starting registration for:', email);
      
      // Create user account
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;
      console.log("✅ User created:", user.email);
      
      // Send verification email - let Firebase handle the redirect
      sendEmailVerification(user)
        .then(() => {
          console.log("📧 Verification email sent to:", user.email);
          alert("Verification email sent! Please check your inbox.");
          
          // Sign out immediately to prevent auto-login
          auth.signOut();
          console.log("🚪 User signed out after registration");
          
          // Store verification notice for login page
          localStorage.setItem("verificationNotice", `Verification email sent to ${email}! Please check your inbox before logging in.`);
        })
        .catch((error) => {
          console.error("Error sending verification:", error);
          alert("Error: " + error.message);
          
          // Sign out on error too
          auth.signOut();
        });
      
    } catch (err) {
      console.error("❌ Registration error:", err.code, err.message);
      let msg = err.message;
      if (msg.includes('email-already-in-use')) msg = '❌ This email is already registered. Please log in instead.';
      if (msg.includes('weak-password')) msg = '❌ Password should be at least 6 characters.';
      if (msg.includes('invalid-email')) msg = '❌ Please enter a valid email address.';
      
      showError(msg, 5000);
    }
  });

  // ✅ FIXED: Onboarding form logic with email verification check
  onboardingForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const user = auth.currentUser;
    
    if (!user) {
      errorDiv.innerHTML = `
        <div class="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <i class="fas fa-exclamation-circle text-red-400"></i>
            <span class="text-white font-medium">❌ Not authenticated. Please log in again.</span>
          </div>
        </div>
      `;
      errorDiv.classList.remove('hidden');
      return;
    }
    
    if (!user.emailVerified) {
      await auth.signOut();
      errorDiv.innerHTML = `
        <div class="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <i class="fas fa-exclamation-triangle text-yellow-400"></i>
            <span class="text-white font-medium">⚠️ Email not verified. Please verify your email and log in again.</span>
          </div>
        </div>
      `;
      errorDiv.classList.remove('hidden');
      return;
    }
    
    const updatedData = {
      name: document.getElementById('name').value,
      age: parseInt(document.getElementById('age').value),
      gender: document.getElementById('gender').value,
      height: parseFloat(document.getElementById('height').value),
      weight: parseFloat(document.getElementById('weight').value),
      activity: document.getElementById('activity').value,
      goal: document.getElementById('goal').value,
      region: document.getElementById('region').value,
      updated_at: new Date().toISOString()
    };
    
    const bmi = (updatedData.weight / Math.pow(updatedData.height / 100, 2)).toFixed(1);
    const bmr = calculateBMR(updatedData);
    updatedData.bmi = bmi;
    updatedData.bmr = bmr;
    
    try {
      await setDoc(doc(db, 'Users', user.uid), updatedData, { merge: true });
      window.location.href = '/dashboard';
    } catch (err) {
      errorDiv.innerHTML = `
        <div class="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <i class="fas fa-exclamation-circle text-red-400"></i>
            <span class="text-white font-medium">❌ Failed to update profile: ${err.message}</span>
          </div>
        </div>
      `;
      errorDiv.classList.remove('hidden');
    }
  });
  
  // ✅ ADDED: Resend verification email function
  window.resendVerificationEmail = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
      showError("Please enter your email and password first", 5000);
      return;
    }
    
    try {
      // Sign in temporarily to get user object
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;
      
      if (user.emailVerified) {
        await auth.signOut();
        showError("Your email is already verified! You can log in now.", 5000);
        return;
      }
      
      // Send verification email - let Firebase handle the redirect
      sendEmailVerification(user)
        .then(() => {
          console.log("📧 Verification email sent to:", user.email);
          alert("Verification email sent! Please check your inbox.");
          auth.signOut();
        })
        .catch((error) => {
          console.error("Error sending verification:", error);
          alert("Error: " + error.message);
          auth.signOut();
        });
    } catch (err) {
      await auth.signOut();
      let msg = err.message;
      if (msg.includes('user-not-found')) msg = '❌ No user found with this email address.';
      if (msg.includes('wrong-password')) msg = '❌ Incorrect password. Please try again.';
      
      showError(msg, 5000);
    }
  };
}

// Rest of your code remains the same...
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

onAuthStateChanged(auth, async user => {
  if (!user && window.location.pathname !== '/login') {
    window.location.href = '/login';
    return;
  }

  if (user && !user.emailVerified) {
    await auth.signOut();
    window.location.href = '/login';
    return;
  }

  const isNewUser = sessionStorage.getItem('isNewUserRegistration');
  if (isNewUser) {
    sessionStorage.removeItem('isNewUserRegistration');
    showScreen('onboarding');
    return;
  }

  if (user) {
    const userDoc = await getDoc(doc(db, 'Users', user.uid));
    const screenParam = getQueryParam('screen');
    console.log('DEBUG: screenParam =', screenParam);
    if (screenParam === 'onboarding') {
      showScreen('onboarding');
    } else if (screenParam) {
      showScreen(screenParam);
    } else if (userDoc.exists()) {
      localStorage.setItem('userDetails', JSON.stringify(userDoc.data()));
      console.log('DEBUG: Showing dashboard');
      showScreen('dashboard');
      if (typeof refreshDashboard === 'function') {
        refreshDashboard();
      }
    } else {
      console.log('DEBUG: Showing onboarding');
      showScreen('onboarding');
    }

    if (document.getElementById('onboardingForm')) {
      document.getElementById('onboardingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = {
          name: formData.get('name'),
          age: parseInt(formData.get('age')),
          gender: formData.get('gender'),
          height: parseFloat(formData.get('height')),
          weight: parseFloat(formData.get('weight')),
          activity: formData.get('activity'),
          goal: formData.get('goal'),
          region: formData.get('region'),
          created_at: new Date().toISOString()
        };

        const bmi = (userData.weight / Math.pow(userData.height / 100, 2)).toFixed(1);
        const bmr = calculateBMR(userData);
        userData.bmi = bmi;
        userData.bmr = bmr;

        const user = auth.currentUser;
        if (user) {
          await setDoc(doc(db, 'Users', user.uid), userData, { merge: true });
        }
        localStorage.setItem('userDetails', JSON.stringify(userData));
        window.location.href = '/?screen=dashboard&bmi=' + bmi + '&bmr=' + bmr;
      });
    }

    if (user && document.getElementById('weightForm')) {
      const today = new Date().toISOString().split('T')[0];
      const weightInput = document.getElementById('currentWeight');
      const weightDateInput = document.getElementById('weightDate');
      const submitBtn = document.querySelector('#weightForm button[type="submit"]');

      weightDateInput.value = today;
      weightDateInput.readOnly = true;

      const weightDocRef = doc(db, `Users/${user.uid}/weights`, today);
      const existing = await getDoc(weightDocRef);
      if (existing.exists()) {
        if (weightInput) {
          weightInput.disabled = true;
          weightInput.value = existing.data().weight;
          weightInput.classList.add('opacity-50', 'cursor-not-allowed');
        }
        if (weightDateInput) {
          weightDateInput.disabled = true;
          weightDateInput.classList.add('opacity-50', 'cursor-not-allowed');
        }
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
          submitBtn.innerHTML = `
            <i class="fas fa-check-circle text-green-400 mr-2"></i> Weight Already Logged Today
            <span class="ml-2 relative group">
              <i class="fas fa-info-circle text-blue-400 cursor-pointer hover:text-blue-300 transition-colors"></i>
              <span class="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition duration-300 z-50 whitespace-nowrap shadow-lg border border-gray-600">
                <i class="fas fa-calendar-check mr-1"></i> You've already logged weight for today. Come back tomorrow!
              </span>
            </span>
          `;
          const form = document.getElementById('weightForm');
          const successMsg = document.createElement('div');
          successMsg.className = 'bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6 text-center';
          successMsg.innerHTML = `
            <div class="flex items-center justify-center space-x-2">
              <i class="fas fa-check-circle text-green-400 text-lg"></i>
              <span class="text-green-300 font-medium">Today's weight (${existing.data().weight} kg) has been logged successfully!</span>
            </div>
          `;
          form.parentElement.insertBefore(successMsg, form);
          const historyLink = document.createElement('div');
          historyLink.className = 'text-center mt-4';
          historyLink.innerHTML = `
            <a href="#weightHistory" class="inline-flex items-center text-blue-300 hover:text-blue-200 transition-colors text-sm">
              <i class="fas fa-history mr-1"></i> View today's entry in history
            </a>
          `;
          submitBtn.parentElement.appendChild(historyLink);
        }
      } else {
        document.getElementById('weightForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const weight = parseFloat(weightInput.value);
          if (isNaN(weight)) return showMessage('Enter valid weight.', 'error');

          showLoading();
          try {
            await setDoc(weightDocRef, {
              weight,
              date: today,
              created_at: new Date().toISOString()
            }, { merge: true });

            showMessage('Weight saved for today!');
            await loadWeightHistory(user);
            if (typeof refreshDashboard === 'function') {
            refreshDashboard();
            }
          } catch (error) {
            console.error(error);
            showMessage('Failed to save weight.', 'error');
          } finally {
            hideLoading();
          }
        });
      }

      loadWeightHistory(user);
    }
  }
});

async function loadWeightHistory(user) {
  const weightRef = collection(db, `Users/${user.uid}/weights`);
  const snapshot = await getDocs(query(weightRef, orderBy("date", "desc")));
  const container = document.getElementById('weightHistory');
  if (!container) return;
  container.innerHTML = '';
  snapshot.forEach(doc => {
    const w = doc.data();
    const entry = document.createElement('div');
    entry.className = "bg-white/10 p-2 rounded text-white flex justify-between";
    entry.innerHTML = `<span>${new Date(w.date).toLocaleDateString()}</span><span>${w.weight} kg</span>`;
    container.appendChild(entry);
  });
}

function showScreen(id) {
  console.log('showScreen called with:', id);
  document.querySelectorAll('.screen').forEach(s => {
    if (s) {
    s.classList.remove('active');
    console.log('Hiding screen:', s.id);
    }
  });
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    console.log('Showing screen:', id);
  } else {
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
      console.warn('No element found for screen:', id);
    }
  }
}

function showLoading() {
  document.getElementById('loadingOverlay')?.classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loadingOverlay')?.classList.add('hidden');
}

// ✅ FIXED: Updated showMessage function with better persistence
function showMessage(message, type = 'success') {
  const container = document.getElementById('messageContainer');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `glass-card p-4 mb-4 ${type === 'success' ? 'border-green-500' : 'border-red-500'} border-l-4 transition-all duration-300`;
  div.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <i class="fas fa-${type === 'success' ? 'check-circle text-green-400' : 'exclamation-circle text-red-400'} mr-2"></i>
        <span class="text-white">${message}</span>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-white ml-4 text-sm">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  container.appendChild(div);
  
  // FIXED: Increased time to 30 seconds and removed opacity fade
  setTimeout(() => {
    if (div.parentElement) {
      div.remove();
    }
  }, 30000); // Changed from 15000 to 30000 (30 seconds)
}

function calculateBMR(userData) {
  let bmr;
  if (userData.gender === 'Male') {
    bmr = (10 * userData.weight) + (6.25 * userData.height) - (5 * userData.age) + 5;
  } else {
    bmr = (10 * userData.weight) + (6.25 * userData.height) - (5 * userData.age) - 161;
  }
  return Math.round(bmr);
}

function calculateCalorieTarget(bmr, activity, goal) {
  const activityMultipliers = {
    'Sedentary': 1.2,
    'Light': 1.375,
    'Moderate': 1.55,
    'Active': 1.725,
    'Very Active': 1.9
  };
  
  const tdee = bmr * activityMultipliers[activity];
  
  const goalAdjustments = {
    'Maintain Weight': 0,
    'Lose Weight': -500,
    'Gain Weight': 500
  };
  
  return Math.round(tdee + goalAdjustments[goal]);
}

function getBMIStatus(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

async function saveUser() {
  const user = auth.currentUser;
  if (!user) return;

  const tempData = localStorage.getItem('tempUserData');
  if (!tempData) {
    showMessage('No user data to save. Please complete the onboarding first.', 'error');
    return;
  }

  const userData = JSON.parse(tempData);
  
  showLoading();
  try {
    await setDoc(doc(db, 'Users', user.uid), userData);
    localStorage.removeItem('tempUserData');
    localStorage.setItem('userDetails', JSON.stringify(userData));
    showMessage('Profile saved successfully!');
    showScreen('dashboard');
    setTimeout(() => {
      if (typeof refreshDashboard === 'function') {
      refreshDashboard();
      }
    }, 500);
  } catch (error) {
    console.error('Error saving user:', error);
    showMessage('Failed to save profile. Please try again.', 'error');
  } finally {
    hideLoading();
  }
}

window.showScreen = showScreen;
window.saveUser = saveUser;

window.showDashboard = function () {
  showScreen('dashboard');
  setTimeout(() => {
    if (typeof refreshDashboard === 'function') {
      refreshDashboard();
    }
  }, 300);
};

window.toggleMobileNav = function() {
  const mobileNav = document.getElementById('mobileNav');
  mobileNav.classList.toggle('active');
};

(function setupLiveHealthMetrics() {
  const onboardingForm = document.getElementById('onboardingForm');
  const displayDiv = document.getElementById('healthMetricsDisplay');
  if (!onboardingForm || !displayDiv) return;

  function getFormData() {
    return {
      name: document.getElementById('name')?.value,
      age: parseInt(document.getElementById('age')?.value),
      gender: document.getElementById('gender')?.value,
      height: parseFloat(document.getElementById('height')?.value),
      weight: parseFloat(document.getElementById('weight')?.value),
      activity: document.getElementById('activity')?.value,
      goal: document.getElementById('goal')?.value,
      region: document.getElementById('region')?.value
    };
  }

  function updateMetricsDisplay() {
    const data = getFormData();
    if (!data.age || !data.gender || !data.height || !data.weight || !data.activity || !data.goal) {
      displayDiv.style.display = 'none';
      displayDiv.innerHTML = '';
      return;
    }
    const bmi = (data.weight / Math.pow(data.height / 100, 2)).toFixed(1);
    const bmr = calculateBMR(data);
    const calories = calculateCalorieTarget(bmr, data.activity, data.goal);
    const bmiStatus = getBMIStatus(bmi);
    displayDiv.style.display = '';
    displayDiv.innerHTML = `
      <div><strong>BMI:</strong> ${bmi} <span class="text-sm">(${bmiStatus})</span></div>
      <div><strong>BMR:</strong> ${bmr} kcal/day</div>
      <div><strong>Recommended Calories for Goal:</strong> ${calories} kcal/day</div>
    `;
  }

  ['age','gender','height','weight','activity','goal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateMetricsDisplay);
    if (el && el.tagName === 'SELECT') el.addEventListener('change', updateMetricsDisplay);
  });

  updateMetricsDisplay();
})();
