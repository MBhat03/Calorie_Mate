// Simple and Reliable Meals.js
import { auth, db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let userPreferences = {};
let allMeals = {};

// Simple function to fetch user preferences
async function fetchUserPreferences() {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("No user logged in");
        }

        const userDoc = await getDoc(doc(db, "Users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            console.log(`👤 User profile data:`, data);
            console.log(`🌍 User region from profile: ${data.region || 'Not set'}`);
            
            // ✅ FIXED: Map region names to API format
            const regionMapping = {
                'south': 'South India',
                'south india': 'South India',
                'north': 'North India', 
                'north india': 'North India',
                'east': 'East India',
                'east india': 'East India',
                'west': 'West India',
                'west india': 'West India'
            };
            
            let mappedRegion = data.region || 'North India';
            if (regionMapping[mappedRegion.toLowerCase()]) {
                mappedRegion = regionMapping[mappedRegion.toLowerCase()];
            }
            console.log(`🌍 Mapped region: ${data.region} → ${mappedRegion}`);
            
            // ✅ FIXED: Use exact same calculation as dashboard
            let dailyCalories = 2000; // Default
            if (data.height && data.weight && data.age && data.gender && data.activity && data.goal) {
                // Calculate BMR (same as dashboard)
                    let bmr;
                if (data.gender.toLowerCase() === 'male') {
                    bmr = (10 * data.weight) + (6.25 * data.height) - (5 * data.age) + 5;
                    } else {
                    bmr = (10 * data.weight) + (6.25 * data.height) - (5 * data.age) - 161;
                    }
                    
                // Activity multipliers (same as dashboard)
                    const activityMultipliers = {
                        'sedentary': 1.2,
                        'light': 1.375,
                        'moderate': 1.55,
                        'active': 1.725,
                        'very active': 1.9
                    };
                    
                const tdee = bmr * (activityMultipliers[data.activity.toLowerCase()] || 1.2);
                
                // Goal adjustments (same as dashboard)
                    const goalAdjustments = {
                    'maintain weight': 0,
                    'lose weight': -500,
                    'gain weight': 500
                };
                
                dailyCalories = Math.round(tdee + (goalAdjustments[data.goal.toLowerCase()] || 0));
                console.log(`📊 Calculated daily calories: ${dailyCalories} (BMR: ${Math.round(bmr)}, TDEE: ${Math.round(tdee)}, Goal: ${data.goal})`);
            } else {
                console.warn(`⚠️ Missing user data for calorie calculation. Using default: ${dailyCalories}`);
            }
            
            return {
                name: data.name || "User",
                region: mappedRegion,
                calories: dailyCalories,
                goal: data.goal || 'Maintain Weight'
            };
            } else {
            throw new Error("User document not found");
            }
        } catch (error) {
        console.error("Error fetching user preferences:", error);
        return {
            name: "User",
            region: 'North India',
            calories: 2000,
            goal: 'Maintain Weight'
        };
    }
}

// Simple function to fetch meals from API
async function fetchMeals(mealTime) {
    try {
        console.log(`🔄 Fetching meals for ${mealTime}...`);
        console.log(`🌍 User region: ${userPreferences.region}`);
        
        const requestBody = {
            mealTime: mealTime,
            region: userPreferences.region,
            calories: userPreferences.calories,
            timestamp: Date.now(), // ✅ ADDED: Timestamp to avoid caching
            random: Math.random() // ✅ ADDED: Random value for variety
        };
        
        console.log(`📤 Sending request with region: ${requestBody.region}`);
        
        const response = await fetch("/api/get-meals", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`📦 API response for ${mealTime}:`, data);
        
        if (data.success && data.meals && data.meals[mealTime]) {
            return data.meals[mealTime];
                    } else {
            throw new Error("Invalid response format");
        }
    } catch (error) {
        console.error(`❌ Error fetching ${mealTime} meals:`, error);
        return [];
    }
}

// Simple function to update meal cards
function updateMealCard(mealTime, index, meal) {
    console.log(`🔄 Updating ${mealTime} card ${index} with meal:`, meal);
    
    const section = document.getElementById(`${mealTime}-options`);
    if (!section) {
        console.error(`❌ Section not found: ${mealTime}-options`);
        return false;
    }

    const mealCards = section.querySelectorAll('.meal-card');
    console.log(`📋 Found ${mealCards.length} meal cards in ${mealTime} section`);
    
    if (mealCards.length <= index) {
        console.error(`❌ Meal card ${index} not found`);
        return false;
    }

    const mealCard = mealCards[index];
    console.log(`✅ Found meal card ${index} for ${mealTime}`);
    
    const nameElement = mealCard.querySelector('.meal-name');
    const quantityElement = mealCard.querySelector('.meal-quantity');
    const caloriesElement = mealCard.querySelector('.meal-calories');

    if (nameElement) {
        const oldName = nameElement.textContent;
        nameElement.textContent = meal.name || "Unknown meal";
        console.log(`✅ Updated name: ${oldName} → ${meal.name}`);
    } else {
        console.warn(`⚠️ Name element not found for ${mealTime} card ${index}`);
    }
    
    if (quantityElement) {
        const oldQuantity = quantityElement.textContent;
        quantityElement.textContent = meal.portion || "1 serving";
        console.log(`✅ Updated quantity: ${oldQuantity} → ${meal.portion}`);
    } else {
        console.warn(`⚠️ Quantity element not found for ${mealTime} card ${index}`);
    }
    
    if (caloriesElement) {
        const oldCalories = caloriesElement.textContent;
        caloriesElement.textContent = meal.calories || 0;
        console.log(`✅ Updated calories: ${oldCalories} → ${meal.calories}`);
    } else {
        console.warn(`⚠️ Calories element not found for ${mealTime} card ${index}`);
    }
    
    console.log(`✅ Successfully updated ${mealTime} card ${index}`);
    return true;
}

