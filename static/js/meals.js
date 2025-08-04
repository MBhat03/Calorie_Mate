// static/js/meals.js - ENHANCED VERSION WITH IMPROVED SHUFFLE AND DEBUGGING
import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let allMeals = {};
let userCalorieGoal = 2000;
let userPreferences = {};
let lastShuffleTime = {};
let shuffleCounter = {};
let previousMealSelections = {};
let shuffleHistory = {}; // Track complete shuffle history

// ✅ Enhanced fetch user info
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
                
                // Get latest weight
                const weightsRef = collection(db, `Users/${user.uid}/weights`);
                const weightsSnapshot = await getDocs(query(weightsRef, orderBy("date", "desc")));
                
                let latestWeight = data.weight;
                if (!weightsSnapshot.empty) {
                    latestWeight = weightsSnapshot.docs[0].data().weight;
                }
                
                // Calculate calories dynamically
                let calculatedCalories = 2000;
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
                    let bmr;
                    if (gender.toLowerCase() === 'male') {
                        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
                    } else {
                        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
                    }
                    
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
                    calculatedCalories = Math.round(tdee + (goalAdjustments[goal] || 0));
                }
                
                resolve({
                    name: data.name || "",
                    bmi: weight && height ? (weight / Math.pow(height / 100, 2)).toFixed(1) : data.bmi,
                    calorieGoal: calculatedCalories,
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

// ✅ Update UI
function updateUserInfoUI(userPreferences) {
    const nameEl = document.getElementById("user-name");
    const bmiEl = document.getElementById("bmi-value");
    const goalEl = document.getElementById("goal-value");

    if (nameEl) nameEl.textContent = `Welcome, ${userPreferences.name || auth.currentUser.displayName || 'User'}`;
    if (bmiEl) bmiEl.textContent = userPreferences.bmi ? userPreferences.bmi.toFixed(1) : "--";
    if (goalEl) goalEl.textContent = `${userPreferences.calorieGoal || userCalorieGoal}`;
}

// ✅ ENHANCED FETCH WITH BETTER PARAMETERS AND DEBUGGING
async function fetchMealsForTime(mealTime, count = 4, forceNew = false) {
    try {
        console.log(`🔄 Fetching meals for ${mealTime} with target calories: ${userCalorieGoal}, forceNew: ${forceNew}`);
        
        if (!shuffleCounter[mealTime]) {
            shuffleCounter[mealTime] = 0;
        }
        
        if (forceNew) {
            shuffleCounter[mealTime]++;
        }
        
        // ✅ ENHANCED REQUEST WITH BETTER RANDOMIZATION AND NO DIET FILTER
        const requestBody = {
            region: userPreferences.region,
            meal_time: mealTime,
            // ✅ REMOVED DIET PREFERENCE TO INCREASE MEAL VARIETY
            // diet_preference: userPreferences.dietPreference,
            bmi: userPreferences.bmi,
            goal: userPreferences.goal,
            calories: userCalorieGoal,
            count: count + 4, // Request more meals for better variety
            timestamp: Date.now(),
            shuffle: forceNew,
            shuffle_count: shuffleCounter[mealTime],
            random_seed: Math.random().toString(36).substring(7) + Date.now().toString(36),
            client_random: Math.floor(Math.random() * 1000000),
            previous_selections: previousMealSelections[mealTime] || []
        };
        
        console.log(`📤 Enhanced request for ${mealTime} (NO DIET FILTER):`, requestBody);
        
        const response = await fetch("/api/get-meals", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            console.error(`❌ HTTP error for ${mealTime}:`, response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`📦 Backend response for ${mealTime}:`, data);
        
        if (data.error) {
            console.error(`❌ Backend error for ${mealTime}:`, data.error);
            if (data.debugging_info) {
                console.log(`🔍 Debug info for ${mealTime}:`, data.debug_info);
            }
            throw new Error(data.error);
        }
        
        // ✅ EXTRACT MEALS WITH VALIDATION
        const meals = data.meals && data.meals[mealTime] ? data.meals[mealTime] : [];
        
        if (meals.length === 0) {
            console.warn(`⚠️ No meals returned for ${mealTime}`);
            // Try fallback request with all regions
            const fallbackBody = {
                ...requestBody,
                region: "all"
            };
            
            console.log(`🔄 Trying fallback request for ${mealTime}...`);
            const fallbackResponse = await fetch("/api/get-meals", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache"
                },
                body: JSON.stringify(fallbackBody)
            });
            
            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                const fallbackMeals = fallbackData.meals && fallbackData.meals[mealTime] ? fallbackData.meals[mealTime] : [];
                console.log(`📦 Fallback returned ${fallbackMeals.length} meals for ${mealTime}`);
                return fallbackMeals;
            }
        }
        
        // ✅ STORE CURRENT SELECTION AND VERIFY DIFFERENCES
        if (meals.length > 0) {
            const currentNames = meals.map(m => m.name);
            
            // Initialize shuffle history if needed
            if (!shuffleHistory[mealTime]) {
                shuffleHistory[mealTime] = [];
            }
            
            // Store in history
            shuffleHistory[mealTime].push({
                meals: currentNames,
                timestamp: Date.now(),
                shuffleCount: shuffleCounter[mealTime]
            });
            
            // Keep only last 5 shuffle attempts
            if (shuffleHistory[mealTime].length > 5) {
                shuffleHistory[mealTime] = shuffleHistory[mealTime].slice(-5);
            }
            
            previousMealSelections[mealTime] = currentNames;
            
            const mealNames = currentNames.join(', ');
            console.log(`🍽️ ${mealTime} meals received (${meals.length}): ${mealNames}`);
            
            // ✅ ENHANCED VERIFICATION FOR SHUFFLES
            if (forceNew && shuffleHistory[mealTime].length > 1) {
                const previousHistory = shuffleHistory[mealTime].slice(-2, -1)[0];
                if (previousHistory) {
                    const oldNames = previousHistory.meals.slice(0, 2);
                    const newNames = currentNames.slice(0, 2);
                    const actuallyDifferent = JSON.stringify(oldNames.sort()) !== JSON.stringify(newNames.sort());
                    
                    console.log(`🔍 ${mealTime} SHUFFLE VERIFICATION:`);
                    console.log(`   OLD: ${oldNames.join(' | ')}`);
                    console.log(`   NEW: ${newNames.join(' | ')}`);
                    console.log(`   ACTUALLY DIFFERENT: ${actuallyDifferent}`);
                    
                    if (!actuallyDifferent) {
                        console.warn(`⚠️ Shuffle did not produce different meals for ${mealTime}!`);
                        showErrorMessage(`${mealTime} shuffle returned similar meals. The variety may be limited for your preferences.`);
                    } else {
                        console.log(`✅ Shuffle successful - got different meals for ${mealTime}`);
                    }
                }
            }
            
            meals.forEach((meal, index) => {
                console.log(`  ${index + 1}. ${meal.name}: ${meal.calories} cal, portion: ${meal.portion}`);
            });
        }
        
        return meals;
    } catch (error) {
        console.error(`❌ Error fetching ${mealTime} meals:`, error);
        
        if (allMeals[mealTime] && allMeals[mealTime].length > 0) {
            console.log(`🔄 Using cached meals for ${mealTime} as fallback`);
            return allMeals[mealTime];
        }
        
        return [];
    }
}

