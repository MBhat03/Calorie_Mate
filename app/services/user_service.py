from app.firebase_config import db
from typing import Dict, Any
from datetime import datetime

class User:
    def __init__(self, user_id: str, name: str, age: int, gender: str, height_cm: float, weight_kg: float, goal: str, region: str, created_at=None, updated_at=None):
        self.user_id = user_id
        self.name = name
        self.age = age
        self.gender = gender
        self.height_cm = height_cm
        self.weight_kg = weight_kg
        self.goal = goal
        self.region = region
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()

    @classmethod
    def from_dict(cls, user_id: str, data: Dict[str, Any]):
        return cls(
            user_id=user_id,
            name=data.get('name', ''),
            age=data.get('age', 0),
            gender=data.get('gender', ''),
            height_cm=data.get('height_cm', 0.0),
            weight_kg=data.get('weight_kg', 0.0),
            goal=data.get('goal', ''),
            region=data.get('region', ''),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at')
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "age": self.age,
            "gender": self.gender,
            "height_cm": self.height_cm,
            "weight_kg": self.weight_kg,
            "goal": self.goal,
            "region": self.region,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
