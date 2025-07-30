// static/js/meals.js
import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let allMeals = {};
let userCalorieGoal = 2000;
let userPreferences = {};

// ✅ Fetch user's info directly from Firestore and calculate calories like Dashboard
async function fetchUserGoalAndBMI() {
    return new Promise(async (resolve, reject) => {
        const user = auth.currentUser;
        if (!user) {
            reject("No user logged in");
            return;
        }

        try {
            const userDoc = doc(db, "Users", user.uid);
            const docSnap = await getDoc(userDoc);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Get latest weight from weights collection (same as dashboard)
                const weightsRef = collection(db, `Users/${user.uid}/weights`);
                const weightsSnapshot = await getDocs(query(weightsRef, orderBy("date", "desc")));
                
                let latestWeight = data.weight; // fallback to profile weight
                if (!weightsSnapshot.empty) {
                    latestWeight = weightsSnapshot.docs[0].data().weight;
                }
                
                // Calculate calories dynamically (same logic as dashboard)
                let calculatedCalories = 2000; // fallback
                const height = data.height;
                const weight = latestWeight;
                const age = data.age;
                const gender = data.gender;
                const activity = (data.activity || '').toLowerCase();
                let goal = (data.goal || '').toLowerCase();
                
                if (goal.includes('maintain')) goal = 'maintain';
                else if (goal.includes('lose')) goal = 'lose';
                else if (goal.includes('gain')) goal = 'gain';
                
                if (height && weight && age && gender) {
                    // Calculate BMR using Mifflin-St Jeor equation
                    let bmr;
                    if (gender.toLowerCase() === 'male') {
                        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
                    } else {
                        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
                    }
                    
                    // Apply activity multiplier
                    const activityMultipliers = {
                        'sedentary': 1.2,
                        'light': 1.375,
                        'moderate': 1.55,
                        'active': 1.725,
                        'very active': 1.9
                    };
                    const tdee = bmr * (activityMultipliers[activity] || 1.2);
                    
                    // Apply goal adjustment
                    const goalAdjustments = {
                        'maintain': 0,
                        'lose': -500,
                        'gain': 500
                    };
                    calculatedCalories = Math.round(tdee + (goalAdjustments[goal] || 0));
                }
                
                resolve({
                    name: data.name || "",
                    bmi: weight && height ? (weight / Math.pow(height / 100, 2)).toFixed(1) : data.bmi,
                    calorieGoal: calculatedCalories,   // ✅ Now calculated like Dashboard
                    goal: data.goal,
                    region: data.region || 'North India',
                    dietPreference: data.dietPreference || 'vegetarian',
                    weight: weight,
                    height: height,
                    age: age,
                    gender: gender,
                    activity: data.activity
                });
            } else {
                reject("User document not found");
            }
        } catch (error) {
            reject(error);
        }
    });
}

// ✅ Update top user info (always matches Dashboard)
function updateUserInfoUI(userPreferences) {
    const nameEl = document.getElementById("user-name");
    const bmiEl = document.getElementById("bmi-value");
    const goalEl = document.getElementById("goal-value");

    if (nameEl) nameEl.textContent = `Welcome, ${userPreferences.name || auth.currentUser.displayName || 'User'}`;
    if (bmiEl) bmiEl.textContent = userPreferences.bmi ? userPreferences.bmi.toFixed(1) : "--";
    if (goalEl) goalEl.textContent = `${userPreferences.calorieGoal || userCalorieGoal} kcal/day`; // ✅ fixed
}

