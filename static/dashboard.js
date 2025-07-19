import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCofMBIvGlQRaKsPc9k7MkwjhBkdzoHo84",
  authDomain: "calorie-mate-4503.firebaseapp.com",
  projectId: "calorie-mate-4503",
  storageBucket: "calorie-mate-4503.firebasestorage.app",
  messagingSenderId: "788288090415",
  appId: "1:788288090415:web:9db8031566a7f40aaab1da"

};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function refreshDashboard() {
    const user = auth.currentUser;
    if (!user) return;
  
    try {
      const userDoc = await getDoc(doc(db, 'Users', user.uid));
      if (!userDoc.exists()) return;
  
      const data = userDoc.data();
      // Debug: log user profile data
      console.log('User profile data:', data);
      document.getElementById('userName').textContent = data.name || '--';
      document.getElementById('userAgeDash').textContent = data.age || '--';
      document.getElementById('userGender').textContent = data.gender || '--';
      document.getElementById('userHeight').textContent = data.height || '--';
      document.getElementById('userGoal').textContent = data.goal || '--';

      // Get all weights, find the most recent by date
      const weightsRef = collection(db, `Users/${user.uid}/weights`);
      const snapshot = await getDocs(query(weightsRef, orderBy("date", "asc")));
      const dates = [], weights = [], dateWeightPairs = [];
      snapshot.forEach(docSnap => {
        const w = docSnap.data();
        dates.push(new Date(w.date).toLocaleDateString());
        weights.push(w.weight);
        dateWeightPairs.push({ date: w.date, weight: w.weight });
      });
      // Find the latest weight by max date
      let latestWeight = data.weight;
      if (dateWeightPairs.length > 0) {
        dateWeightPairs.sort((a, b) => new Date(a.date) - new Date(b.date));
        latestWeight = dateWeightPairs[dateWeightPairs.length - 1].weight;
      }
      document.getElementById('userCurrentWeight').textContent = latestWeight || '--';

      // --- Health Metrics Calculation (using correct Firestore field names) ---
      const bmiValueEl = document.getElementById('bmiValue');
      const bmrValueEl = document.getElementById('bmrValue');
      const calorieValueEl = document.getElementById('calorieValue');
      // Use latestWeight if available, else data.weight
      const height = data.height;
      const weight = latestWeight || data.weight;
      const age = data.age;
      const gender = data.gender;
      const activity = (data.activity || '').toLowerCase();
      let goal = (data.goal || '').toLowerCase();
      if (goal.includes('maintain')) goal = 'maintain';
      else if (goal.includes('lose')) goal = 'lose';
      else if (goal.includes('gain')) goal = 'gain';
      // Debug: log values used for calculation
      console.log('Health metrics input:', {height, weight, age, gender, activity, goal});
      if (bmiValueEl && bmrValueEl && calorieValueEl && height && weight && age && gender && activity && goal) {
        // BMI
        const bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);
        // BMR
        let bmr;
        if (gender.toLowerCase() === 'male') {
          bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
        } else {
          bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
        }
        bmr = Math.round(bmr);
        // Calorie Target
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
        const calories = Math.round(tdee + (goalAdjustments[goal] || 0));
        bmiValueEl.textContent = bmi;
        bmrValueEl.textContent = bmr;
        calorieValueEl.textContent = calories;
      } else if (bmiValueEl && bmrValueEl && calorieValueEl) {
        bmiValueEl.textContent = '--';
        bmrValueEl.textContent = '--';
        calorieValueEl.textContent = '--';
      }
  
      const canvas = document.getElementById('weightChart');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        // ✅ Safely destroy previous chart
        if (window.weightChart instanceof Chart) {
          window.weightChart.destroy();
        }
  
        window.weightChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: dates,
            datasets: [{
              label: 'Weight (kg)',
              data: weights,
              borderColor: '#4F46E5',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              tension: 0.3,
              pointRadius: 4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            plugins: {
              title: { display: true, text: 'Weight Progress', color: '#fff' },
              legend: { labels: { color: '#fff' } }
            },
            scales: {
              x: { ticks: { color: '#fff' }, title: { display: true, text: 'Date', color: '#fff' } },
              y: { ticks: { color: '#fff' }, title: { display: true, text: 'Weight (kg)', color: '#fff' } }
            }
          }
        });
      }
    } catch (error) {
      console.error('Dashboard error:', error);
    }
  }

  window.refreshDashboard = refreshDashboard;
  window.showDashboard = function () {
    showScreen('dashboard');
    setTimeout(refreshDashboard, 300);
  };
  
  onAuthStateChanged(auth, (user) => {
    if (user) {
      refreshDashboard();
    } else {
      window.location.href = "/login"; // or wherever you want
    }
  });
  
// Show the Add Weight Entry form
window.showWeightForm = function () {
    const form = document.getElementById('weightEntryForm');
    if (form) form.classList.remove('hidden');
    const input = document.getElementById('weightInput');
    if (input) input.value = '';
};

// Hide the Add Weight Entry form
window.hideWeightForm = function () {
    const form = document.getElementById('weightEntryForm');
    if (form) form.classList.add('hidden');
};

// Submit the weight entry
window.submitWeight = async function (event) {
    event.preventDefault();
    const input = document.getElementById('weightInput');
    if (!input) return;
    const weight = parseFloat(input.value);
    if (isNaN(weight) || weight <= 0) {
        alert('Please enter a valid weight (greater than 0).');
        return;
    }
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('You must be logged in to add a weight entry.');
            return;
        }
        const userId = user.uid;
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const docRef = db.collection('users').doc(userId).collection('weightLogs').doc(dateStr);
        await docRef.set({
            weight: weight,
            date: dateStr,
            timestamp: new Date()
        });
        alert('Weight entry added successfully!');
        input.value = '';
        hideWeightForm();
        if (typeof refreshDashboard === 'function') {
            refreshDashboard(); // Optionally update chart/logs
        }
    } catch (err) {
        console.error('Error adding weight entry:', err);
        alert('Failed to add weight entry. Please try again.');
    }
};
  