// ✅ ENHANCED UPDATE FUNCTION WITH BETTER VISUAL FEEDBACK
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
        console.error(`❌ Meal card ${index} not found in ${mealTime} (only ${mealCards.length} cards exist)`);
        return false;
    }

    const mealCard = mealCards[index];
    
    if (!meal || !meal.name) {
        console.error(`❌ Invalid meal data for ${mealTime} card ${index}:`, meal);
        return false;
    }
    
    // ✅ ENHANCED DOM UPDATE WITH VISUAL FEEDBACK
    const nameElement = mealCard.querySelector('.meal-name');
    const quantityElement = mealCard.querySelector('.meal-quantity');
    const caloriesElement = mealCard.querySelector('.meal-calories');

    // ✅ UPDATE WITH CHANGE DETECTION AND ANIMATION
    if (nameElement) {
        const oldName = nameElement.textContent;
        nameElement.textContent = meal.name || "Unknown meal";
        
        if (oldName !== meal.name) {
            // ✅ ENHANCED VISUAL FEEDBACK FOR ACTUAL CHANGES
            nameElement.style.fontWeight = 'bold';
            nameElement.style.color = '#10b981';
            nameElement.style.backgroundColor = '#f0fdf4';
            nameElement.style.padding = '2px 4px';
            nameElement.style.borderRadius = '4px';
            nameElement.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                nameElement.style.fontWeight = 'normal';
                nameElement.style.color = '';
                nameElement.style.backgroundColor = '';
                nameElement.style.padding = '';
                nameElement.style.borderRadius = '';
            }, 2000);
        }
        console.log(`✅ Updated name: ${oldName} → ${meal.name}`);
    }
    
    if (quantityElement) {
        const oldQuantity = quantityElement.textContent;
        const newQuantity = meal.portion || "1 serving";
        quantityElement.textContent = newQuantity;
        
        if (oldQuantity !== newQuantity) {
            quantityElement.style.color = '#059669';
            quantityElement.style.fontWeight = 'bold';
            setTimeout(() => {
                quantityElement.style.color = '';
                quantityElement.style.fontWeight = '';
            }, 1500);
        }
        console.log(`✅ Updated quantity: ${oldQuantity} → ${newQuantity}`);
    }
    
    if (caloriesElement) {
        const oldCalories = caloriesElement.textContent;
        const newCalories = meal.calories || 0;
        caloriesElement.textContent = newCalories;
        
        if (oldCalories != newCalories) {
            caloriesElement.style.backgroundColor = '#fbbf24';
            caloriesElement.style.color = '#000';
            caloriesElement.style.transform = 'scale(1.1)';
            caloriesElement.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                caloriesElement.style.backgroundColor = '';
                caloriesElement.style.color = '';
                caloriesElement.style.transform = 'scale(1)';
            }, 1500);
        }
        console.log(`✅ Updated calories: ${oldCalories} → ${newCalories}`);
    }
    
    // ✅ ENHANCED CARD ANIMATION
    mealCard.style.transform = 'scale(0.95) rotateY(10deg)';
    mealCard.style.transition = 'transform 0.4s ease, box-shadow 0.4s ease';
    mealCard.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.3)';
    
    setTimeout(() => {
        mealCard.style.transform = 'scale(1.02) rotateY(-2deg)';
        setTimeout(() => {
            mealCard.style.transform = 'scale(1) rotateY(0deg)';
            mealCard.style.boxShadow = '';
            setTimeout(() => {
                mealCard.style.transform = '';
                mealCard.style.transition = '';
            }, 300);
        }, 200);
    }, 200);
    
    return true;
}