// Fetch meals for a specific meal time
async function fetchMealsForTime(mealTime, count = 4) {
    try {
        const response = await fetch("/api/get-meals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                region: userPreferences.region,
                meal_time: mealTime,
                diet_preference: userPreferences.dietPreference,
                bmi: userPreferences.bmi,
                goal: userPreferences.goal,
                calories: userCalorieGoal,
                count: count
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        return data.meals && data.meals[mealTime] ? data.meals[mealTime] : [];
    } catch (error) {
        console.error(`❌ Error fetching ${mealTime} meals:`, error);
        return [];
    }
}

// Update a meal card
function updateMealCard(mealTime, index, meal) {
    const section = document.getElementById(`${mealTime}-options`);
    if (!section) return;

    const mealCards = section.querySelectorAll('.meal-card');
    if (mealCards.length <= index) return;

    const mealCard = mealCards[index];
    const nameElement = mealCard.querySelector('.meal-name');
    const quantityElement = mealCard.querySelector('.meal-quantity');
    const caloriesElement = mealCard.querySelector('.meal-calories');

    if (nameElement) nameElement.textContent = meal.name || "Unknown meal";
    if (quantityElement) quantityElement.textContent = meal.portion || "1 serving";
    if (caloriesElement) caloriesElement.textContent = `${meal.calories || 0} kcal`;
}

// Load all meals
async function loadAllMeals() {
    try {
        console.log('🔄 Loading meals...');
        showLoadingState(true);

        userPreferences = await fetchUserGoalAndBMI();
        userCalorieGoal = userPreferences.calorieGoal || 2000;

        updateUserInfoUI(userPreferences);

        const mealTimes = ['breakfast', 'lunch', 'dinner', 'snacks'];
        for (const mealTime of mealTimes) {
            const meals = await fetchMealsForTime(mealTime, 4);
            allMeals[mealTime] = meals;
            if (meals.length >= 2) {
                // Only update the 2 meal cards that exist in HTML (indices 0 and 1)
                updateMealCard(mealTime, 0, meals[0]);
                updateMealCard(mealTime, 1, meals[1]);
            }
        }

        showLoadingState(false);
        console.log('✅ Meals loaded successfully');
        console.log('📊 Total suggested calories:', userCalorieGoal);
        logCalorieSummary();
    } catch (error) {
        console.error('❌ Error loading meals:', error);
        showLoadingState(false);
        showErrorState(true);
    }
}

// Shuffle meals
async function shuffleMeals(mealTime) {
    try {
        console.log(`🔀 Shuffling ${mealTime} meals...`);
        
        // Fix the button ID mapping
        let buttonId;
        if (mealTime === 'snacks') {
            buttonId = 'shuffle-snacks'; // HTML has shuffle-snacks
        } else {
            buttonId = `shuffle-${mealTime}`;
        }
        
        const shuffleBtn = document.getElementById(buttonId);
        if (shuffleBtn) {
            shuffleBtn.disabled = true;
            shuffleBtn.textContent = 'Shuffling...';
        }

        const newMeals = await fetchMealsForTime(mealTime, 4);
        if (newMeals.length >= 2) {
            allMeals[mealTime] = newMeals;
            // Only update the 2 meal cards that exist in HTML
            updateMealCard(mealTime, 0, newMeals[0]);
            updateMealCard(mealTime, 1, newMeals[1]);
        }

        if (shuffleBtn) {
            shuffleBtn.disabled = false;
            shuffleBtn.textContent = 'Shuffle';
        }
        
        console.log(`✅ ${mealTime} meals shuffled successfully`);
        logCalorieSummary();
    } catch (error) {
        console.error(`❌ Shuffle error for ${mealTime}:`, error);
        
        // Fix the button ID mapping for error handling too
        let buttonId;
        if (mealTime === 'snacks') {
            buttonId = 'shuffle-snacks';
        } else {
            buttonId = `shuffle-${mealTime}`;
        }
        
        const shuffleBtn = document.getElementById(buttonId);
        if (shuffleBtn) {
            shuffleBtn.disabled = false;
            shuffleBtn.textContent = 'Shuffle';
        }
    }
}

// Show/hide loading state
function showLoadingState(show) {
    document.querySelectorAll('.loading-state').forEach(el => {
        if (show) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
}

// Show/hide error state
function showErrorState(show) {
    document.querySelectorAll('.error-state').forEach(el => {
        if (show) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
}

// Log calorie summary for debugging
function logCalorieSummary() {
    const mealTimes = ['breakfast', 'lunch', 'dinner', 'snacks'];
    let totalCalories = 0;
    
    console.log('📊 Current Meal Calorie Summary:');
    mealTimes.forEach(mealTime => {
        if (allMeals[mealTime] && allMeals[mealTime].length > 0) {
            const mealCalories = allMeals[mealTime][0].calories || 0;
            totalCalories += mealCalories;
            console.log(`  ${mealTime}: ${mealCalories} kcal`);
        }
    });
    console.log(`  Total: ${totalCalories} kcal (Target: ${userCalorieGoal} kcal)`);
}

// Init - FIXED VERSION
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 Meals page initialized');
    
    // Define button IDs that match your HTML exactly
    const buttonMappings = {
        'breakfast': 'shuffle-breakfast',
        'lunch': 'shuffle-lunch', 
        'dinner': 'shuffle-dinner',
        'snacks': 'shuffle-snacks'  // ✅ This was the key fix
    };

    Object.keys(buttonMappings).forEach(mealTime => {
        const buttonId = buttonMappings[mealTime];
        const shuffleBtn = document.getElementById(buttonId);
        
        if (shuffleBtn) {
            console.log(`✅ Found shuffle button: ${buttonId} for ${mealTime}`);
            shuffleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`🔀 Shuffle button clicked for ${mealTime}`);
                shuffleMeals(mealTime);
            });
        } else {
            console.log(`❌ Shuffle button not found: ${buttonId}`);
        }
    });

    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('🔐 User authenticated, loading meals...');
            loadAllMeals();
        } else {
            console.log('🔓 Not authenticated');
        }
    });
});