// Show the fullscreen weight entry screen and hide the dashboard
window.showWeightEntryScreen = function () {
  const btn = document.getElementById('showWeightEntryBtn');
  const screen = document.getElementById('weightEntryScreen');
  if (btn) btn.classList.add('hidden');
  if (screen) screen.classList.remove('hidden');
  // Load weight entry UI state and history
  setupWeightEntryScreen();
};

// Hide the fullscreen weight entry screen and show the dashboard
window.hideWeightEntryScreen = function () {
  const btn = document.getElementById('showWeightEntryBtn');
  const screen = document.getElementById('weightEntryScreen');
  if (btn) btn.classList.remove('hidden');
  if (screen) screen.classList.add('hidden');
};

// --- Weight Entry Logic ---

async function setupWeightEntryScreen() {
  if (typeof auth === 'undefined' || typeof db === 'undefined') return;
  const user = auth.currentUser;
  if (!user) return;
  const todayObj = new Date();
  const yyyy = todayObj.getFullYear();
  const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
  const dd = String(todayObj.getDate()).padStart(2, '0');
  const today = `${yyyy}-${mm}-${dd}`;
  const weightInput = document.getElementById('currentWeight');
  const weightDateInput = document.getElementById('weightDate');
  const submitBtn = document.getElementById('addWeightBtn');
  const msgDiv = document.getElementById('weightFormMsg');
  const loggedCard = document.getElementById('weightLoggedCard');
  const loggedWeightValue = document.getElementById('loggedWeightValue');

  if (weightDateInput) {
    weightDateInput.value = today;
    weightDateInput.readOnly = true;
  }

  // Load weight history
  loadWeightHistory(user);

  // Always use YYYY-MM-DD for doc ID and 'date' field
  const weightDocRef = doc(db, `Users/${user.uid}/weights`, today);
  const existing = await getDoc(weightDocRef);
  if (existing.exists()) {
    // Hide form, show logged card, disable button
    if (document.getElementById('weightForm')) document.getElementById('weightForm').classList.add('hidden');
    if (loggedCard) loggedCard.classList.remove('hidden');
    if (loggedWeightValue) loggedWeightValue.textContent = `Today's weight: ${existing.data().weight} kg`;
    if (submitBtn) submitBtn.disabled = true;
  } else {
    // Show form, hide logged card, enable button
    if (document.getElementById('weightForm')) document.getElementById('weightForm').classList.remove('hidden');
    if (loggedCard) loggedCard.classList.add('hidden');
    if (weightInput) {
      weightInput.disabled = false;
      weightInput.value = '';
      weightInput.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    if (weightDateInput) {
      weightDateInput.disabled = true;
      weightDateInput.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      submitBtn.innerHTML = `Log Weight`;
    }
    if (msgDiv) msgDiv.innerHTML = '';
    document.getElementById('weightForm').onsubmit = async (e) => {
      e.preventDefault();
      const weight = parseFloat(weightInput.value);
      if (isNaN(weight) || weight < 10 || weight > 500) {
        msgDiv.innerHTML = `<span class='text-red-400'>Enter a valid weight (10-500 kg).</span>`;
        return;
      }
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class='fas fa-spinner fa-spin mr-2'></i>Saving...`;
      try {
        await setDoc(weightDocRef, {
          weight,
          date: today, // always YYYY-MM-DD
          created_at: new Date().toISOString()
        }, { merge: true });
        msgDiv.innerHTML = `<span class='text-green-400'>Weight saved for today!</span>`;
        await loadWeightHistory(user);
        if (typeof refreshDashboard === 'function') refreshDashboard();
        // After save, show the logged card and hide the form
        if (document.getElementById('weightForm')) document.getElementById('weightForm').classList.add('hidden');
        if (loggedCard) loggedCard.classList.remove('hidden');
        if (loggedWeightValue) loggedWeightValue.textContent = `Today's weight: ${weight} kg`;
        if (submitBtn) submitBtn.disabled = true;
      } catch (error) {
        msgDiv.innerHTML = `<span class='text-red-400'>Failed to save weight. Try again.</span>`;
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Log Weight`;
      }
    };
  }
}

async function loadWeightHistory(user) {
  const weightRef = collection(db, `Users/${user.uid}/weights`);
  const snapshot = await getDocs(query(weightRef, orderBy("date", "desc")));
  const container = document.getElementById('weightHistory');
  if (!container) return;
  container.innerHTML = '';
  snapshot.forEach(docSnap => {
    const w = docSnap.data();
    // Parse date string to readable format
    let dateStr = w.date;
    let displayDate = dateStr;
    // Try to parse YYYY-MM-DD to readable date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-');
      displayDate = new Date(y, m - 1, d).toLocaleDateString();
    } else {
      // fallback for ISO or other formats
      try { displayDate = new Date(dateStr).toLocaleDateString(); } catch {}
    }
    const entry = document.createElement('div');
    entry.className = "bg-white/10 p-2 rounded text-white flex justify-between";
    entry.innerHTML = `<span>${displayDate}</span><span>${w.weight} kg</span>`;
    container.appendChild(entry);
  });
}

// On page load, ensure only one Add Weight Entry button is visible and weight entry screen is hidden

document.addEventListener('DOMContentLoaded', () => {
  const showBtn = document.getElementById('showWeightEntryBtn');
  const screen = document.getElementById('weightEntryScreen');
  if (screen) screen.classList.add('hidden');
  if (showBtn) showBtn.classList.remove('hidden');
});
  