// ✅ ENHANCED LOAD ALL MEALS
async function loadAllMeals() {
    try {
        console.log('🔄 Loading meals with enhanced variety...');
        showLoadingState(true);

        userPreferences = await fetchUserGoalAndBMI();
        userCalorieGoal = userPreferences.calorieGoal || 2000;
        
        console.log('👤 User preferences:', userPreferences);
        console.log('🎯 Target daily calories:', userCalorieGoal);
        console.log('🚫 Diet preference filter: REMOVED for better variety');

        updateUserInfoUI(userPreferences);

        const mealTimes = ['breakfast', 'lunch', 'dinner', 'snacks'];
        let successCount = 0;
        
        // ✅ CLEAR PREVIOUS SELECTIONS ON FRESH LOAD
        previousMealSelections = {};
        shuffleHistory = {};
        
        for (const mealTime of mealTimes) {
            console.log(`🔄 Loading ${mealTime}...`);
            
            try {
                const meals = await fetchMealsForTime(mealTime, 4, false);
                allMeals[mealTime] = meals;
                
                console.log(`📦 Received ${meals.length} meals for ${mealTime}`);
                
                if (meals.length >= 2) {
                    const success1 = updateMealCard(mealTime, 0, meals[0]);
                    const success2 = updateMealCard(mealTime, 1, meals[1]);
                    if (success1 && success2) successCount++;
                } else if (meals.length === 1) {
                    const success1 = updateMealCard(mealTime, 0, meals[0]);
                    const success2 = updateMealCard(mealTime, 1, meals[0]);
                    if (success1 && success2) successCount++;
                } else {
                    console.warn(`⚠️ No meals found for ${mealTime}`);
                    showMealTimeError(mealTime, "No meals found for your preferences");
                }
            } catch (error) {
                console.error(`❌ Failed to load ${mealTime}:`, error);
                showMealTimeError(mealTime, `Failed to load ${mealTime} meals`);
            }
        }

        showLoadingState(false);
        
        if (successCount > 0) {
            console.log(`✅ Meals loaded successfully (${successCount}/${mealTimes.length} meal times)`);
            showSuccessMessage("Meals loaded with enhanced variety! 🎉");
            logCalorieSummary();
        } else {
            console.error('❌ Failed to load any meals');
            showErrorState(true);
        }
    } catch (error) {
        console.error('❌ Error loading meals:', error);
        showLoadingState(false);
        showErrorState(true);
    }
}

