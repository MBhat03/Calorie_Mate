from flask import Blueprint, request, jsonify
from app.services.meal_service import MealService
from app.firebase_config import db
from firebase_admin import firestore
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Blueprint
meal_bp = Blueprint('meal', __name__)

# Initialize meal service
meal_service = MealService()

@meal_bp.route('/suggest-meals', methods=['GET', 'POST'])
def suggest_meals():
    """
    Generate meal suggestions for a user based on their profile
    
    Expected parameters:
    - uid: User ID (required)
    
    Returns:
    - JSON with meal suggestions for breakfast, lunch, and dinner
    """
    try:
        # Get user ID from request
        if request.method == 'GET':
            uid = request.args.get('uid')
        else:  # POST
            data = request.get_json() or {}
            uid = data.get('uid') or request.form.get('uid')
        
        if not uid:
            return jsonify({
                'error': 'User ID (uid) is required',
                'status': 'error'
            }), 400
        
        logger.info(f"Generating meal suggestions for user: {uid}")
        
        # Fetch user data from Firestore
        user_doc = db.collection('Users').document(uid).get()
        
        if not user_doc.exists:
            return jsonify({
                'error': 'User not found',
                'status': 'error'
            }), 404
        
        user_data = user_doc.to_dict()
        
        # Generate meal suggestions
        suggestions = meal_service.get_user_meals(user_data)
        
        # Get meal summary
        summary = meal_service.get_meal_summary(suggestions)
        
        # Prepare response
        response = {
            'status': 'success',
            'user_id': uid,
            'user_region': user_data.get('region', 'South'),
            'calorie_goal': user_data.get('calorie_target', 2000),
            'suggestions': suggestions,
            'summary': summary
        }
        
        logger.info(f"Successfully generated meal suggestions for user {uid}")
        return jsonify(response), 200
        
    except FileNotFoundError as e:
        logger.error(f"Meals data file not found: {str(e)}")
        return jsonify({
            'error': 'Meals data not available',
            'status': 'error'
        }), 500
        
    except ValueError as e:
        logger.error(f"Invalid meals data format: {str(e)}")
        return jsonify({
            'error': 'Invalid meals data format',
            'status': 'error'
        }), 500
        
    except Exception as e:
        logger.error(f"Error generating meal suggestions: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500

@meal_bp.route('/meals/regions', methods=['GET'])
def get_available_regions():
    """
    Get list of available regions for meal suggestions
    
    Returns:
    - JSON with list of available regions
    """
    try:
        regions = list(meal_service.meals_data.keys())
        return jsonify({
            'status': 'success',
            'regions': regions
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting regions: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500

@meal_bp.route('/meals/region/<region>', methods=['GET'])
def get_meals_by_region(region):
    """
    Get all meals for a specific region
    
    Args:
    - region: Region name (path parameter)
    
    Returns:
    - JSON with all meals for the specified region
    """
    try:
        region_meals = meal_service.meals_data.get(region)
        
        if not region_meals:
            return jsonify({
                'error': f'Region "{region}" not found',
                'status': 'error'
            }), 404
        
        return jsonify({
            'status': 'success',
            'region': region,
            'meals': region_meals
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting meals for region {region}: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500

@meal_bp.route('/meals/user/<uid>/preferences', methods=['GET'])
def get_user_meal_preferences(uid):
    """
    Get user's meal preferences and current settings
    
    Args:
    - uid: User ID (path parameter)
    
    Returns:
    - JSON with user's meal preferences
    """
    try:
        user_doc = db.collection('Users').document(uid).get()
        
        if not user_doc.exists:
            return jsonify({
                'error': 'User not found',
                'status': 'error'
            }), 404
        
        user_data = user_doc.to_dict()
        
        preferences = {
            'region': user_data.get('region', 'South'),
            'calorie_goal': user_data.get('calorie_target', 2000),
            'activity_level': user_data.get('activity', 'Moderate'),
            'goal': user_data.get('goal', 'Maintain Weight'),
            'dietary_restrictions': user_data.get('dietary_restrictions', []),
            'allergies': user_data.get('allergies', [])
        }
        
        return jsonify({
            'status': 'success',
            'user_id': uid,
            'preferences': preferences
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting user preferences for {uid}: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500 

from flask import render_template

@meal_bp.route('/meals', methods=['GET'])
def serve_meal_page():
    return render_template('meals.html')
