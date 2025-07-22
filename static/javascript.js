// --- Meals Tab Visibility Logic ---
// Replace 'mealsTab' with the actual ID or class of your Meals nav item if different
function updateMealsTabVisibility() {
  // Use user-specific key if user is logged in
  let show = false;
  let userId = null;
  try {
    // Try to get userId from Firebase Auth if available
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
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Listen for auth state and update tab visibility accordingly
onAuthStateChanged(auth, user => {
  if (user) {
    window.firebaseAuthUser = user;
    window.localStorage.setItem('lastUserId', user.uid);
  } else {
    window.firebaseAuthUser = null;
  }
  updateMealsTabVisibility();
});
// Listen for changes from settings.js or other tabs
window.addEventListener('mealsEnabledChanged', updateMealsTabVisibility);
console.log('Calorie Mate SPA JS loaded');

// ---------------------------- LOGIN PAGE FOR login.html ---------------------------- //
if (window.location.pathname.endsWith('/login') || window.location.pathname.endsWith('/login.html')) {
  // Tab switching
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

  // Show onboarding if ?edit=true
  if (window.location.search.includes('edit=true')) {
    loginFormDiv.style.display = 'none';
    registerFormDiv.style.display = 'none';
    onboardingForm.style.display = 'block';
    loginTab.classList.remove('active');
    registerTab.classList.remove('active');
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
  }

  // Login logic
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = '/dashboard';
    } catch (err) {
      let msg = err.message;
      if (msg.includes('user-not-found')) msg = 'No user found with this email.';
      if (msg.includes('wrong-password')) msg = 'Incorrect password.';
      if (msg.includes('invalid-email')) msg = 'Please enter a valid email address.';
      errorDiv.textContent = msg;
      errorDiv.classList.remove('hidden');
    }
  });

  // Registration logic
  const registerForm = document.getElementById('registerForm');
  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (password !== confirmPassword) {
      errorDiv.textContent = 'Passwords do not match';
      errorDiv.classList.remove('hidden');
      return;
    }
    if (!name) {
      errorDiv.textContent = 'Please enter your full name';
      errorDiv.classList.remove('hidden');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Redirect to onboarding
      window.location.href = '/login?edit=true';
    } catch (err) {
        let msg = err.message;
      if (msg.includes('email-already-in-use')) msg = 'This email is already registered. Please log in instead.';
        if (msg.includes('weak-password')) msg = 'Password should be at least 6 characters.';
        if (msg.includes('invalid-email')) msg = 'Please enter a valid email address.';
      errorDiv.textContent = msg;
      errorDiv.classList.remove('hidden');
    }
  });

  // Onboarding form logic
  onboardingForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      errorDiv.textContent = 'Not authenticated. Please log in again.';
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
    // Calculate health metrics
    const bmi = (updatedData.weight / Math.pow(updatedData.height / 100, 2)).toFixed(1);
    const bmr = calculateBMR(updatedData);
    updatedData.bmi = bmi;
    updatedData.bmr = bmr;
        try {
      await setDoc(doc(db, 'Users', user.uid), updatedData, { merge: true });
          window.location.href = '/dashboard';
        } catch (err) {
      errorDiv.textContent = 'Failed to update profile: ' + err.message;
      errorDiv.classList.remove('hidden');
    }
  });
}

// ---------------------------- INDEX PAGE ---------------------------- //
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

onAuthStateChanged(auth, async user => {
  if (!user && window.location.pathname !== '/login') {
    window.location.href = '/login';
    return;
  }

  // Check if this is a new user registration
  const isNewUser = sessionStorage.getItem('isNewUserRegistration');
  if (isNewUser) {
    // Clear the flag and redirect to onboarding
    sessionStorage.removeItem('isNewUserRegistration');
    showScreen('onboarding');
    return;
  }

  const userDoc = await getDoc(doc(db, 'Users', user.uid));
  const screenParam = getQueryParam('screen');
  console.log('DEBUG: screenParam =', screenParam);
  if (screenParam === 'onboarding') {
    // Always show onboarding if explicitly requested
    showScreen('onboarding');
  } else if (screenParam) {
    // Show other screens from query param
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

  // Handle onboarding form submission
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

      // Calculate health metrics
      const bmi = (userData.weight / Math.pow(userData.height / 100, 2)).toFixed(1);
      const bmr = calculateBMR(userData);
      userData.bmi = bmi;
      userData.bmr = bmr;

      // Save to Firestore
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'Users', user.uid), userData, { merge: true });
      }
      // Optionally, store in localStorage for dashboard display
      localStorage.setItem('userDetails', JSON.stringify(userData));
      // Redirect to dashboard with BMI/BMR in query params
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
        // Add a success message above the form
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
        // Add a link to view today's entry in history
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