// ✅ ENHANCED SHUFFLE WITH BETTER FEEDBACK
async function shuffleMeals(mealTime) {
    try {
        console.log(`🔀 ENHANCED SHUFFLE INITIATED for ${mealTime}`);
        
        // ✅ PREVENT RAPID CLICKING
        const now = Date.now();
        const lastShuffle = lastShuffleTime[mealTime] || 0;
        if (now - lastShuffle < 2000) {
            console.log(`⏳ Shuffle cooldown active for ${mealTime}`);
            showErrorMessage(`Please wait before shuffling ${mealTime} again`);
            return;
        }
        lastShuffleTime[mealTime] = now;
        
        // Find and disable shuffle button
        let shuffleBtn = findShuffleButton(mealTime);
        
        if (shuffleBtn) {
            shuffleBtn.disabled = true;
            const originalText = shuffleBtn.textContent;
            shuffleBtn.innerHTML = '🔄 <span class="animate-spin inline-block">⟳</span> Shuffling...';
            shuffleBtn.style.backgroundColor = '#f59e0b';
            shuffleBtn.style.transform = 'scale(0.95)';
            console.log(`✅ Button disabled and styled`);
        }

        // ✅ ENHANCED VISUAL FEEDBACK
        const section = document.getElementById(`${mealTime}-options`);
        if (section) {
            const mealCards = section.querySelectorAll('.meal-card');
            mealCards.forEach((card, index) => {
                card.style.opacity = '0.4';
                card.style.transform = 'scale(0.95) rotateY(15deg)';
                card.style.transition = 'all 0.5s ease';
                card.style.filter = 'blur(3px) brightness(0.8)';
                
                setTimeout(() => {
                    card.style.transform = 'scale(0.98) rotateY(-8deg)';
                }, index * 150);
            });
        }

        // ✅ REQUEST NEW MEALS WITH ENHANCED PARAMETERS
        console.log(`🎲 Requesting ENHANCED VARIETY meals for ${mealTime}...`);
        
        try {
            const newMeals = await fetchMealsForTime(mealTime, 8, true); // Request more meals
            console.log(`📦 Enhanced shuffle: Received ${newMeals.length} meals for ${mealTime}`);
            
            if (newMeals.length === 0) {
                throw new Error(`No meals returned for ${mealTime}`);
            }
            
            // ✅ SELECT BEST MEALS WITH VARIETY
            let mealsToShow = selectMealsWithVariety(newMeals, 2);
            
            if (mealsToShow.length === 0) {
                throw new Error(`No valid meals to display for ${mealTime}`);
            }
            
            // Update stored meals
            allMeals[mealTime] = newMeals;
            
            // ✅ UPDATE UI WITH SUCCESS FEEDBACK
            setTimeout(() => {
                console.log(`📱 Updating UI for ${mealTime} with:`, mealsToShow.map(m => m.name));
                
                let updateSuccess = true;
                mealsToShow.forEach((meal, index) => {
                    setTimeout(() => {
                        const success = updateMealCard(mealTime, index, meal);
                        if (!success) {
                            updateSuccess = false;
                            console.error(`❌ Failed to update card ${index} for ${mealTime}`);
                        }
                    }, index * 300);
                });
                
                // ✅ SHOW SUCCESS MESSAGE
                setTimeout(() => {
                    showSuccessMessage(`${mealTime} meals shuffled with enhanced variety! 🎉`);
                }, 600);
                
                // Restore card appearance
                setTimeout(() => {
                    const section = document.getElementById(`${mealTime}-options`);
                    if (section) {
                        const mealCards = section.querySelectorAll('.meal-card');
                        mealCards.forEach((card, index) => {
                            setTimeout(() => {
                                card.style.opacity = '1';
                                card.style.transform = 'scale(1) rotateY(0deg)';
                                card.style.filter = 'blur(0px) brightness(1)';
                            }, index * 100);
                        });
                    }
                }, 500);
                
            }, 600);

        } catch (error) {
            console.error(`❌ Enhanced shuffle failed for ${mealTime}:`, error);
            throw error;
        }

        // Re-enable button
        setTimeout(() => {
            if (shuffleBtn) {
                shuffleBtn.disabled = false;
                shuffleBtn.innerHTML = '🔄 Shuffle';
                shuffleBtn.style.backgroundColor = '';
                shuffleBtn.style.transform = 'scale(1)';
                console.log(`✅ Button re-enabled for ${mealTime}`);
            }
        }, 3000);
        
        console.log(`✅ Enhanced ${mealTime} shuffle completed successfully!`);
        
        setTimeout(() => {
            logCalorieSummary();
        }, 3500);
        
    } catch (error) {
        console.error(`❌ Enhanced shuffle error for ${mealTime}:`, error);
        
        // Re-enable button on error
        const shuffleBtn = findShuffleButton(mealTime);
        if (shuffleBtn) {
            shuffleBtn.disabled = false;
            shuffleBtn.innerHTML = '🔄 Shuffle';
            shuffleBtn.style.backgroundColor = '';
            shuffleBtn.style.transform = 'scale(1)';
        }
        
        // Restore cards on error
        const section = document.getElementById(`${mealTime}-options`);
        if (section) {
            const mealCards = section.querySelectorAll('.meal-card');
            mealCards.forEach(card => {
                card.style.opacity = '1';
                card.style.transform = 'scale(1) rotateY(0deg)';
                card.style.filter = 'blur(0px) brightness(1)';
            });
        }
        
        let errorMessage = `Failed to shuffle ${mealTime} meals.`;
        if (error.message.includes('No meals returned')) {
            errorMessage += ' Limited variety available for your region.';
        } else if (error.message.includes('HTTP error')) {
            errorMessage += ' Server connection issue.';
        }
        showErrorMessage(errorMessage);
    }
}

// ✅ ENHANCED HELPER FUNCTIONS
function findShuffleButton(mealTime) {
    const strategies = [
        () => document.querySelector(`#shuffle-${mealTime}`),
        () => document.querySelector(`[data-meal-time="${mealTime}"]`),
        () => document.querySelector(`[onclick*="${mealTime}"]`),
        () => document.querySelector(`.shuffle-btn[data-meal="${mealTime}"]`),
        () => {
            const section = document.getElementById(`${mealTime}-options`);
            return section ? section.querySelector('button[class*="shuffle"], button[id*="shuffle"]') : null;
        },
        () => {
            const allButtons = document.querySelectorAll('button');
            for (const btn of allButtons) {
                if (btn.textContent.toLowerCase().includes('shuffle') && 
                    (btn.closest(`#${mealTime}-options`) || 
                     btn.getAttribute('data-meal-time') === mealTime ||
                     btn.id.includes(mealTime))) {
                    return btn;
                }
            }
            return null;
        }
    ];
    
    for (let i = 0; i < strategies.length; i++) {
        try {
            const btn = strategies[i]();
            if (btn) {
                console.log(`✅ Found shuffle button for ${mealTime} using strategy ${i + 1}`);
                return btn;
            }
        } catch (error) {
            console.warn(`⚠️ Strategy ${i + 1} failed for ${mealTime}:`, error);
        }
    }
    
    console.warn(`⚠️ Shuffle button not found for ${mealTime} after trying all strategies`);
    return null;
}

