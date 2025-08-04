# app/routes/meal_routes.py - FIXED VERSION WITH IMPROVED SHUFFLING AND FILTER REMOVAL
from flask import Blueprint, request, jsonify
import json
import pandas as pd
import random
import time
from app.services.meal_model import predict_suitable_meals
from app.services.portion_calculator import PortionCalculator

meal_routes = Blueprint('meal_bp', __name__)

# Initialize the portion calculator
portion_calculator = PortionCalculator()

# Fixed calorie splits
CALORIE_SPLITS = {
    "breakfast": 0.30,
    "lunch": 0.30,
    "dinner": 0.30,
    "snacks": 0.10
}

# ✅ REGION MAPPING TO HANDLE DIFFERENT FORMATS
REGION_MAPPING = {
    'north': ['north', 'north_india', 'north india'],
    'south': ['south', 'south_india', 'south india'],
    'east': ['east', 'east_india', 'east india'],
    'west': ['west', 'west_india', 'west india'],
    'north_india': ['north', 'north_india', 'north india'],
    'south_india': ['south', 'south_india', 'south india'],
    'east_india': ['east', 'east_india', 'east india'],
    'west_india': ['west', 'west_india', 'west india']
}

# ✅ GLOBAL CACHE TO TRACK PREVIOUS SELECTIONS FOR PROPER SHUFFLING
previous_selections = {}
meal_usage_history = {}  # Track how often each meal is used