// --- Utility Functions ---
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
    // Only warn if on index.html (SPA), not on other pages
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
function showMessage(message, type = 'success') {
  const container = document.getElementById('messageContainer');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `glass-card p-4 mb-4 ${type === 'success' ? 'border-green-500' : 'border-red-500'} border-l-4`;
  div.innerHTML = `<div class="flex items-center"><i class="fas fa-${type === 'success' ? 'check-circle text-green-400' : 'exclamation-circle text-red-400'} mr-2"></i><span class="text-white">${message}</span></div>`;
  container.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

// --- Health Calculation Functions ---
function calculateBMR(userData) {
  // Mifflin-St Jeor Equation
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

// --- Save User Function ---
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

// Expose to HTML
window.showScreen = showScreen;
// window.refreshDashboard = refreshDashboard; // This line is removed as per the edit hint.
window.saveUser = saveUser;

// Global function to show dashboard and refresh after a short delay
window.showDashboard = function () {
  showScreen('dashboard');
  setTimeout(() => {
    if (typeof refreshDashboard === 'function') {
      refreshDashboard();
    }
  }, 300);
};

// Toggle mobile navigation
window.toggleMobileNav = function() {
  const mobileNav = document.getElementById('mobileNav');
  mobileNav.classList.toggle('active');
};

// --- Live Health Metrics Calculation for Onboarding/Profile Form ---
(function setupLiveHealthMetrics() {
  const onboardingForm = document.getElementById('onboardingForm');
  const displayDiv = document.getElementById('healthMetricsDisplay');
  if (!onboardingForm || !displayDiv) return;

  // Helper to get current form values
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
    // Only show if all required fields are filled
    if (!data.age || !data.gender || !data.height || !data.weight || !data.activity || !data.goal) {
      displayDiv.style.display = 'none';
      displayDiv.innerHTML = '';
      return;
    }
    // Calculate metrics
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

  // Listen for changes on all relevant fields
  ['age','gender','height','weight','activity','goal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateMetricsDisplay);
    if (el && el.tagName === 'SELECT') el.addEventListener('change', updateMetricsDisplay);
  });

  // Initial call in case fields are pre-filled
  updateMetricsDisplay();
})();

// ---------------------------- MEALS PAGE: Show BMI, BMR, Calories ---------------------------- //
if (window.location.pathname.endsWith('/meals') || window.location.pathname.endsWith('/meals.html')) {

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    const userDoc = await getDoc(doc(db, 'Users', user.uid));
    if (!userDoc.exists()) return;
    const data = userDoc.data();
    // Fetch latest weight log
    let latestWeight = data.weight;
    try {
      const weightsRef = collection(db, `Users/${user.uid}/weights`);
      const snapshot = await getDocs(query(weightsRef, orderBy("date", "asc")));
      const dateWeightPairs = [];
      snapshot.forEach(docSnap => {
        const w = docSnap.data();
        dateWeightPairs.push({ date: w.date, weight: w.weight });
      });
      if (dateWeightPairs.length > 0) {
        dateWeightPairs.sort((a, b) => new Date(a.date) - new Date(b.date));
        latestWeight = dateWeightPairs[dateWeightPairs.length - 1].weight;
      }
    } catch (e) {
      // If error, fallback to profile weight
    }
    // Calculate BMI, BMR, Calories
    const height = data.height;
    const weight = latestWeight;
    const age = data.age;
    const gender = data.gender;
    const activity = (data.activity || '').toLowerCase();
    let goal = (data.goal || '').toLowerCase();
    if (goal.includes('maintain')) goal = 'maintain';
    else if (goal.includes('lose')) goal = 'lose';
    else if (goal.includes('gain')) goal = 'gain';
    let bmi = '--', bmr = '--', calories = '--';
    if (height && weight && age && gender && activity && goal) {
      bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);
      if (gender.toLowerCase() === 'male') {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
      } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
      }
      bmr = Math.round(bmr);
      const activityMultipliers = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'active': 1.725,
        'very active': 1.9
      };
      const tdee = bmr * (activityMultipliers[activity] || 1.2);
      const goalAdjustments = {
        'maintain': 0,
        'lose': -500,
        'gain': 500
      };
      calories = Math.round(tdee + (goalAdjustments[goal] || 0));
    }
    // Display
    const bmiInfo = document.getElementById('bmi-info');
    const calorieInfo = document.getElementById('calorie-info');
    if (bmiInfo) bmiInfo.textContent = `BMI: ${bmi} | BMR: ${bmr}`;
    if (calorieInfo) calorieInfo.textContent = `Calorie Goal: ${calories} kcal/day`;
  });
}