// Simple function to show error for a meal time
function showMealTimeError(mealTime, message) {
    const section = document.getElementById(`${mealTime}-options`);
    if (!section) return;
    
    // Remove existing error
    const existingError = section.querySelector('.meal-time-error');
    if (existingError) {
        existingError.remove();
    }
    
    const errorEl = document.createElement('div');
    errorEl.className = 'meal-time-error text-red-500 text-center py-4 px-2 bg-red-50 rounded-lg border border-red-200';
    errorEl.innerHTML = `
        <div class="text-sm font-medium">${message}</div>
        <button onclick="retryMealTime('${mealTime}')" class="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-xs">
            Retry
        </button>
    `;
    section.appendChild(errorEl);
}

// Simple function to load all meals
async function loadAllMeals() {
    try {
        console.log('🚀 Loading all meals...');
        
        // Fetch user preferences first
        userPreferences = await fetchUserPreferences();
        console.log(`👤 User preferences loaded:`, userPreferences);
        
        // Load meals for each meal time
        const mealTimes = ['breakfast', 'lunch', 'dinner', 'snacks'];
        
        for (const mealTime of mealTimes) {
            console.log(`🍽️ Loading ${mealTime} meals for region: ${userPreferences.region}`);
            
            try {
                const meals = await fetchMeals(mealTime);
                console.log(`✅ Loaded ${meals.length} ${mealTime} meals:`, meals);
                
                if (meals.length >= 2) {
                    // Update the first two meal cards
                    updateMealCard(mealTime, 0, meals[0]);
                    updateMealCard(mealTime, 1, meals[1]);
                } else if (meals.length === 1) {
                    updateMealCard(mealTime, 0, meals[0]);
                    showMealTimeError(mealTime, `Only ${meals.length} meal available`);
                } else {
                    showMealTimeError(mealTime, 'No meals found');
                }
            } catch (error) {
                console.error(`❌ Error loading ${mealTime} meals:`, error);
                showMealTimeError(mealTime, 'Failed to load meals');
            }
        }
        
        console.log('✅ All meals loaded successfully');
        
    } catch (error) {
        console.error('❌ Error in loadAllMeals:', error);
    }
}

// Simple function to shuffle meals
async function shuffleMeals(mealTime) {
    try {
        console.log(`🔀 Shuffling ${mealTime}...`);
        console.log(`🔍 Current meals for ${mealTime}:`, allMeals[mealTime]);
        
        // Disable shuffle button
        const shuffleBtn = document.getElementById(`shuffle-${mealTime}`);
        if (shuffleBtn) {
            shuffleBtn.disabled = true;
            shuffleBtn.innerHTML = '🔄 Shuffling...';
            console.log(`✅ Disabled shuffle button for ${mealTime}`);
        } else {
            console.warn(`⚠️ Could not find shuffle button for ${mealTime}`);
        }
        
        // Fetch new meals
        console.log(`📡 Fetching new meals for ${mealTime}...`);
        const meals = await fetchMeals(mealTime);
        console.log(`📦 Received ${meals.length} meals for ${mealTime}:`, meals);
        
        allMeals[mealTime] = meals;
        
        if (meals.length >= 2) {
            console.log(`✅ Updating ${mealTime} with 2 meals`);
            
            // ✅ ADDED: Randomize meal selection to ensure variety
            const shuffledMeals = [...meals].sort(() => Math.random() - 0.5);
            console.log(`🎲 Randomized meals for ${mealTime}:`, shuffledMeals.map(m => m.name));
            
            updateMealCard(mealTime, 0, shuffledMeals[0]);
            updateMealCard(mealTime, 1, shuffledMeals[1]);
        } else if (meals.length === 1) {
            console.log(`✅ Updating ${mealTime} with 1 meal (duplicated)`);
            updateMealCard(mealTime, 0, meals[0]);
            updateMealCard(mealTime, 1, meals[0]);
        } else {
            console.warn(`⚠️ No meals received for ${mealTime}`);
            showMealTimeError(mealTime, "No meals found for your preferences");
        }
        
        // Re-enable shuffle button
            if (shuffleBtn) {
                shuffleBtn.disabled = false;
                shuffleBtn.innerHTML = '🔄 Shuffle';
            console.log(`✅ Re-enabled shuffle button for ${mealTime}`);
        }
        
        console.log(`✅ ${mealTime} shuffled successfully`);
        
    } catch (error) {
        console.error(`❌ Error shuffling ${mealTime}:`, error);
        
        // Re-enable shuffle button on error
        const shuffleBtn = document.getElementById(`shuffle-${mealTime}`);
        if (shuffleBtn) {
            shuffleBtn.disabled = false;
            shuffleBtn.innerHTML = '🔄 Shuffle';
        }
        
        showMealTimeError(mealTime, `Failed to shuffle ${mealTime} meals`);
    }
}

