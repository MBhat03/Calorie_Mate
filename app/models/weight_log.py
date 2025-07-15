from datetime import datetime
from typing import Dict, Any

class WeightLog:
    def __init__(self, log_id: str, data: Dict[str, Any]):
        self.log_id = log_id
        self.user_id = data.get('user_id', '')
        self.date = data.get('date', datetime.now())
        self.weight_kg = data.get('weight_kg', 0)
        self.bmi = data.get('bmi', 0)
        self.created_at = data.get('created_at', datetime.now())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert weight log to dictionary for Firestore"""
        return {
            'user_id': self.user_id,
            'date': self.date,
            'weight_kg': self.weight_kg,
            'bmi': self.bmi,
            'created_at': self.created_at
        }
    
    @classmethod
    def from_dict(cls, log_id: str, data: Dict[str, Any]) -> 'WeightLog':
        """Create WeightLog instance from Firestore data"""
        return cls(log_id, data) 