@meal_routes.route("/api/get-meals", methods=["POST"])
def get_meals():
    try:
        user_data = request.get_json()
        print("🔍 Received user_data:", user_data)

        goal = user_data.get("goal", "maintain")
        user_calories = int(user_data.get("calories", 1800))
        is_shuffle = user_data.get("shuffle", False)
        shuffle_count = user_data.get("shuffle_count", 0)
        random_seed = user_data.get("random_seed", str(time.time()))
        meal_time_filter = user_data.get("meal_time", None)
        
        print(f"🎯 User daily calorie target: {user_calories}")
        print(f"🔀 Is shuffle request: {is_shuffle}, Count: {shuffle_count}, Seed: {random_seed}")
        print(f"🍽️ Meal time filter: {meal_time_filter}")

        # ✅ ENHANCED RANDOMIZATION FOR SHUFFLE REQUESTS
        if is_shuffle:
            # Use multiple randomization sources
            combined_seed = hash(f"{random_seed}_{shuffle_count}_{time.time()}_{random.randint(1, 100000)}")
            random.seed(combined_seed)
            print(f"🎲 Enhanced shuffle seed: {combined_seed}")

        # Load meals.json
        with open('app/meals.json', 'r', encoding='utf-8') as f:
            meal_data = json.load(f)

        print("📊 Available regions in meals.json:", list(meal_data.keys()))

        # Flatten dataset with improved region handling
        flat_meals = []
        for region, meals_by_region in meal_data.items():
            normalized_region = region.lower().replace(" ", "_").strip()
            print(f"📍 Processing region: '{region}' -> '{normalized_region}'")
            
            for meal_time, meals in meals_by_region.items():
                normalized_meal_time = meal_time.lower().strip()
                
                for meal in meals:
                    meal_copy = meal.copy()
                    meal_copy['region'] = normalized_region
                    meal_copy['meal_time'] = normalized_meal_time
                    meal_copy['original_region'] = region
                    flat_meals.append(meal_copy)

        df = pd.DataFrame(flat_meals)
        print(f"📊 Total meals loaded: {len(df)}")

        # ML prediction
        suitable_df = predict_suitable_meals(user_data, df)
        if "suitable" not in suitable_df.columns:
            raise ValueError("❌ 'suitable' column missing after prediction")

        filtered = suitable_df[suitable_df["suitable"] == 1].copy()
        print(f"📊 After ML filtering: {len(filtered)} suitable meals")

        # ✅ APPLY ONLY REGION FILTER - REMOVE VEG/NON-VEG FILTERING
        filtered = apply_region_filter_only(filtered, user_data)
        
        if len(filtered) == 0:
            return jsonify({
                "meals": {meal_time: [] for meal_time in CALORIE_SPLITS.keys()},
                "total_calories": 0,
                "target_calories": user_calories,
                "error": "No meals found matching your preferences",
                "debug_info": {
                    "total_meals_loaded": len(df),
                    "after_ml_filter": len(suitable_df[suitable_df["suitable"] == 1]),
                    "user_region": user_data.get("region", ""),
                    "available_regions": list(df['region'].unique()),
                    "diet_preference": "FILTER REMOVED FOR BETTER VARIETY"
                }
            }), 200

        # ✅ BUILD RESPONSE BY MEAL TIME WITH ENHANCED SHUFFLING
        meals_by_time = {}
        total_actual_calories = 0
        
        # Generate unique request ID for this request
        request_id = f"{random_seed}_{shuffle_count}_{time.time()}"
        
        # Determine which meal times to process
        meal_times_to_process = [meal_time_filter] if meal_time_filter else CALORIE_SPLITS.keys()
        
        for meal_time in meal_times_to_process:
            split = CALORIE_SPLITS[meal_time]
            target_cals = int(user_calories * split)
            print(f"🎯 {meal_time}: target {target_cals} calories ({split*100}%)")

            pool = filtered[filtered["meal_time"] == meal_time]
            print(f"📊 {meal_time} pool size: {len(pool)} (BEFORE SHUFFLE)")
            
            if pool.empty:
                print(f"⚠️ No meals found for {meal_time}, skipping")
                meals_by_time[meal_time] = []
                continue

            # ✅ ENHANCED SELECTION LOGIC WITH VARIETY GUARANTEE
            cache_key = f"{meal_time}_{user_data.get('region', 'all')}"
            
            if is_shuffle and cache_key in previous_selections:
                print(f"🔄 SHUFFLE MODE: Selecting different meals for {meal_time}")
                print(f"   Previous: {previous_selections[cache_key]}")
                selected = guaranteed_different_selection_v2(
                    pool, target_cals, previous_selections[cache_key], 
                    count=8, shuffle_count=shuffle_count, meal_time=meal_time
                )
            else:
                print(f"🆕 INITIAL LOAD: Smart selection for {meal_time}")
                selected = enhanced_smart_meal_selection(pool, target_cals, count=8, meal_time=meal_time)
            
            # ✅ STORE CURRENT SELECTION FOR FUTURE SHUFFLES
            if len(selected) > 0:
                selected_names = [meal.get("name", "") for meal in selected[:4]]
                previous_selections[cache_key] = selected_names
                print(f"📝 Stored selection for {meal_time}: {selected_names}")
            
            # Process selected meals
            scaled_meals = process_selected_meals(selected[:4], target_cals, goal)
            meals_by_time[meal_time] = scaled_meals
            
            if scaled_meals:
                total_actual_calories += scaled_meals[0].get("calories", 0)

        # ✅ FILL REMAINING MEAL TIMES IF ONLY ONE WAS PROCESSED
        if meal_time_filter:
            for meal_time in CALORIE_SPLITS.keys():
                if meal_time not in meals_by_time:
                    meals_by_time[meal_time] = []

        print(f"🎯 Final total calories: {total_actual_calories} (target: {user_calories})")
        
        return jsonify({
            "meals": meals_by_time,
            "total_calories": total_actual_calories,
            "target_calories": user_calories,
            "goal_calories": user_calories,
            "shuffle_applied": is_shuffle,
            "shuffle_count": shuffle_count,
            "request_id": request_id,
            "filtering_applied": "Region only - Diet preference filter removed for variety",
            "calorie_breakdown": {
                meal_time: int(user_calories * split) 
                for meal_time, split in CALORIE_SPLITS.items()
            },
            "message": f"Meals {'shuffled' if is_shuffle else 'loaded'} successfully"
        }), 200

    except Exception as e:
        print("❌ ERROR:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def apply_region_filter_only(filtered, user_data):
    """✅ APPLY ONLY REGION FILTER - REMOVE VEG/NON-VEG FILTERING FOR BETTER VARIETY"""
    user_region = user_data.get("region", "").lower().replace(" ", "_").strip()
    
    print(f"🎯 User region filter: '{user_region}'")
    print(f"🚫 Diet preference filter: REMOVED for better meal variety")

    # Apply region filter only
    if user_region and user_region not in ["all", "all_regions"]:
        region_matches = REGION_MAPPING.get(user_region, [user_region])
        
        region_filtered = filtered[filtered['region'].isin(region_matches)]
        
        if len(region_filtered) == 0:
            # Try partial matching as fallback
            partial_matches = filtered[
                filtered['region'].str.contains(user_region.replace('_', ' '), case=False, na=False) |
                filtered['region'].str.contains(user_region.replace(' ', '_'), case=False, na=False)
            ]
            if len(partial_matches) > 0:
                region_filtered = partial_matches
                print(f"✅ Used partial matching for region: {len(partial_matches)} meals found")
            else:
                print(f"⚠️ No meals found for region '{user_region}', using all regions")
                region_filtered = filtered
        
        filtered = region_filtered

    print(f"📊 Final filtered meals count: {len(filtered)} (NO DIET RESTRICTIONS)")
    return filtered


def guaranteed_different_selection_v2(pool, target_calories, previous_names, count=4, shuffle_count=0, meal_time=""):
    """
    ✅ ENHANCED VERSION - GUARANTEED to return different meals with better variety
    """
    pool_list = pool.to_dict(orient="records")
    print(f"🔄 GUARANTEED DIFFERENT SELECTION V2 for {meal_time}")
    print(f"🔄 Pool size: {len(pool_list)} meals")
    print(f"🔄 Previous selection: {previous_names}")
    print(f"🔄 Shuffle count: {shuffle_count}")
    
    if not pool_list:
        return []
    
    # ✅ STRATEGY 1: GET COMPLETELY DIFFERENT MEALS
    different_meals = []
    for meal in pool_list:
        meal_name = meal.get("name", "")
        if meal_name not in previous_names:
            different_meals.append(meal)
    
    print(f"🎯 Found {len(different_meals)} meals different from previous selection")
    
    # ✅ STRATEGY 2: IF WE HAVE ENOUGH DIFFERENT MEALS, USE ADVANCED SELECTION
    if len(different_meals) >= count:
        # Apply multiple randomization layers
        random.seed(hash(f"diff_shuffle_{shuffle_count}_{time.time()}_{random.randint(1, 50000)}"))
        
        # Shuffle multiple times with different seeds
        for i in range(shuffle_count + 5):
            random.seed(hash(f"layer_{i}_{time.time()}_{random.randint(1, 10000)}"))
            random.shuffle(different_meals)
        
        # Select with variety algorithm
        selected = select_with_variety(different_meals, count)
        selected_names = [meal.get("name", "") for meal in selected]
        print(f"✅ Selected completely different meals: {selected_names}")
        return selected
    
    # ✅ STRATEGY 3: MIX DIFFERENT + LESS RECENT MEALS
    selected = different_meals.copy()  # Start with all different meals
    
    # Fill remaining slots, but avoid most recent selections
    remaining_count = count - len(selected)
    
    if remaining_count > 0:
        # Prefer meals that are not in recent history
        available_for_repeat = []
        for meal in pool_list:
            meal_name = meal.get("name", "")
            # Skip if it's in previous selection
            if meal_name not in previous_names:
                available_for_repeat.append(meal)
        
        # If we still need more, allow some repeats but prioritize less recently used
        if len(available_for_repeat) < remaining_count:
            # Add meals from previous selection but shuffle heavily
            for meal in pool_list:
                if meal not in available_for_repeat:
                    available_for_repeat.append(meal)
        
        # Apply heavy randomization
        for i in range(shuffle_count + 7):
            random.seed(hash(f"repeat_shuffle_{i}_{time.time()}_{random.randint(1, 20000)}"))
            random.shuffle(available_for_repeat)
        
        # Fill remaining slots
        for meal in available_for_repeat:
            if len(selected) >= count:
                break
            if meal not in selected:  # Avoid exact duplicates
                selected.append(meal)
    
    # ✅ FINAL RANDOMIZATION WITH VARIETY OPTIMIZATION
    selected = select_with_variety(selected, count)
    
    final_names = [meal.get("name", "") for meal in selected]
    overlap = set(final_names) & set(previous_names)
    print(f"✅ Final V2 selection: {final_names}")
    print(f"✅ Overlap with previous: {list(overlap)} ({len(overlap)}/{len(previous_names)})")
    
    return selected[:count]


def enhanced_smart_meal_selection(pool, target_calories, count=4, meal_time=""):
    """
    ✅ ENHANCED SMART SELECTION WITH IMPROVED VARIETY AND RANDOMIZATION
    """
    if pool.empty:
        return []
    
    pool_list = pool.to_dict(orient="records")
    print(f"🎲 Enhanced smart selection for {meal_time}")
    print(f"🎲 Pool size: {len(pool_list)} meals, target: {target_calories} cal")
    
    # ✅ MULTIPLE RANDOMIZATION PASSES WITH DIFFERENT SEEDS
    for i in range(5):
        random.seed(hash(f"smart_select_{meal_time}_{i}_{time.time()}_{random.randint(1, 30000)}"))
        random.shuffle(pool_list)
    
    # Use variety selection algorithm
    selected = select_with_variety(pool_list, count)
    
    final_names = [meal.get("name", "Unknown") for meal in selected]
    print(f"✅ Enhanced smart selected meals for {meal_time}: {final_names}")
    
    return selected


def select_with_variety(meal_list, count):
    """
    ✅ SELECT MEALS WITH MAXIMUM VARIETY - AVOID SIMILAR DISHES
    """
    if len(meal_list) <= count:
        return meal_list[:count]
    
    selected = []
    used_keywords = set()
    remaining_meals = meal_list.copy()
    
    # ✅ PHASE 1: SELECT MEALS WITH DIFFERENT KEYWORDS
    variety_keywords = [
        'rice', 'roti', 'dal', 'dosa', 'idli', 'parantha', 'curry', 'biryani',
        'samosa', 'vada', 'upma', 'poha', 'dhokla', 'chicken', 'paneer', 'fish',
        'thali', 'soup', 'salad', 'tea', 'chaat'
    ]
    
    # First pass: select meals with different primary keywords
    for keyword in variety_keywords:
        if len(selected) >= count:
            break
            
        candidates = []
        for meal in remaining_meals:
            meal_name = meal.get("name", "").lower()
            if keyword in meal_name and keyword not in used_keywords:
                candidates.append(meal)
        
        if candidates:
            # Randomize selection from candidates
            random.shuffle(candidates)
            selected_meal = candidates[0]
            selected.append(selected_meal)
            used_keywords.add(keyword)
            remaining_meals.remove(selected_meal)
    
    # ✅ PHASE 2: FILL REMAINING SLOTS WITH RANDOM SELECTION
    while len(selected) < count and remaining_meals:
        random.shuffle(remaining_meals)
        selected.append(remaining_meals.pop(0))
    
    # ✅ FINAL SHUFFLE
    random.shuffle(selected)
    
    return selected[:count]


def process_selected_meals(selected, target_cals, goal):
    """Process selected meals with proper portion calculation"""
    scaled_meals = []
    
    for i, meal in enumerate(selected):
        try:
            original_calories = meal.get("calories", 100)
            meal_name = meal.get("name", "Unknown meal")
            
            # Smart portion calculation
            if target_cals <= 200:
                adjusted_target = min(target_cals, original_calories * 1.2)
            elif target_cals >= 400:
                adjusted_target = min(target_cals, original_calories * 1.5)
            else:
                adjusted_target = target_cals
            
            smart_portion = portion_calculator.calculate_portion(meal_name, adjusted_target)
            
            portion_multiplier = adjusted_target / original_calories if original_calories > 0 else 1
            portion_multiplier = max(0.3, min(3.0, portion_multiplier))
            
            scaled_calories = int(adjusted_target)
            
            meal_copy = meal.copy()
            meal_copy["portion"] = smart_portion
            meal_copy["calories"] = scaled_calories
            meal_copy["original_calories"] = original_calories
            meal_copy["portion_multiplier"] = portion_multiplier
            meal_copy["explanation"] = generate_explanation(meal_copy, goal)
            meal_copy["meal_index"] = i
            meal_copy["region_source"] = meal.get("original_region", meal.get("region", "Unknown"))
            meal_copy["timestamp"] = time.time()
            meal_copy["variety_optimized"] = True  # Mark as variety optimized
            
            # Scale nutrients
            meal_copy["protein"] = round(meal.get("protein", 0) * portion_multiplier, 1)
            meal_copy["carbs"] = round(meal.get("carbs", 0) * portion_multiplier, 1)
            meal_copy["fats"] = round(meal.get("fats", 0) * portion_multiplier, 1)
            
            scaled_meals.append(meal_copy)
            
            print(f"  📋 {i+1}. {meal_name}: {original_calories} → {scaled_calories} cal ({smart_portion})")
            
        except Exception as e:
            print(f"❌ Error processing meal {i}: {e}")
            continue

    return scaled_meals


def generate_explanation(meal, goal):
    """Generate explanation for meal selection"""
    name = meal.get("name", "").lower()
    if any(x in name for x in ["chicken", "egg", "paneer", "dal", "rajma"]):
        return f"Rich in protein to support your {goal} goal."
    elif any(x in name for x in ["roti", "rice", "pulao", "poha", "idli"]):
        return f"Provides energy-rich carbs to fuel your {goal} goal."
    elif any(x in name for x in ["raita", "salad", "chutney", "sambar", "soup"]):
        return f"A light side to improve digestion and balance your meal."
    else:
        return f"Selected for variety and balanced nutrition."


# ✅ ENHANCED ENDPOINTS
@meal_routes.route("/api/clear-shuffle-cache", methods=["POST"])
def clear_shuffle_cache():
    """Clear the shuffle cache for testing"""
    global previous_selections, meal_usage_history
    previous_selections.clear()
    meal_usage_history.clear()
    return jsonify({"success": True, "message": "Enhanced shuffle cache cleared"})


@meal_routes.route("/api/debug-shuffle", methods=["POST"])
def debug_shuffle():
    """Enhanced debug endpoint to check shuffle state"""
    user_data = request.get_json()
    
    debug_info = {
        "previous_selections": previous_selections,
        "meal_usage_history": meal_usage_history,
        "request_params": user_data,
        "cache_keys": list(previous_selections.keys()),
        "filter_status": "Diet preference filter REMOVED for better variety"
    }
    
    return jsonify({
        "success": True,
        "debug_info": debug_info
    })


@meal_routes.route("/api/test-variety", methods=["POST"])
def test_variety():
    """Test the variety selection algorithm"""
    try:
        user_data = request.get_json()
        
        with open('app/meals.json', 'r', encoding='utf-8') as f:
            meal_data = json.load(f)

        flat_meals = []
        for region, meals_by_region in meal_data.items():
            for meal_time, meals in meals_by_region.items():
                for meal in meals:
                    meal['region'] = region.lower().replace(" ", "_").strip()
                    meal['meal_time'] = meal_time.lower().strip()
                    flat_meals.append(meal)

        df = pd.DataFrame(flat_meals)
        
        results = {}
        for meal_time in ['breakfast', 'lunch', 'dinner', 'snacks']:
            pool = df[df["meal_time"] == meal_time]
            
            # Test variety selection
            test_results = []
            for i in range(5):  # 5 different selections
                if i == 0:
                    selected = enhanced_smart_meal_selection(pool, 300, count=4, meal_time=meal_time)
                    previous_names = [meal.get("name", "") for meal in selected]
                else:
                    selected = guaranteed_different_selection_v2(
                        pool, 300, previous_names, count=4, shuffle_count=i, meal_time=meal_time
                    )
                
                meal_names = [meal.get("name", f"Unknown {j}") for j, meal in enumerate(selected)]
                test_results.append(meal_names)
                previous_names = meal_names  # Update for next iteration
            
            results[meal_time] = {
                'pool_size': len(pool),
                'selections': test_results,
                'unique_meals_across_all': len(set([meal for selection in test_results for meal in selection])),
                'variety_score': len(set([meal for selection in test_results for meal in selection])) / max(1, len(test_results[0]) * len(test_results))
            }
        
        return jsonify({
            'success': True,
            'variety_test_results': results,
            'message': 'Enhanced variety selection test completed',
            'filter_info': 'Diet preference filter removed for maximum variety'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@meal_routes.route("/api/test-portions", methods=["GET"])
def test_portions():
    """Test endpoint to see how different meals get portioned"""
    test_meals = [
        {"name": "Sambar Rice", "calories": 300},
        {"name": "Masala Dosa", "calories": 400},
        {"name": "Roti with Dal", "calories": 250},
        {"name": "Idli Sambar", "calories": 200},
        {"name": "Vada Pav", "calories": 300},
        {"name": "Biryani", "calories": 500},
        {"name": "Dhokla", "calories": 150},
        {"name": "Aloo Parantha", "calories": 350},
        {"name": "Poha", "calories": 200},
        {"name": "Green Tea with Cookies", "calories": 100}
    ]
    
    results = []
    for meal in test_meals:
        portion = portion_calculator.calculate_portion(meal['name'], meal['calories'])
        category = portion_calculator.identify_food_category(meal['name'])
        
        results.append({
            'meal': meal['name'],
            'calories': meal['calories'],
            'smart_portion': portion,
            'category': category
        })
    
    return jsonify({
        'success': True,
        'test_results': results,
        'message': 'Smart portion calculator test results'
    })