// Simple retry function
async function retryMealTime(mealTime) {
    console.log(`🔄 Retrying ${mealTime}...`);
    
    // Remove error display
    const section = document.getElementById(`${mealTime}-options`);
    if (section) {
        const errorEl = section.querySelector('.meal-time-error');
        if (errorEl) errorEl.remove();
    }
    
    try {
        const meals = await fetchMeals(mealTime);
        allMeals[mealTime] = meals;
        
        if (meals.length >= 2) {
            updateMealCard(mealTime, 0, meals[0]);
            updateMealCard(mealTime, 1, meals[1]);
        } else if (meals.length === 1) {
            updateMealCard(mealTime, 0, meals[0]);
            updateMealCard(mealTime, 1, meals[0]);
        } else {
            showMealTimeError(mealTime, "No meals found for your preferences");
        }
    } catch (error) {
        console.error(`❌ Retry failed for ${mealTime}:`, error);
        showMealTimeError(mealTime, `Still unable to load ${mealTime} meals`);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Simple Meals page initialized');
    
    // Set up shuffle button event listeners
        const mealTimes = ['breakfast', 'lunch', 'dinner', 'snacks'];
        
        mealTimes.forEach(mealTime => {
        const shuffleBtn = document.getElementById(`shuffle-${mealTime}`);
        console.log(`🔍 Looking for shuffle button: shuffle-${mealTime}`, shuffleBtn);
            
            if (shuffleBtn) {
            console.log(`✅ Found shuffle button for ${mealTime}, adding event listener`);
                
            // Remove any existing listeners by cloning the button
                const newBtn = shuffleBtn.cloneNode(true);
                shuffleBtn.parentNode.replaceChild(newBtn, shuffleBtn);
                
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                console.log(`🔀 Shuffle button clicked for ${mealTime}`);
                    shuffleMeals(mealTime);
                });
                
            // Also add a global click handler as backup
            newBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                console.log(`🔀 Backup shuffle handler for ${mealTime}`);
                        shuffleMeals(mealTime);
            };
                
            } else {
            console.warn(`⚠️ Shuffle button not found for ${mealTime}`);
        }
    });
    
    // Make functions globally available
    window.retryMealTime = retryMealTime;
    window.shuffleMeals = shuffleMeals;
    window.loadAllMeals = loadAllMeals;
    
    // Add global click handler as fallback
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button');
        if (button && button.id && button.id.startsWith('shuffle-')) {
            const mealTime = button.id.replace('shuffle-', '');
            console.log(`🔀 Global fallback shuffle handler for ${mealTime}`);
                    e.preventDefault();
                    e.stopPropagation();
                    shuffleMeals(mealTime);
        }
    });
        
        // Initialize Firebase auth listener
        auth.onAuthStateChanged(user => {
            if (user) {
            console.log('🔐 User authenticated, loading meals...');
                loadAllMeals();
            } else {
                console.log('🔓 Not authenticated - redirecting...');
                window.location.href = '/login';
            }
        });
});

// ✅ ADDED: Test function to verify region filtering
window.testRegionFiltering = async function() {
    console.log('🧪 Testing region filtering...');
    
    const regions = ['North India', 'South India', 'East India', 'West India'];
    
    for (const region of regions) {
        console.log(`\n🌍 Testing region: ${region}`);
        
        try {
            const response = await fetch("/api/get-meals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                    mealTime: 'breakfast',
                    region: region,
                    calories: 2000,
                    timestamp: Date.now(),
                    random: Math.random()
            })
        });
        
            const data = await response.json();
            if (data.success && data.meals && data.meals.breakfast) {
                const meals = data.meals.breakfast;
                console.log(`✅ ${region}: Got ${meals.length} breakfast meals`);
                console.log(`   First meal: ${meals[0]?.name || 'None'}`);
        } else {
                console.log(`❌ ${region}: No meals returned`);
        }
    } catch (error) {
            console.error(`❌ ${region}: Error -`, error);
        }
    }
};

// On page load, ensure only one Add Weight Entry button is visible and weight entry screen is hidden

console.log('✅ Simple Meals.js loaded');