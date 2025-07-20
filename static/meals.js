// static/meals.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
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

// --- Helper: Fetch meals.json ---
async function fetchMealsData() {
  const res = await fetch("/app/meals.json");
  if (!res.ok) throw new Error("Failed to load meals.json");
  return await res.json();
}

// --- Helper: Find meal combos for a slot ---
function findMealCombos(meals, target, tolerance = 0.15, maxCombo = 2) {
  // meals: array of {name, calories, unit, ...}
  // Return up to 2 combos (arrays of {name, calories, unit, qty})
  const min = Math.round(target * (1 - tolerance));
  const max = Math.round(target * (1 + tolerance));
  let combos = [];
  // Try all 1-dish and 2-dish combos
  for (let i = 0; i < meals.length; ++i) {
    const m1 = meals[i];
    // 1-dish
    if (m1.calories >= min && m1.calories <= max) {
      combos.push([{ ...m1, qty: 1 }]);
    } else if (m1.calories < min) {
      // Try multiples of the same dish
      const qty = Math.round(target / m1.calories);
      const total = qty * m1.calories;
      if (qty > 1 && total >= min && total <= max) {
        combos.push([{ ...m1, qty }]);
      }
    }
    // 2-dish combos
    for (let j = i + 1; j < meals.length; ++j) {
      const m2 = meals[j];
      for (let q1 = 1; q1 <= 2; ++q1) {
        for (let q2 = 1; q2 <= 2; ++q2) {
          const total = m1.calories * q1 + m2.calories * q2;
          if (total >= min && total <= max) {
            combos.push([
              { ...m1, qty: q1 },
              { ...m2, qty: q2 }
            ]);
          }
        }
      }
    }
  }
  // If not enough combos, pick closest lower-calorie combos
  if (combos.length < maxCombo) {
    let best = [];
    let bestDiff = Infinity;
    // Try all 1- and 2-dish combos for closest under target
    for (let i = 0; i < meals.length; ++i) {
      const m1 = meals[i];
      if (m1.calories < target) {
        const diff = target - m1.calories;
        if (diff < bestDiff) {
          best = [[{ ...m1, qty: 1 }]];
          bestDiff = diff;
        }
      }
      for (let j = i + 1; j < meals.length; ++j) {
        const m2 = meals[j];
        const total = m1.calories + m2.calories;
        if (total < target) {
          const diff = target - total;
          if (diff < bestDiff) {
            best = [[{ ...m1, qty: 1 }, { ...m2, qty: 1 }]];
            bestDiff = diff;
          }
        }
      }
    }
    combos = combos.concat(best);
  }
  // Shuffle and pick up to 2 unique combos
  combos = shuffleArray(combos).slice(0, 2);
  return combos;
}

// --- Helper: Shuffle array ---
function shuffleArray(arr) {
  return arr.map(a => [Math.random(), a]).sort((a, b) => a[0] - b[0]).map(a => a[1]);
}

// --- Helper: Calculate BMR, BMI, Calorie Target ---
function calculateBMR({ gender, weight, height, age }) {
  if (!gender || !weight || !height || !age) return null;
  if (gender.toLowerCase() === 'male') {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  } else {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }
}
function calculateBMI({ weight, height }) {
  if (!weight || !height) return null;
  return (weight / Math.pow(height / 100, 2)).toFixed(1);
}
function calculateCalorieTarget(bmr, goal) {
  if (!bmr) return null;
  let adjustment = 0;
  if (goal && goal.toLowerCase().includes('lose')) adjustment = -500;
  if (goal && goal.toLowerCase().includes('gain')) adjustment = 500;
  return Math.round(bmr + adjustment);
}

// --- Render meal options ---
function renderMealOptions(slot, combos) {
  const container = document.getElementById(`${slot}-options`);
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 2; ++i) {
    const combo = combos[i];
    if (!combo) {
      container.innerHTML += `<div class="meal-card bg-gray-800 rounded-2xl p-5 border border-gray-700 cursor-pointer flex items-center justify-center min-h-[80px] text-gray-400">No suggestion</div>`;
      continue;
    }
    // Compose display
    const names = combo.map(m => `${m.name} <span class='text-xs text-gray-400'>x${m.qty}</span>`).join(' + ');
    const units = combo.map(m => `${m.qty} × ${m.unit}`).join(' + ');
    const totalCal = combo.reduce((sum, m) => sum + m.calories * m.qty, 0);
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
  renderMealOptions(slot, [mealCombos[slot][currentIndices[slot]], mealCombos[slot][(currentIndices[slot]+1)%mealCombos[slot].length]]);
}

// --- Main logic ---
onAuthStateChanged(auth, async user => {
  if (!user) return;
  const userDoc = await getDoc(doc(db, 'Users', user.uid));
  if (!userDoc.exists()) return;
  userProfile = userDoc.data();
  // --- Display BMI/BMR/Calories if elements exist ---
  const bmi = userProfile.bmi || calculateBMI(userProfile);
  const bmr = userProfile.bmr || calculateBMR(userProfile);
  const calories = userProfile.calorieTarget || calculateCalorieTarget(bmr, userProfile.goal);
  if (document.getElementById('bmi-info')) {
    document.getElementById('bmi-info').textContent = `BMI: ${bmi ?? '--'} | BMR: ${bmr ?? '--'} kcal/day`;
  }
  if (document.getElementById('calorie-info')) {
    document.getElementById('calorie-info').textContent = `Calorie Goal: ${calories ?? '--'} kcal/day`;
  }
  const calorieTarget = userProfile.calorieTarget || 2000;
  const region = userProfile.region || 'North';
  try {
    mealsData = await fetchMealsData();
  } catch (e) {
    MEAL_KEYS.forEach(slot => {
      renderMealOptions(slot, []);
    });
    return;
  }
  // For each slot, compute combos
  MEAL_KEYS.forEach(slot => {
    const slotTarget = Math.round(calorieTarget * MEAL_SPLIT[slot]);
    // Meals.json uses capitalized keys
    const regionMeals = (mealsData[region] && mealsData[region][MEAL_LABELS[slot]]) || [];
    mealCombos[slot] = findMealCombos(regionMeals, slotTarget, 0.15, 8); // up to 8 combos for shuffling
    // Pick first two for initial render
    renderMealOptions(slot, [mealCombos[slot][0], mealCombos[slot][1]]);
    currentIndices[slot] = 0;
  });
  // Attach shuffle listeners
  MEAL_KEYS.forEach(slot => {
    const btn = document.getElementById(`shuffle-${slot}`);
    if (btn) {
      btn.onclick = () => shuffleSlot(slot);
    }
  });
}); 

// --- Export helpers for future use ---
export { fetchMealsData, findMealCombos, renderMealOptions, shuffleSlot }; 