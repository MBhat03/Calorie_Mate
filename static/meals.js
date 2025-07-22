
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

// --- Main logic ---


onAuthStateChanged(auth, async user => {
  try {
    if (!user) return;
    // Check mealsEnabled from Firestore (authoritative)
    const userDocSnap = await getDoc(doc(db, 'Users', user.uid));
    const mealsEnabled = userDocSnap.exists() && userDocSnap.data().mealsEnabled !== undefined ? userDocSnap.data().mealsEnabled : true;
    localStorage.setItem(`mealsEnabled_${user.uid}`, String(mealsEnabled));
    if (!mealsEnabled) {
      window.location.href = '/dashboard';
      return;
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
