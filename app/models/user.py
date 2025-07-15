from datetime import datetime
from typing import Dict, Any, Optional

class User:
    def __init__(self, user_id: str, data: Dict[str, Any]):
        self.user_id = user_id
        self.age = data.get('age', 0)
        self.gender = data.get('gender', '')
        self.height_cm = data.get('height_cm', 0)
        self.weight_kg = data.get('weight_kg', 0)
        self.activity_level = data.get('activity_level', 'sedentary')
        self.goal = data.get('goal', 'maintain')
        self.region = data.get('region', '')
        self.created_at = data.get('created_at', datetime.now())
        self.updated_at = data.get('updated_at', datetime.now())
    
    def calculate_bmi(self) -> float:
        """Calculate BMI: weight / (height in m)^2"""
        if self.height_cm <= 0:
            return 0
        height_m = self.height_cm / 100
        return round(self.weight_kg / (height_m ** 2), 2)
    
    def calculate_bmr(self) -> float:
        """Calculate BMR using Mifflin-St Jeor equation"""
        if self.gender.lower() == 'male':
            bmr = (10 * self.weight_kg) + (6.25 * self.height_cm) - (5 * self.age) + 5
        else:  # female
            bmr = (10 * self.weight_kg) + (6.25 * self.height_cm) - (5 * self.age) - 161
        return round(bmr)
    
    def get_activity_multiplier(self) -> float:
        """Get activity multiplier based on activity level"""
        multipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very active': 1.9
        }
        return multipliers.get(self.activity_level.lower(), 1.2)
    
    def calculate_calorie_target(self) -> float:
        """Calculate daily calorie target"""
        bmr = self.calculate_bmr()
        activity_multiplier = self.get_activity_multiplier()
        tdee = bmr * activity_multiplier
        
        # Adjust based on goal
        goal_adjustments = {
            'lose': -500,
            'maintain': 0,
            'gain': 500
        }
        adjustment = goal_adjustments.get(self.goal.lower(), 0)
        
        return round(tdee + adjustment)
    
    def get_bmi_status(self) -> str:
        """Determine BMI status"""
        bmi = self.calculate_bmi()
        if bmi < 18.5:
            return 'Underweight'
        elif bmi < 25:
            return 'Normal'
        elif bmi < 30:
            return 'Overweight'
        else:
            return 'Obese'
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert user to dictionary for Firestore"""
        return {
            'age': self.age,
            'gender': self.gender,
            'height_cm': self.height_cm,
            'weight_kg': self.weight_kg,
            'activity_level': self.activity_level,
            'goal': self.goal,
            'region': self.region,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @classmethod
    def from_dict(cls, user_id: str, data: Dict[str, Any]) -> 'User':
        """Create User instance from Firestore data"""
        return cls(user_id, data) 