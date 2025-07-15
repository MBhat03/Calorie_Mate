from flask import Blueprint, request, jsonify
from app.models.user import User
from app.firebase_config import db
from datetime import datetime

user_bp = Blueprint('user', __name__)

@user_bp.route('/users', methods=['POST'])
def create_user():
    try:
        data = request.get_json()
        
        # Map frontend field names to backend expected names
        mapped_data = {
            'age': int(data.get('age', 0)),
            'gender': data.get('gender', ''),
            'height_cm': float(data.get('height', 0)),  # Map 'height' to 'height_cm'
            'weight_kg': float(data.get('weight', 0)),  # Map 'weight' to 'weight_kg'
            'activity_level': data.get('activity', '').lower(),  # Map 'activity' to 'activity_level'
            'goal': data.get('goal', '').lower().replace(' weight', ''),  # Map goal
            'region': data.get('region', '')
        }
        
        # Validate required fields
        required_fields = ['age', 'gender', 'height_cm', 'weight_kg', 'activity_level', 'goal', 'region']
        for field in required_fields:
            if not mapped_data[field]:
                return jsonify({'error': f'Missing or invalid required field: {field}'}), 400
        
        # Add timestamps
        mapped_data['created_at'] = datetime.now()
        mapped_data['updated_at'] = datetime.now()
        
        # Create user in Firestore
        doc_ref = db.collection('Users').add(mapped_data)
        user_id = doc_ref[1].id
        
        return jsonify({
            'message': 'User created successfully', 
            'user_id': user_id
        }), 201

    except Exception as e:
        print(f"Error creating user: {str(e)}")
        return jsonify({'error': 'An error occurred while creating user.'}), 500


@user_bp.route('/users/<user_id>', methods=['GET'])
def get_user(user_id):
    try:
        # Get user from Firestore
        doc = db.collection('Users').document(user_id).get()
        if not doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = doc.to_dict()
        user = User.from_dict(user_id, user_data)

        return jsonify({
            'user_id': user.user_id,
            'age': user.age,
            'gender': user.gender,
            'height_cm': user.height_cm,
            'weight_kg': user.weight_kg,
            'activity_level': user_data.get('activity_level', ''),
            'goal': user.goal,
            'region': user.region,
            'bmi': user.calculate_bmi(),
            'bmr': user.calculate_bmr(),
            'calorie_target': user.calculate_calorie_target(),
            'status': user.get_bmi_status()
        }), 200

    except Exception as e:
        print(f"Error fetching user: {str(e)}")
        return jsonify({'error': 'An error occurred while fetching user.'}), 500
