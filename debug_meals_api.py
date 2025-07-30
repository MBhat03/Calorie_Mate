# debug_meals_api.py - Add this to your Flask app for debugging

from flask import jsonify
import json
import os

@app.route('/debug-meals-data')
def debug_meals_data():
    """Debug route to check meal data loading"""
    try:
        # Check if meals.json exists
        meals_file = os.path.join(app.static_folder, 'meals.json')
        print(f"Looking for meals file at: {meals_file}")
        
        if not os.path.exists(meals_file):
            return jsonify({
                'error': 'meals.json not found',
                'expected_path': meals_file,
                'static_folder': app.static_folder
            })
        
        # Load and examine meals data
        with open(meals_file, 'r', encoding='utf-8') as f:
            meals_data = json.load(f)
        
        # Analyze structure
        regions = list(meals_data.keys())
        analysis = {}
        
        for region in regions:
            region_data = meals_data[region]
            analysis[region] = {
                'meal_types': list(region_data.keys()) if isinstance(region_data, dict) else 'Invalid structure',
                'breakfast_count': len(region_data.get('breakfast', [])) if isinstance(region_data, dict) else 0,
                'lunch_count': len(region_data.get('lunch', [])) if isinstance(region_data, dict) else 0,
                'dinner_count': len(region_data.get('dinner', [])) if isinstance(region_data, dict) else 0
            }
        
        return jsonify({
            'status': 'success',
            'meals_file_exists': True,
            'file_size': os.path.getsize(meals_file),
            'regions_available': regions,
            'analysis': analysis,
            'sample_breakfast': meals_data.get('South', {}).get('breakfast', [])[:2] if 'South' in meals_data else []
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'type': type(e).__name__
        })

@app.route('/debug-user-profile/<uid>')
def debug_user_profile(uid):
    """Debug route to check user profile data"""
    try:
        from firebase_admin import firestore
        db = firestore.client()
        
        user_doc = db.collection('Users').document(uid).get()
        
        if not user_doc.exists:
            return jsonify({
                'error': 'User not found',
                'uid': uid
            })
        
        user_data = user_doc.to_dict()
        
        return jsonify({
            'status': 'success',
            'uid': uid,
            'user_data': user_data,
            'region': user_data.get('region', 'NOT SET'),
            'calorie_target': user_data.get('calorie_target', 'NOT SET'),
            'has_required_fields': all(key in user_data for key in ['region', 'calorie_target'])
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'type': type(e).__name__
        })

@app.route('/test-suggest-meals/<uid>')
def test_suggest_meals(uid):
    """Test route with hardcoded meal data"""
    
    # Hardcoded sample response for testing
    sample_response = {
        'status': 'success',
        'user_id': uid,
        'user_region': 'South',
        'calorie_goal': 2000,
        'suggestions': {
            'breakfast': [
                {
                    'name': 'Idli with Sambar',
                    'calories': 300,
                    'items': [
                        {'name': 'Idli (3 pieces)', 'kcal': 150},
                        {'name': 'Sambar (1 bowl)', 'kcal': 100},
                        {'name': 'Coconut Chutney', 'kcal': 50}
                    ],
                    'totalCalories': 300
                },
                {
                    'name': 'Poha with Tea',
                    'calories': 250,
                    'items': [
                        {'name': 'Poha (1 plate)', 'kcal': 200},
                        {'name': 'Tea (1 cup)', 'kcal': 50}
                    ],
                    'totalCalories': 250
                }
            ],
            'lunch': [
                {
                    'name': 'Rice with Dal',
                    'calories': 450,
                    'items': [
                        {'name': 'Rice (1 cup)', 'kcal': 200},
                        {'name': 'Dal (1 bowl)', 'kcal': 150},
                        {'name': 'Vegetable Curry', 'kcal': 100}
                    ],
                    'totalCalories': 450
                }
            ],
            'dinner': [
                {
                    'name': 'Roti with Curry',
                    'calories': 400,
                    'items': [
                        {'name': 'Roti (2 pieces)', 'kcal': 200},
                        {'name': 'Vegetable Curry', 'kcal': 150},
                        {'name': 'Dal (small bowl)', 'kcal': 50}
                    ],
                    'totalCalories': 400
                }
            ]
        },
        'summary': {
            'total_calories': 1400,
            'meal_count': 4
        }
    }
    
    return jsonify(sample_response)
