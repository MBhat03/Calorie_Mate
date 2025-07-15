from app.firebase_config import db
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from firebase_admin import firestore
from app.models.weight_log import WeightLog
from app.models.user import User

class WeightService:
    def __init__(self, db):
        self.db = db
        self.weight_logs_collection = db.collection('WeightLogs')

    def log_weight(self, user_id: str, weight_kg: float, date: Optional[datetime] = None) -> str:
        """Log a new weight entry"""
        if date is None:
            date = datetime.now()

        # Calculate BMI (we need user data for height)
        user_doc = self.db.collection('Users').document(user_id).get()
        bmi = 0
        if user_doc.exists:
            user_data = user_doc.to_dict()
            height_cm = user_data.get('height_cm', 0)
            if height_cm > 0:
                height_m = height_cm / 100
                bmi = round(weight_kg / (height_m ** 2), 2)

        weight_data = {
            'user_id': user_id,
            'date': date,
            'weight_kg': weight_kg,
            'bmi': bmi,
            'created_at': datetime.now()
        }

        doc_ref = self.weight_logs_collection.add(weight_data)
        return doc_ref[1].id

    def get_user_progress(self, user_id: str) -> Tuple[List[str], List[float]]:
        """Get weight progress for a user"""
        docs = self.weight_logs_collection.where('user_id', '==', user_id).stream()

        dates = []
        weights = []

        for doc in docs:
            data = doc.to_dict()
            if 'date' in data and 'weight_kg' in data:
                dates.append(data['date'].strftime('%Y-%m-%d'))
                weights.append(data['weight_kg'])

        return dates, weights

    def get_latest_weight(self, user_id: str) -> Optional[float]:
        """Get the most recent weight for a user"""
        query = self.weight_logs_collection.where('user_id', '==', user_id).order_by('date', direction="DESCENDING").limit(1)
        docs = list(query.stream())

        if docs:
            return docs[0].to_dict()['weight_kg']
        return None
