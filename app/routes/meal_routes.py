# app/routes/meal_routes.py
from flask import Blueprint, request, jsonify
import json
import pandas as pd
from app.services.meal_model import predict_suitable_meals

meal_routes = Blueprint('meal_bp', __name__)

# Fixed calorie splits
CALORIE_SPLITS = {
    "breakfast": 0.30,
    "lunch": 0.30,
    "dinner": 0.30,
    "snacks": 0.10
}

@meal_routes.route("/api/get-meals", methods=["POST"])
def get_meals():
    try:
        user_data = request.get_json()
        print("🔍 Received user_data:", user_data)

        goal = user_data.get("goal", "maintain")
        user_calories = int(user_data.get("calories", 1800))  # daily calorie target

        # Load meals.json
        with open('app/meals.json', 'r', encoding='utf-8') as f:
            meal_data = json.load(f)

        # Flatten dataset
        flat_meals = []
        for region, meals_by_region in meal_data.items():
            for meal_time, meals in meals_by_region.items():
                for meal in meals:
                    meal['region'] = region.lower().replace(" ", "_").strip()
                    meal['meal_time'] = meal_time.lower().strip()
                    flat_meals.append(meal)

        df = pd.DataFrame(flat_meals)
        print(f"📊 Total meals loaded: {len(df)}")

        # ML prediction
        suitable_df = predict_suitable_meals(user_data, df)
        if "suitable" not in suitable_df.columns:
            raise ValueError("❌ 'suitable' column missing after prediction")

        filtered = suitable_df[suitable_df["suitable"] == 1]

        # Normalize filter values
        region = user_data.get("region", "").lower().replace(" ", "_").strip()
        diet_pref = user_data.get("diet_preference", "").lower().strip()
        filtered["region"] = filtered["region"].str.lower().str.strip()
        filtered["meal_time"] = filtered["meal_time"].str.lower().str.strip()

        if region and region not in ["all", "all_regions"]:
            filtered = filtered[filtered["region"] == region]

        if diet_pref and diet_pref not in ["all", "all_types"]:
            if diet_pref in ["veg", "vegetarian"]:
                filtered = filtered[filtered["vegetarian"] == True]
            elif diet_pref in ["non-veg", "non_veg", "non-vegetarian"]:
                filtered = filtered[filtered["vegetarian"] == False]

        # Build structured response by meal time
        meals_by_time = {}
        for meal_time, split in CALORIE_SPLITS.items():
            target_cals = int(user_calories * split)
            quarter_target = target_cals // 4  # For 4 meals per time

            pool = filtered[filtered["meal_time"] == meal_time]
            if pool.empty:
                print(f"⚠️ No meals found for {meal_time}, skipping")
                meals_by_time[meal_time] = []
                continue

            # Pick 4 meals close to quarter target
            pool["diff"] = (pool["calories"] - quarter_target).abs()
            selected = pool.nsmallest(min(4, len(pool)), "diff").to_dict(orient="records")
            
            # If we have less than 4 meals, duplicate some to reach 4
            while len(selected) < 4 and len(selected) > 0:
                selected.extend(selected[:4-len(selected)])

            # Scale portions for 4 meals
            scaled_meals = []
            for i, meal in enumerate(selected[:4]):  # Ensure exactly 4 meals
                portion_count = max(1, round(quarter_target / meal["calories"]))
                scaled_calories = meal["calories"] * portion_count
                meal["portion"] = f"{portion_count} serving(s)"
                meal["calories"] = scaled_calories
                meal["explanation"] = generate_explanation(meal, goal)
                meal["meal_index"] = i  # Add index for frontend
                scaled_meals.append(meal)

            meals_by_time[meal_time] = scaled_meals

        print("🍱 Final structured meals sent")
        return jsonify({
            "meals": meals_by_time,
            "total_calories": user_calories,
            "goal_calories": user_calories,
            "message": "Meals distributed across breakfast, lunch, dinner, and snacks"
        }), 200

    except Exception as e:
        print("❌ ERROR:", e)
        return jsonify({"error": str(e)}), 500


# ---- Helper Functions ----

def generate_explanation(meal, goal):
    name = meal.get("name", "").lower()
    if any(x in name for x in ["chicken", "egg", "paneer", "dal", "rajma"]):
        return f"Rich in protein to support your {goal} goal."
    elif any(x in name for x in ["roti", "rice", "pulao", "poha", "idli"]):
        return f"Provides energy-rich carbs to fuel your {goal} goal."
    elif any(x in name for x in ["raita", "salad", "chutney", "sambar", "soup"]):
        return f"A light side to improve digestion and balance your meal."
    else:
        return f"Included to balance your calorie and nutrient intake."

def estimate_portion(calories):
    if calories < 100:
        return "Small portion"
    elif calories < 250:
        return "1 cup / 1 serving"
    elif calories < 400:
        return "Medium portion (2 rotis / 1.5 cups)"
    else:
        return "Large portion"
