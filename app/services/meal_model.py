import pandas as pd
import joblib
import numpy as np
import os

# Load model + feature names
MODEL_PATH = os.path.join("app", "models", "meal_recommender.pkl")
model, model_columns = joblib.load(MODEL_PATH)  # 👈 unpack properly

def predict_suitable_meals(user_data, meal_df):
    age = 50
    height_cm = 50
    weight_kg = 50
    bmi = user_data.get("bmi", 22.5)
    goal = user_data.get("goal", "maintain")

    meal_df = meal_df.copy()
    meal_df["age"] = age
    meal_df["height_cm"] = height_cm
    meal_df["weight_kg"] = weight_kg
    meal_df["bmi"] = bmi
    meal_df["goal"] = goal
    meal_df["gender"] = "male"
    meal_df["activity_level"] = "moderate"
    meal_df["diet_preference"] = user_data.get("diet_preference", "vegetarian").lower()

    input_df = pd.get_dummies(meal_df)

    # Ensure all model columns exist
    for col in model_columns:
        if col not in input_df.columns:
            input_df[col] = 0

    # Reorder columns
    input_df = input_df[model_columns]

    # Predict
    predictions = model.predict(input_df)
    meal_df["suitable"] = predictions

    return meal_df
