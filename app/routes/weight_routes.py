from flask import Blueprint, request, jsonify
from app.services.weight_service import WeightService
from app.firebase_config import db
from datetime import datetime

weight_bp = Blueprint('weight', __name__)

@weight_bp.route('/log-weight', methods=['POST'])
def log_weight():
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['user_id', 'new_weight']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        user_id = data['user_id']
        new_weight = float(data['new_weight'])
        date_str = data.get('date')
        date = datetime.fromisoformat(date_str.replace('Z', '+00:00')) if date_str else datetime.now()

        # Create weight service and log weight
        weight_service = WeightService(db)
        log_id = weight_service.log_weight(user_id, new_weight, date)

        # Update user's current weight
        user_ref = db.collection('Users').document(user_id)
        user_ref.update({'weight_kg': new_weight, 'updated_at': datetime.now()})

        return jsonify({
            'message': 'Weight logged successfully',
            'log_id': log_id,
            'user_id': user_id,
            'weight': new_weight,
            'date': date.isoformat()
        }), 201

    except ValueError as e:
        print(f"ValueError in log_weight: {str(e)}")
        return jsonify({'error': 'Invalid weight value.'}), 400
    except Exception as e:
        print(f"Error in log_weight: {str(e)}")
        return jsonify({'error': 'An error occurred while logging weight.'}), 500


@weight_bp.route('/get-progress', methods=['GET'])
def get_progress():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id parameter is required'}), 400

        # Get progress using weight service
        weight_service = WeightService(db)
        dates, weights = weight_service.get_user_progress(user_id)

        return jsonify({
            'user_id': user_id,
            'dates': dates,
            'weights': weights,
            'total_entries': len(dates)
        }), 200

    except Exception as e:
        print(f"Error in get_progress: {str(e)}")
        return jsonify({'error': 'An error occurred while fetching progress.'}), 500


@weight_bp.route('/weight-logs/<user_id>', methods=['GET'])
def get_weight_logs(user_id):
    try:
        # Get weight logs from Firestore - simplified query
        query = db.collection('WeightLogs').where('user_id', '==', user_id)
        docs = query.stream()

        logs = []
        for doc in docs:
            data = doc.to_dict()
            logs.append({
                'log_id': doc.id,
                'user_id': data.get('user_id', ''),
                'date': data.get('date', datetime.now()).isoformat(),
                'weight_kg': data.get('weight_kg', 0),
                'bmi': data.get('bmi', 0),
                'created_at': data.get('created_at', datetime.now()).isoformat()
            })

        return jsonify({
            'user_id': user_id, 
            'logs': logs, 
            'total_logs': len(logs)
        }), 200

    except Exception as e:
        print(f"Error in get_weight_logs: {str(e)}")
        return jsonify({'error': 'An error occurred while fetching weight logs.'}), 500
