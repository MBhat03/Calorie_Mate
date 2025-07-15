console.log('Calorie Mate SPA JS loaded');
// --- Firebase Modular SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyCofMBIvGlQRaKsPc9k7MkwjhBkdzoHo84",
  authDomain: "calorie-mate-4503.firebaseapp.com",
  projectId: "calorie-mate-4503",
  appId: "1:788288090415:web:9db8031566a7f40aaab1da"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------------------------- LOGIN PAGE ---------------------------- //
if (document.getElementById('loginForm')) {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const errorDiv = document.getElementById('error-message');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const spinner = document.getElementById('spinner');

  function showError(msg, color = 'text-red-500') {
    errorDiv.textContent = msg;
    errorDiv.classList.remove('hidden', 'text-green-500', 'text-red-500');
    errorDiv.classList.add(color);
  }

  function hideError() {
    errorDiv.textContent = '';
    errorDiv.classList.add('hidden');
  }

  function setLoading(isLoading) {
    loginBtn.disabled = isLoading;
    registerBtn.disabled = isLoading;
    spinner.classList.toggle('hidden', !isLoading);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    hideError();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!isValidEmail(email)) return showError('Please enter a valid email address.');
    if (!password) return showError('Please enter your password.');

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'index.html';
    } catch (err) {
      showError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  });

  registerBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    hideError();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!isValidEmail(email)) return showError('Please enter a valid email address.');
    if (!password || password.length < 6) return showError('Password must be at least 6 characters.');

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      showError('Registration successful! You can now log in.', 'text-green-500');
    } catch (err) {
      showError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  });
}

// ---------------------------- INDEX PAGE ---------------------------- //
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = 'login.html';

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
    setTimeout(refreshDashboard, 200);
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
      const calorieTarget = calculateCalorieTarget(bmr, userData.activity, userData.goal);

      // Display results
      document.getElementById('bmiValue').textContent = bmi;
      document.getElementById('bmiStatus').textContent = getBMIStatus(bmi);
      document.getElementById('bmrValue').textContent = bmr;
      document.getElementById('calorieTarget').textContent = calorieTarget;
      document.getElementById('userAge').textContent = userData.age;

      // Store user data temporarily
      localStorage.setItem('tempUserData', JSON.stringify(userData));
      
      showScreen('results');
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
          refreshDashboard();
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
    s.classList.remove('active');
    console.log('Hiding screen:', s.id);
  });
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    console.log('Showing screen:', id);
  } else {
    console.warn('No element found for screen:', id);
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
      refreshDashboard();
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
window.refreshDashboard = refreshDashboard;
window.saveUser = saveUser;

// Global function to show dashboard and refresh after a short delay
window.showDashboard = function () {
  showScreen('dashboard');
  setTimeout(refreshDashboard, 300);
};

// Toggle mobile navigation
window.toggleMobileNav = function() {
  const mobileNav = document.getElementById('mobileNav');
  mobileNav.classList.toggle('active');
};
