
// static/meals.js
import { auth, db } from './js/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Only run this file's logic on the meals page
if (!document.getElementById("meal-suggestions")) {
  // Not on meals page, skip all logic
  // (No-op: do nothing)
} else {

const MEAL_SPLIT = {
  breakfast: 0.3,
  lunch: 0.3,
  snacks: 0.1,
  dinner: 0.3
};
const MEAL_KEYS = ["breakfast", "lunch", "snacks", "dinner"];
const MEAL_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snacks: "Snacks",
  dinner: "Dinner"
};

let mealsData = null;
let userProfile = null;
let mealCombos = { breakfast: [], lunch: [], snacks: [], dinner: [] };
let currentIndices = { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 };


// --- Helper: Fetch meal suggestions from backend ---
async function fetchMealSuggestions(uid) {
  const res = await fetch(`/suggest-meals?uid=${encodeURIComponent(uid)}`);
  if (!res.ok) throw new Error("Failed to fetch meal suggestions");
  return await res.json();
}

// --- Render meal options ---

function renderMealOptions(slot, combos, currentIdx) {
  const container = document.getElementById(`${slot}-options`);
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 2; ++i) {
    const combo = combos[(currentIdx + i) % combos.length];
    if (!combo) {
      container.innerHTML += `<div class="meal-card bg-gray-800 rounded-2xl p-5 border border-gray-700 cursor-pointer flex items-center justify-center min-h-[80px] text-gray-400">No suggestion</div>`;
      continue;
    }
    // Compose display (support both single and combo)
    let names, units, totalCal;
    if (Array.isArray(combo)) {
      names = combo.map(m => `${m.name} <span class='text-xs text-gray-400'>x${m.qty || 1}</span>`).join(' + ');
      units = combo.map(m => `${m.qty || 1} × ${m.unit}`).join(' + ');
      totalCal = combo.reduce((sum, m) => sum + (m.calories * (m.qty || 1)), 0);
    } else {
      names = `${combo.name} <span class='text-xs text-gray-400'>x${combo.qty || 1}</span>`;
      units = `${combo.qty || 1} × ${combo.unit}`;
      totalCal = (combo.calories || 0) * (combo.qty || 1);
    }
    container.innerHTML += `
      <div class="meal-card bg-gray-800 rounded-2xl p-5 border border-gray-700 cursor-pointer">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-white mb-2">
              <span class="meal-name">${names}</span>
            </h3>
            <p class="text-gray-400 text-sm">
              <span class="meal-quantity">${units}</span>
            </p>
          </div>
          <div class="px-3 py-1 rounded-full font-bold text-sm" style="background:${slotColor(slot)};color:white;">
            ${totalCal} cal
          </div>
        </div>
      </div>
    `;
  }
}

function slotColor(slot) {
  switch (slot) {
    case 'breakfast': return '#f59e42';
    case 'lunch': return '#3b82f6';
    case 'snacks': return '#22c55e';
    case 'dinner': return '#a78bfa';
    default: return '#6366f1';
  }
}

// --- Shuffle handler ---

function shuffleSlot(slot) {
  if (!mealCombos[slot] || mealCombos[slot].length === 0) return;
  currentIndices[slot] = (currentIndices[slot] + 1) % mealCombos[slot].length;
  renderMealOptions(slot, mealCombos[slot], currentIndices[slot]);
}

// --- Display user metrics (BMI, BMR, calories) ---
async function displayUserMetrics(uid, userData) {
  try {
    // Fetch latest weight from weight logs
    let latestWeight = userData.weight;
    try {
      const weightsRef = collection(db, `Users/${uid}/weights`);
      const snapshot = await getDocs(weightsRef);
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
      console.log('[Meals] Using profile weight as fallback');
    }

    // Calculate BMI, BMR, calories
    const height = userData.height;
    const weight = latestWeight;
    const age = userData.age;
    const gender = userData.gender;
    const activity = (userData.activity || '').toLowerCase();
    let goal = (userData.goal || '').toLowerCase();
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

    // Update display elements
    const bmiInfo = document.getElementById('bmi-info');
    const calorieInfo = document.getElementById('calorie-info');
    if (bmiInfo) bmiInfo.textContent = `BMI: ${bmi} | BMR: ${bmr}`;
    if (calorieInfo) calorieInfo.textContent = `Calorie Goal: ${calories} kcal/day`;
    
    console.log(`[Meals] Updated metrics - BMI: ${bmi}, BMR: ${bmr}, Calories: ${calories}`);
  } catch (error) {
    console.error('[Meals] Error calculating user metrics:', error);
  }
}

// --- Main logic ---


onAuthStateChanged(auth, async user => {
  try {
    if (!user) {
      // No user authenticated, keep page blank
      return;
    }
    
    // Check mealsEnabled from localStorage (user-specific key)
    const mealsEnabledKey = `mealsEnabled_${user.uid}`;
    const mealsEnabled = localStorage.getItem(mealsEnabledKey);
    
    // If toggle is OFF or not set, keep page blank (do not redirect)
    if (mealsEnabled === 'false') {
      console.log('[Meals] Meal suggestions disabled for user, keeping page blank');
      return;
    }

    // Toggle is ON - proceed with BMI/BMR display and meal suggestions
    console.log('[Meals] Meal suggestions enabled, loading user data and meals');
    
    // Fetch user data and display BMI/BMR/calories
    const userDocSnap = await getDoc(doc(db, 'Users', user.uid));
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      
      // Update user name display
      const userNameEl = document.getElementById('user-name');
      if (userNameEl && userData.name) {
        userNameEl.textContent = `Welcome, ${userData.name}!`;
      }
      
      // Calculate and display BMI, BMR, calories
      await displayUserMetrics(user.uid, userData);
    }

    // Fetch meal suggestions from backend
    let apiData;
    try {
      apiData = await fetchMealSuggestions(user.uid);
      console.log('[Meal API] Raw API data:', apiData);
    } catch (e) {
      console.error('Failed to fetch meal suggestions:', e);
      MEAL_KEYS.forEach(slot => renderMealOptions(slot, [], 0));
      return;
    }
    if (!apiData.suggestions) {
      console.warn('[Meal API] No suggestions field in API response:', apiData);
      MEAL_KEYS.forEach(slot => renderMealOptions(slot, [], 0));
      return;
    }
    // Store all combos and render first two for each slot
    MEAL_KEYS.forEach(slot => {
      const combos = apiData.suggestions[slot] || [];
      console.log(`[Meal API] Suggestions for ${slot}:`, combos);
      mealCombos[slot] = combos;
      currentIndices[slot] = 0;
      try {
        renderMealOptions(slot, combos, 0);
      } catch (renderErr) {
        console.error(`[Meal API] Error rendering options for ${slot}:`, renderErr, combos);
      }
    });
    // Attach shuffle listeners
    MEAL_KEYS.forEach(slot => {
      const btn = document.getElementById(`shuffle-${slot}`);
      if (btn) {
        btn.onclick = () => shuffleSlot(slot);
      }
    });
  } catch (err) {
    console.error('Error in meals suggestion logic:', err);
  }
});
}

// --- Export helpers for future use ---