function selectMealsWithVariety(meals, count) {
    if (!meals || meals.length === 0) {
        console.warn('⚠️ No meals provided for variety selection');
        return [];
    }
    
    console.log(`🎯 Selecting ${count} meals from ${meals.length} available meals`);
    
    if (meals.length === 1) {
        console.log('📝 Only one meal available, duplicating it');
        return Array(count).fill(meals[0]);
    }
    
    // Enhanced variety algorithm
    const uniqueMeals = [];
    const usedNames = new Set();
    const usedKeywords = new Set();
    
    // First pass: Get completely unique meals
    for (const meal of meals) {
        if (!usedNames.has(meal.name) && uniqueMeals.length < count) {
            const mealKeywords = extractMealKeywords(meal.name);
            const hasCommonKeyword = mealKeywords.some(keyword => usedKeywords.has(keyword));
            
            if (!hasCommonKeyword || usedNames.size === 0) {
                uniqueMeals.push(meal);
                usedNames.add(meal.name);
                mealKeywords.forEach(keyword => usedKeywords.add(keyword));
                console.log(`✅ Added unique meal: ${meal.name}`);
            }
        }
    }
    
    // Fill remaining slots if needed
    while (uniqueMeals.length < count && meals.length > uniqueMeals.length) {
        const remaining = meals.filter(meal => !usedNames.has(meal.name));
        if (remaining.length === 0) break;
        
        const randomMeal = remaining[Math.floor(Math.random() * remaining.length)];
        uniqueMeals.push(randomMeal);
        usedNames.add(randomMeal.name);
    }
    
    // Final shuffle
    for (let i = uniqueMeals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniqueMeals[i], uniqueMeals[j]] = [uniqueMeals[j], uniqueMeals[i]];
    }
    
    const finalNames = uniqueMeals.slice(0, count).map(meal => meal.name);
    console.log(`🎯 Final selected meals: ${finalNames.join(' | ')}`);
    
    return uniqueMeals.slice(0, count);
}

function extractMealKeywords(mealName) {
    if (!mealName) return [];
    
    const name = mealName.toLowerCase();
    const keywords = [];
    
    const keywordMap = {
        'rice': ['rice', 'biryani', 'pulao', 'khichdi'],
        'roti': ['roti', 'chapati', 'paratha', 'naan'],
        'dal': ['dal', 'lentil', 'sambar', 'rasam'],
        'curry': ['curry', 'masala', 'gravy'],
        'dosa': ['dosa', 'uttapam', 'crepe'],
        'idli': ['idli', 'steamed'],
        'vada': ['vada', 'fritter'],
        'snack': ['chaat', 'pakora', 'samosa'],
        'sweet': ['sweet', 'dessert', 'kheer'],
        'bread': ['bread', 'toast', 'sandwich']
    };
    
    for (const [category, terms] of Object.entries(keywordMap)) {
        if (terms.some(term => name.includes(term))) {
            keywords.push(category);
        }
    }
    
    const ingredients = ['paneer', 'chicken', 'mutton', 'fish', 'egg', 'potato', 'cauliflower', 'spinach'];
    ingredients.forEach(ingredient => {
        if (name.includes(ingredient)) {
            keywords.push(ingredient);
        }
    });
    
    return keywords.length > 0 ? keywords : ['general'];
}

// ✅ ENHANCED ERROR AND SUCCESS MESSAGE FUNCTIONS
function showErrorMessage(message) {
    const existingErrors = document.querySelectorAll('.temp-error-message');
    existingErrors.forEach(el => el.remove());
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'temp-error-message fixed top-24 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md text-center';
    errorDiv.innerHTML = `
        <div class="flex items-center gap-2">
            <span>⚠️</span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    errorDiv.style.opacity = '0';
    errorDiv.style.transform = 'translate(-50%, -20px) scale(0.9)';
    setTimeout(() => {
        errorDiv.style.transition = 'all 0.3s ease';
        errorDiv.style.opacity = '1';
        errorDiv.style.transform = 'translate(-50%, 0) scale(1)';
    }, 10);
    
    // FIXED: Increased timeout to 30 seconds and removed problematic opacity fade
    setTimeout(() => {
        if (document.body.contains(errorDiv)) {
            document.body.removeChild(errorDiv);
        }
    }, 30000); // Changed from 4000 to 30000 (30 seconds)
}

function showSuccessMessage(message) {
    const existingSuccess = document.querySelectorAll('.temp-success-message');
    existingSuccess.forEach(el => el.remove());
    
    const successDiv = document.createElement('div');
    successDiv.className = 'temp-success-message fixed top-24 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md text-center';
    successDiv.innerHTML = `
        <div class="flex items-center gap-2">
            <span>✅</span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(successDiv);
    
    successDiv.style.opacity = '0';
    successDiv.style.transform = 'translate(-50%, -20px) scale(0.9)';
    setTimeout(() => {
        successDiv.style.transition = 'all 0.3s ease';
        successDiv.style.opacity = '1';
        successDiv.style.transform = 'translate(-50%, 0) scale(1)';
    }, 10);
    
    // FIXED: Increased timeout to 30 seconds and removed problematic opacity fade
    setTimeout(() => {
        if (document.body.contains(successDiv)) {
            document.body.removeChild(successDiv);
        }
    }, 30000); // Changed from 3000 to 30000 (30 seconds)
}

