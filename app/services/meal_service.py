import json
import random
import os
from typing import Dict, List, Tuple
from datetime import datetime

class MealService:
    def __init__(self):
        self.meals_data = self._load_meals_data()
    
    def _load_meals_data(self) -> Dict:
        """Load meals data from meals.json file"""
        try:
            # Get the path to the meals.json file (assuming it's in the app root)
            current_dir = os.path.dirname(os.path.abspath(__file__))
            app_root = os.path.dirname(current_dir)
            meals_file_path = os.path.join(app_root, 'meals.json')
            
            with open(meals_file_path, 'r', encoding='utf-8') as file:
                return json.load(file)
        except FileNotFoundError:
            raise FileNotFoundError("meals.json file not found")
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON format in meals.json")
    
    def get_user_meals(self, user_data: Dict) -> Dict:
        """
        Generate meal suggestions for a user based on their profile
        
        Args:
            user_data: Dictionary containing user profile data
            
        Returns:
            Dictionary with meal suggestions for breakfast, lunch, and dinner
        """
        region = user_data.get('region', 'South')  # Default to South if not specified
        calorie_goal = user_data.get('calorie_target', 2000)  # Default to 2000 if not specified
        
        # Get meals for the user's region
        region_meals = self.meals_data.get(region, self.meals_data.get('South', {}))
        
        # Generate meal suggestions
        suggestions = self._generate_meal_suggestions(region_meals, calorie_goal)
        
        return suggestions
    
    def _generate_meal_suggestions(self, region_meals: Dict, calorie_goal: int) -> Dict:
        """
        Generate meal suggestions that match the calorie goal
        
        Args:
            region_meals: Meals available for the user's region
            calorie_goal: User's daily calorie target
            
        Returns:
            Dictionary with meal suggestions
        """
        # Set seed for consistent daily suggestions (based on current date)
        today = datetime.now().strftime('%Y-%m-%d')
        random.seed(today)
        
        # Calculate target calories per meal type
        breakfast_target = int(calorie_goal * 0.25)  # 25% for breakfast
        lunch_target = int(calorie_goal * 0.35)      # 35% for lunch
        dinner_target = int(calorie_goal * 0.30)     # 30% for dinner
        # Remaining 10% for snacks
        
        suggestions = {
            'breakfast': self._select_meals_for_meal_type(
                region_meals.get('breakfast', []), 
                breakfast_target, 
                2
            ),
            'lunch': self._select_meals_for_meal_type(
                region_meals.get('lunch', []), 
                lunch_target, 
                2
            ),
            'dinner': self._select_meals_for_meal_type(
                region_meals.get('dinner', []), 
                dinner_target, 
                2
            )
        }
        
        # Reset random seed
        random.seed()
        
        return suggestions
    
    def _select_meals_for_meal_type(self, available_meals: List[Dict], target_calories: int, num_meals: int) -> List[Dict]:
        """
        Select meals for a specific meal type that best match the target calories
        
        Args:
            available_meals: List of available meals for this meal type
            target_calories: Target calories for this meal type
            num_meals: Number of meals to select
            
        Returns:
            List of selected meals
        """
        if not available_meals:
            return []
        
        if len(available_meals) <= num_meals:
            # If we have fewer meals than requested, return all available
            return available_meals.copy()
        
        # Shuffle available meals for variety
        shuffled_meals = available_meals.copy()
        random.shuffle(shuffled_meals)
        
        # Try to find the best combination of meals that matches target calories
        best_combination = self._find_best_meal_combination(shuffled_meals, target_calories, num_meals)
        
        return best_combination
    
    def _find_best_meal_combination(self, meals: List[Dict], target_calories: int, num_meals: int) -> List[Dict]:
        """
        Find the best combination of meals that matches the target calories
        
        Args:
            meals: List of available meals
            target_calories: Target calories
            num_meals: Number of meals to select
            
        Returns:
            Best combination of meals
        """
        from itertools import combinations
        
        # Generate all possible combinations of the specified number of meals
        meal_combinations = list(combinations(meals, min(num_meals, len(meals))))
        
        if not meal_combinations:
            return meals[:num_meals] if len(meals) >= num_meals else meals
        
        best_combination = None
        best_difference = float('inf')
        
        for combination in meal_combinations:
            total_calories = sum(meal['calories'] for meal in combination)
            difference = abs(total_calories - target_calories)
            
            if difference < best_difference:
                best_difference = difference
                best_combination = list(combination)
        
        return best_combination or list(meal_combinations[0])
    
    def get_meal_summary(self, suggestions: Dict) -> Dict:
        """
        Get a summary of the meal suggestions including total calories
        
        Args:
            suggestions: Meal suggestions dictionary
            
        Returns:
            Summary with total calories and breakdown
        """
        summary = {
            'total_calories': 0,
            'meal_breakdown': {}
        }
        
        for meal_type, meals in suggestions.items():
            meal_calories = sum(meal['calories'] for meal in meals)
            summary['total_calories'] += meal_calories
            summary['meal_breakdown'][meal_type] = {
                'calories': meal_calories,
                'meal_count': len(meals)
            }
        
        return summary 