// Keep all existing helper functions
function showMealTimeError(mealTime, message) {
    const section = document.getElementById(`${mealTime}-options`);
    if (!section) return;
    
    let errorEl = section.querySelector('.meal-time-error');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'meal-time-error text-red-500 text-center py-4 px-2 bg-red-50 rounded-lg border border-red-200';
        section.appendChild(errorEl);
    }
    
    errorEl.innerHTML = `
        <div class="text-sm font-medium">${message}</div>
        <button onclick="retryMealTime('${mealTime}')" class="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-xs">
            Retry
        </button>
    `;
    
    // FIXED: Increased timeout to 60 seconds for meal time errors
    setTimeout(() => {
        if (errorEl && errorEl.parentNode) {
            errorEl.remove();
        }
    }, 60000); // Changed from 10000 to 60000 (60 seconds)
}

async function retryMealTime(mealTime) {
    console.log(`🔄 Retrying to load ${mealTime}...`);
    
    // Remove error display
    const section = document.getElementById(`${mealTime}-options`);
    if (section) {
        const errorEl = section.querySelector('.meal-time-error');
        if (errorEl) errorEl.remove();
    }
    
    // Show loading state for this meal time
    showMealTimeLoading(mealTime, true);
    
    try {
        const meals = await fetchMealsForTime(mealTime, 4, true);
        allMeals[mealTime] = meals;
        
        if (meals.length >= 2) {
            updateMealCard(mealTime, 0, meals[0]);
            updateMealCard(mealTime, 1, meals[1]);
            showSuccessMessage(`${mealTime} meals loaded successfully!`);
        } else if (meals.length === 1) {
            updateMealCard(mealTime, 0, meals[0]);
            updateMealCard(mealTime, 1, meals[0]);
            showSuccessMessage(`${mealTime} meal loaded successfully!`);
        } else {
            throw new Error('No meals found');
        }
    } catch (error) {
        console.error(`❌ Retry failed for ${mealTime}:`, error);
        showMealTimeError(mealTime, `Still unable to load ${mealTime} meals. Try refreshing the page.`);
    } finally {
        showMealTimeLoading(mealTime, false);
    }
}

function showMealTimeLoading(mealTime, show) {
    const section = document.getElementById(`${mealTime}-options`);
    if (!section) return;
    
    let loadingEl = section.querySelector('.meal-time-loading');
    
    if (show) {
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.className = 'meal-time-loading text-blue-500 text-center py-4 px-2 bg-blue-50 rounded-lg border border-blue-200';
            loadingEl.innerHTML = `
                <div class="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                <div class="text-sm">Loading ${mealTime} meals...</div>
            `;
            section.appendChild(loadingEl);
        }
    } else {
        if (loadingEl) {
            loadingEl.remove();
        }
    }
}

function showLoadingState(show) {
    const loadingElements = document.querySelectorAll('.loading-state');
    console.log(`🔄 Loading state: ${show}, found ${loadingElements.length} loading elements`);
    
    loadingElements.forEach(el => {
        if (show) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
    
    const mainContent = document.querySelector('.meals-container, .meal-plan-container');
    if (mainContent) {
        if (show) {
            mainContent.style.opacity = '0.3';
            mainContent.style.pointerEvents = 'none';
        } else {
            mainContent.style.opacity = '1';
            mainContent.style.pointerEvents = 'auto';
        }
    }
}

function showErrorState(show) {
    const errorElements = document.querySelectorAll('.error-state');
    console.log(`❌ Error state: ${show}, found ${errorElements.length} error elements`);
    
    errorElements.forEach(el => {
        if (show) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
}

function logCalorieSummary() {
    const mealTimes = ['breakfast', 'lunch', 'dinner', 'snacks'];
    let totalCalories = 0;
    
    console.log('📊 Current Meal Calorie Summary:');
    console.log('=====================================');
    
    mealTimes.forEach(mealTime => {
        if (allMeals[mealTime] && allMeals[mealTime].length > 0) {
            const meal = allMeals[mealTime][0];
            const mealCalories = meal.calories || 0;
            const portion = meal.portion || 'Unknown portion';
            totalCalories += mealCalories;
            console.log(`  ${mealTime.toUpperCase()}: ${mealCalories} kcal`);
            console.log(`    🍽️ ${meal.name} (${portion})`);
        } else {
            console.log(`  ${mealTime.toUpperCase()}: No meal selected`);
        }
    });
    
    console.log('=====================================');
    console.log(`  🎯 TOTAL: ${totalCalories} kcal`);
    console.log(`  🎯 TARGET: ${userCalorieGoal} kcal`);
    const difference = totalCalories - userCalorieGoal;
    console.log(`  📊 DIFFERENCE: ${difference > 0 ? '+' : ''}${difference} kcal`);
    
    if (Math.abs(difference) > 200) {
        console.warn(`⚠️ Large calorie difference detected (${difference} kcal)`);
    }
}

function getMealTimeFromButton(button) {
    const dataAttribute = button.getAttribute('data-meal-time');
    if (dataAttribute) return dataAttribute;
    
    const id = button.id;
    if (id && id.startsWith('shuffle-')) {
        return id.replace('shuffle-', '');
    }
    
    const classList = Array.from(button.classList);
    for (const className of classList) {
        const mealTimes = ['breakfast', 'lunch', 'dinner', 'snacks'];
        for (const mealTime of mealTimes) {
            if (className.includes(mealTime)) {
                return mealTime;
            }
        }
    }
    
    const mealTimes = ['breakfast', 'lunch', 'dinner', 'snacks'];
    for (const mealTime of mealTimes) {
        const section = button.closest(`#${mealTime}-options, .${mealTime}-section, [data-meal-time="${mealTime}"]`);
        if (section) return mealTime;
    }
    
    const parent = button.parentElement;
    if (parent) {
        const text = parent.textContent.toLowerCase();
        const mealTimes = ['breakfast', 'lunch', 'dinner', 'snacks'];
        for (const mealTime of mealTimes) {
            if (text.includes(mealTime)) {
                return mealTime;
            }
        }
    }
    
    return null;
}

// ✅ ENHANCED INITIALIZATION WITH BETTER EVENT HANDLING
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Enhanced Meals page initialized - VARIETY OPTIMIZED');
    
    // Initialize tracking objects
    lastShuffleTime = {};
    shuffleCounter = {};
    allMeals = {};
    previousMealSelections = {};
    shuffleHistory = {};
    
    // Add global error handlers
    window.addEventListener('error', (e) => {
        console.error('❌ Global error:', e.error);
        if (e.error && e.error.message && e.error.message.includes('shuffle')) {
            showErrorMessage('A shuffle error occurred. Please try again.');
        }
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        console.error('❌ Unhandled promise rejection:', e.reason);
        if (e.reason && e.reason.toString().includes('shuffle')) {
            showErrorMessage('A shuffle operation failed. Please try again.');
        }
    });
    
    setTimeout(() => {
        console.log('🔍 Setting up enhanced variety shuffle button event listeners...');
        
        const mealTimes = ['breakfast', 'lunch', 'dinner', 'snacks'];
        let buttonsFound = 0;
        
        mealTimes.forEach(mealTime => {
            const shuffleBtn = findShuffleButton(mealTime);
            
            if (shuffleBtn) {
                console.log(`✅ Setting up enhanced variety listener for ${mealTime} button`);
                buttonsFound++;
                
                // Remove existing listeners and add new one
                const newBtn = shuffleBtn.cloneNode(true);
                shuffleBtn.parentNode.replaceChild(newBtn, shuffleBtn);
                
                // ✅ ENHANCED CLICK HANDLER WITH VARIETY FOCUS
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🔀 ENHANCED VARIETY SHUFFLE CLICKED: ${mealTime}`);
                    
                    // Visual feedback on click
                    newBtn.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        newBtn.style.transform = '';
                    }, 150);
                    
                    shuffleMeals(mealTime);
                });
                
                // Prevent double-click
                newBtn.addEventListener('dblclick', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🚫 Double-click prevented for ${mealTime}`);
                });
                
                // ✅ ENHANCED HOVER EFFECTS
                newBtn.addEventListener('mouseenter', () => {
                    if (!newBtn.disabled) {
                        newBtn.style.transform = 'scale(1.05)';
                        newBtn.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
                        newBtn.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                        newBtn.style.backgroundColor = '#3b82f6';
                    }
                });
                
                newBtn.addEventListener('mouseleave', () => {
                    if (!newBtn.disabled) {
                        newBtn.style.transform = 'scale(1)';
                        newBtn.style.boxShadow = '';
                        newBtn.style.backgroundColor = '';
                    }
                });
                
                // Keyboard accessibility
                newBtn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(`⌨️ KEYBOARD VARIETY SHUFFLE: ${mealTime}`);
                        shuffleMeals(mealTime);
                    }
                });
                
                // Store reference
                newBtn.setAttribute('data-meal-time', mealTime);
                newBtn.setAttribute('data-shuffle-setup', 'enhanced-variety');
                
            } else {
                console.warn(`⚠️ No shuffle button found for ${mealTime}`);
            }
        });
        
        // ✅ ENHANCED GLOBAL FALLBACK EVENT LISTENER
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && 
                !button.getAttribute('data-shuffle-setup') && 
                (button.textContent.toLowerCase().includes('shuffle') ||
                 button.className.toLowerCase().includes('shuffle') ||
                 button.id.toLowerCase().includes('shuffle'))) {
                
                const mealTime = getMealTimeFromButton(button);
                if (mealTime) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🔀 FALLBACK ENHANCED VARIETY SHUFFLE: ${mealTime}`);
                    shuffleMeals(mealTime);
                } else {
                    console.warn('⚠️ Could not determine meal time for shuffle button:', button);
                }
            }
        });
        
        // Make functions globally available
        window.retryMealTime = retryMealTime;
        window.shuffleMeals = shuffleMeals;
        window.loadAllMeals = loadAllMeals;
        window.logCalorieSummary = logCalorieSummary;
        window.fetchMealsForTime = fetchMealsForTime;
        
        console.log(`📊 Enhanced variety shuffle buttons setup: ${buttonsFound}/${mealTimes.length} found`);
        
        // Initialize Firebase auth listener
        auth.onAuthStateChanged(user => {
            if (user) {
                console.log('🔐 User authenticated, loading meals with enhanced variety...');
                loadAllMeals();
            } else {
                console.log('🔓 Not authenticated - redirecting...');
                window.location.href = '/login';
            }
        });
        
    }, 1000);
    
    // ✅ ENHANCED HEALTH CHECK WITH VARIETY VERIFICATION
    setInterval(() => {
        const mealTimes = ['breakfast', 'lunch', 'dinner', 'snacks'];
        let healthyButtons = 0;
        
        mealTimes.forEach(mealTime => {
            const btn = findShuffleButton(mealTime);
            if (btn && !btn.disabled && btn.getAttribute('data-shuffle-setup')) {
                healthyButtons++;
            }
        });
        
        if (healthyButtons < mealTimes.length) {
            console.warn(`⚠️ Enhanced variety shuffle health check: ${healthyButtons}/${mealTimes.length} buttons healthy`);
        } else {
            console.log(`✅ All variety shuffle buttons healthy: ${healthyButtons}/${mealTimes.length}`);
        }
    }, 30000);
});

// ✅ ENHANCED DEBUGGING FUNCTIONS
window.debugShuffle = (mealTime) => {
    console.log(`🔍 Enhanced variety debug info for ${mealTime}:`);
    console.log('- Button:', findShuffleButton(mealTime));
    console.log('- Last shuffle time:', lastShuffleTime[mealTime]);
    console.log('- Shuffle counter:', shuffleCounter[mealTime]);
    console.log('- Available meals:', allMeals[mealTime]?.length || 0);
    console.log('- Previous selections:', previousMealSelections[mealTime]);
    console.log('- Shuffle history:', shuffleHistory[mealTime]);
    console.log('- User preferences:', userPreferences);
    console.log('- Diet filter status: REMOVED for better variety');
};

window.debugAllMeals = () => {
    console.log('🔍 All meals enhanced variety debug info:');
    Object.entries(allMeals).forEach(([mealTime, meals]) => {
        console.log(`${mealTime}: ${meals?.length || 0} meals`);
        if (meals && meals.length > 0) {
            console.log(`  First meal: ${meals[0].name} (${meals[0].calories} cal, ${meals[0].portion})`);
            console.log(`  Previous selections: ${previousMealSelections[mealTime] || 'None'}`);
            console.log(`  Shuffle history length: ${shuffleHistory[mealTime]?.length || 0}`);
        }
    });
    console.log('🚫 Diet preference filter: DISABLED for maximum variety');
};

window.testEnhancedShuffle = async () => {
    console.log('🧪 Testing enhanced variety shuffle for all meal times...');
    const mealTimes = ['breakfast', 'lunch', 'dinner', 'snacks'];
    
    for (const mealTime of mealTimes) {
        console.log(`🧪 Testing enhanced variety ${mealTime} shuffle...`);
        try {
            // Test initial load
            console.log(`  📦 Initial load for ${mealTime}...`);
            await loadAllMeals();
            
            // Test shuffle
            console.log(`  🔀 Testing variety shuffle for ${mealTime}...`);
            await shuffleMeals(mealTime);
            
            console.log(`✅ Enhanced variety ${mealTime} shuffle test passed`);
        } catch (error) {
            console.error(`❌ Enhanced variety ${mealTime} shuffle test failed:`, error);
        }
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 4000));
    }
    
    console.log('🧪 Enhanced variety shuffle testing complete');
};

// ✅ FUNCTION TO CLEAR SHUFFLE CACHE FROM FRONTEND
window.clearShuffleCache = async () => {
    try {
        const response = await fetch('/api/clear-shuffle-cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        console.log('🧹 Enhanced shuffle cache cleared:', result);
        
        // Also clear frontend cache
        previousMealSelections = {};
        shuffleCounter = {};
        lastShuffleTime = {};
        shuffleHistory = {};
        
        showSuccessMessage('Enhanced shuffle cache cleared! Maximum variety guaranteed.');
        
    } catch (error) {
        console.error('❌ Failed to clear enhanced shuffle cache:', error);
        showErrorMessage('Failed to clear shuffle cache');
    }
};

// ✅ NEW FUNCTION TO TEST VARIETY
window.testVariety = async () => {
    try {
        const response = await fetch('/api/test-variety', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                region: userPreferences.region || 'North India',
                calories: userCalorieGoal || 2000
            })
        });
        
        const result = await response.json();
        console.log('🎨 Variety test results:', result);
        
        if (result.success) {
            showSuccessMessage('Variety test completed! Check console for results.');
        } else {
            showErrorMessage('Variety test failed');
        }
        
    } catch (error) {
        console.error('❌ Failed to test variety:', error);
        showErrorMessage('Failed to test variety');
    }
};

console.log('✅ Enhanced Meals.js loaded with MAXIMUM VARIETY optimization and comprehensive debugging tools');