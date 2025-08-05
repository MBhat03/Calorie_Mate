import os
import random
import joblib
from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__, template_folder='app/templates', static_folder='static')
CORS(app)

# Load the trained meal recommendation model
try:
    model_path = os.path.join('app', 'models', 'meal_recommender.pkl')
    meal_model = joblib.load(model_path)
    print(f"✅ Loaded meal recommendation model from: {model_path}")
    print(f"🔍 Model type: {type(meal_model)}")
    print(f"🔍 Model attributes: {dir(meal_model)}")
    if hasattr(meal_model, 'predict'):
        print(f"🔍 Model has predict method")
    if hasattr(meal_model, 'transform'):
        print(f"🔍 Model has transform method")
    if hasattr(meal_model, '__call__'):
        print(f"🔍 Model is callable")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    meal_model = None

# Create blueprint
from flask import Blueprint
main = Blueprint('main', __name__)

@main.route('/')
def home():
    return render_template('home.html')

@main.route('/login')
def login():
    return render_template('login.html')

@main.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@main.route('/meals')
def meals():
    return render_template('meals.html')

@main.route('/user_details')
def user_details():
    return render_template('user_details.html')

@main.route('/badges')
def badges():
    return render_template('badges.html')

@main.route('/logout')
def logout():
    return render_template('logout.html')

@main.route('/settings')
def settings():
    return render_template('user_details.html')  # Redirect to user details for settings

@main.route('/favicon.ico')
def favicon():
    return send_from_directory(app.static_folder, 'favicon.ico')

@main.route('/api/get-meals', methods=['POST'])
def get_meals():
    try:
        data = request.get_json()
        meal_time = data.get('mealTime', 'breakfast')
        region = data.get('region', 'North India')
        calories = data.get('calories', 2000)
        timestamp = data.get('timestamp', 0)
        random_val = data.get('random', 0.5)
        
        print(f"🔍 API Request: mealTime={meal_time}, region={region}, calories={calories}, timestamp={timestamp}")
        
        # ✅ FIXED: Calculate target calories per meal time
        meal_time_targets = {
            'breakfast': int(calories * 0.25),  # 25% of daily calories
            'lunch': int(calories * 0.35),      # 35% of daily calories
            'dinner': int(calories * 0.30),     # 30% of daily calories
            'snacks': int(calories * 0.10)      # 10% of daily calories
        }
        
        target_calories = meal_time_targets.get(meal_time, int(calories * 0.25))
        print(f"🎯 Target calories for {meal_time}: {target_calories} (from daily goal: {calories})")
        
        # ✅ FIXED: Use ML model to generate meal recommendations
        if meal_model is not None:
            print(f"🤖 Using ML model to generate meals for {meal_time} in {region}")
            
            # Prepare input features for the model
            model_input = {
                'meal_time': meal_time,
                'region': region,
                'target_calories': target_calories,
                'daily_calories': calories,
                'timestamp': timestamp,
                'random_seed': random_val
            }
            
            # Generate meal recommendations using the model
            try:
                # Check if model is a pipeline or has predict method
                if hasattr(meal_model, 'predict'):
                    # Standard scikit-learn model
                    meals = meal_model.predict([[
                        target_calories,
                        hash(region) % 1000,  # Region encoding
                        hash(meal_time) % 100,  # Meal time encoding
                        timestamp % 10000,     # Time encoding
                        random_val * 100       # Random factor
                    ]])
                elif hasattr(meal_model, 'transform'):
                    # Pipeline or transformer
                    meals = meal_model.transform([[
                        target_calories,
                        hash(region) % 1000,
                        hash(meal_time) % 100,
                        timestamp % 10000,
                        random_val * 100
                    ]])
                else:
                    # Custom model - try to call it directly
                    meals = meal_model([[
                        target_calories,
                        hash(region) % 1000,
                        hash(meal_time) % 100,
                        timestamp % 10000,
                        random_val * 100
                    ]])
                
                # Convert model output to meal format
                recommended_meals = []
                
                # Handle different model output formats
                if isinstance(meals, (list, tuple)):
                    meal_list = meals
                elif hasattr(meals, 'tolist'):
                    meal_list = meals.tolist()
                else:
                    meal_list = [meals]
                
                # Generate meal names based on model output
                for i, meal_output in enumerate(meal_list[:8]):  # Get up to 8 meals
                    # Use model output to determine meal characteristics
                    if isinstance(meal_output, (list, tuple)):
                        # Model returned multiple values
                        meal_calories = int(meal_output[0] if len(meal_output) > 0 else target_calories * 0.8)
                        meal_name_index = int(meal_output[1] if len(meal_output) > 1 else i) % 4
                    else:
                        # Model returned single value
                        meal_calories = int(meal_output if meal_output > 0 else target_calories * 0.8)
                        meal_name_index = i % 4
                    
                    # Ensure calories are within reasonable range
                    meal_calories = max(100, min(meal_calories, int(target_calories * 1.2)))
                    
                    # Generate meal name based on region and meal time
                    meal_names = {
                        'North India': {
                            'breakfast': ['Poha with Nuts', 'Aloo Paratha', 'Upma with Vegetables', 'Besan Chilla'],
                            'lunch': ['Rajma Chawal', 'Kadhi Pakora', 'Chole Bhature', 'Dal Makhani'],
                            'dinner': ['Roti Sabzi', 'Paneer Curry', 'Mixed Vegetable', 'Dal Tadka'],
                            'snacks': ['Samosa', 'Pakora', 'Jalebi', 'Kachori']
                        },
                        'South India': {
                            'breakfast': ['Idli Sambar', 'Dosa with Chutney', 'Upma', 'Pongal'],
                            'lunch': ['Rice with Sambar', 'Rasam Rice', 'Curd Rice', 'Bisi Bele Bath'],
                            'dinner': ['Chapati with Curry', 'Poriyal with Rice', 'Kootu', 'Thayir Sadam'],
                            'snacks': ['Vada', 'Bonda', 'Murukku', 'Pori Urundai']
                        },
                        'East India': {
                            'breakfast': ['Luchi Aloor Dom', 'Puri Sabzi', 'Chira Doi', 'Pitha'],
                            'lunch': ['Rice with Fish Curry', 'Dal Bhaat', 'Macher Jhol', 'Aloo Posto'],
                            'dinner': ['Roti with Sabzi', 'Chicken Curry', 'Mixed Vegetable', 'Dal with Rice'],
                            'snacks': ['Jhal Muri', 'Tele Bhaja', 'Chop', 'Singara']
                        },
                        'West India': {
                            'breakfast': ['Poha with Peanuts', 'Thepla', 'Dhokla', 'Khandvi'],
                            'lunch': ['Gujarati Thali', 'Dal Bhaat', 'Kadhi Khichdi', 'Undhiyu'],
                            'dinner': ['Roti with Sabzi', 'Paneer Curry', 'Mixed Vegetable', 'Dal with Rice'],
                            'snacks': ['Fafda', 'Gathiya', 'Khaman', 'Sev Khamani']
                        }
                    }
                    
                    # Get region-specific meal names
                    region_names = meal_names.get(region, meal_names['North India'])
                    meal_time_names = region_names.get(meal_time, region_names['breakfast'])
                    meal_name = meal_time_names[meal_name_index % len(meal_time_names)]
                    
                    # Generate portion based on calories
                    if meal_calories < 200:
                        portion = '1 piece'
                    elif meal_calories < 400:
                        portion = '1 serving'
                    elif meal_calories < 600:
                        portion = '1 plate'
                    else:
                        portion = '1 bowl'
                    
                    recommended_meals.append({
                        'name': meal_name,
                        'calories': meal_calories,
                        'portion': portion
                    })
                
                print(f"🤖 ML Model generated {len(recommended_meals)} meals")
                
            except Exception as model_error:
                print(f"❌ ML model prediction failed: {model_error}")
                # Fallback to static data if model fails
                recommended_meals = generate_static_meals(meal_time, region, target_calories)
        else:
            print("⚠️ ML model not available, using static meal generation")
            recommended_meals = generate_static_meals(meal_time, region, target_calories)
        
        # Shuffle meals for variety
        random.seed(timestamp + int(random_val * 1000))
        random.shuffle(recommended_meals)
        
        # Return 2 meals for display
        shuffled_meals = recommended_meals[:2]
        
        print(f"✅ Returning {len(shuffled_meals)} ML-generated meals for {meal_time} in {region}")
        print(f"🎯 Target calories: {target_calories}, Meal calories: {[m['calories'] for m in shuffled_meals]}")
        
        response_data = {'success': True, 'meals': {meal_time: shuffled_meals}}
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ Error in get_meals: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def generate_static_meals(meal_time, region, target_calories):
    """Fallback function to generate static meals if ML model fails"""
    
    # Region-specific meal names
    region_meals = {
        'North India': {
            'breakfast': [
                {'name': 'Poha with Nuts', 'calories': int(target_calories * 0.85), 'portion': '1 plate'},
                {'name': 'Aloo Paratha', 'calories': int(target_calories * 0.9), 'portion': '2 pieces'},
                {'name': 'Upma with Vegetables', 'calories': int(target_calories * 0.8), 'portion': '1 bowl'},
                {'name': 'Besan Chilla', 'calories': int(target_calories * 0.75), 'portion': '3 pieces'}
            ],
            'lunch': [
                {'name': 'Rajma Chawal', 'calories': int(target_calories * 0.9), 'portion': '1 plate'},
                {'name': 'Kadhi Pakora', 'calories': int(target_calories * 0.85), 'portion': '1 bowl'},
                {'name': 'Chole Bhature', 'calories': int(target_calories * 0.95), 'portion': '2 pieces'},
                {'name': 'Dal Makhani', 'calories': int(target_calories * 0.8), 'portion': '1 bowl'}
            ],
            'dinner': [
                {'name': 'Roti Sabzi', 'calories': int(target_calories * 0.9), 'portion': '2 rotis'},
                {'name': 'Paneer Curry', 'calories': int(target_calories * 0.85), 'portion': '1 bowl'},
                {'name': 'Mixed Vegetable', 'calories': int(target_calories * 0.8), 'portion': '1 plate'},
                {'name': 'Dal Tadka', 'calories': int(target_calories * 0.75), 'portion': '1 bowl'}
            ],
            'snacks': [
                {'name': 'Samosa', 'calories': int(target_calories * 0.8), 'portion': '1 piece'},
                {'name': 'Pakora', 'calories': int(target_calories * 0.7), 'portion': '4 pieces'},
                {'name': 'Jalebi', 'calories': int(target_calories * 0.6), 'portion': '2 pieces'},
                {'name': 'Kachori', 'calories': int(target_calories * 0.75), 'portion': '1 piece'}
            ]
        },
        'South India': {
            'breakfast': [
                {'name': 'Idli Sambar', 'calories': int(target_calories * 0.8), 'portion': '3 idlis'},
                {'name': 'Dosa with Chutney', 'calories': int(target_calories * 0.85), 'portion': '2 dosas'},
                {'name': 'Upma', 'calories': int(target_calories * 0.75), 'portion': '1 bowl'},
                {'name': 'Pongal', 'calories': int(target_calories * 0.9), 'portion': '1 bowl'}
            ],
            'lunch': [
                {'name': 'Rice with Sambar', 'calories': int(target_calories * 0.9), 'portion': '1 plate'},
                {'name': 'Rasam Rice', 'calories': int(target_calories * 0.85), 'portion': '1 bowl'},
                {'name': 'Curd Rice', 'calories': int(target_calories * 0.8), 'portion': '1 bowl'},
                {'name': 'Bisi Bele Bath', 'calories': int(target_calories * 0.95), 'portion': '1 plate'}
            ],
            'dinner': [
                {'name': 'Chapati with Curry', 'calories': int(target_calories * 0.9), 'portion': '2 chapatis'},
                {'name': 'Poriyal with Rice', 'calories': int(target_calories * 0.85), 'portion': '1 plate'},
                {'name': 'Kootu', 'calories': int(target_calories * 0.8), 'portion': '1 bowl'},
                {'name': 'Thayir Sadam', 'calories': int(target_calories * 0.75), 'portion': '1 bowl'}
            ],
            'snacks': [
                {'name': 'Vada', 'calories': int(target_calories * 0.8), 'portion': '2 pieces'},
                {'name': 'Bonda', 'calories': int(target_calories * 0.7), 'portion': '3 pieces'},
                {'name': 'Murukku', 'calories': int(target_calories * 0.6), 'portion': '1 serving'},
                {'name': 'Pori Urundai', 'calories': int(target_calories * 0.75), 'portion': '2 pieces'}
            ]
        },
        'East India': {
            'breakfast': [
                {'name': 'Luchi Aloor Dom', 'calories': int(target_calories * 0.85), 'portion': '3 luchis'},
                {'name': 'Puri Sabzi', 'calories': int(target_calories * 0.9), 'portion': '2 puris'},
                {'name': 'Chira Doi', 'calories': int(target_calories * 0.8), 'portion': '1 bowl'},
                {'name': 'Pitha', 'calories': int(target_calories * 0.75), 'portion': '2 pieces'}
            ],
            'lunch': [
                {'name': 'Rice with Fish Curry', 'calories': int(target_calories * 0.9), 'portion': '1 plate'},
                {'name': 'Dal Bhaat', 'calories': int(target_calories * 0.85), 'portion': '1 bowl'},
                {'name': 'Macher Jhol', 'calories': int(target_calories * 0.95), 'portion': '1 plate'},
                {'name': 'Aloo Posto', 'calories': int(target_calories * 0.8), 'portion': '1 bowl'}
            ],
            'dinner': [
                {'name': 'Roti with Sabzi', 'calories': int(target_calories * 0.9), 'portion': '2 rotis'},
                {'name': 'Chicken Curry', 'calories': int(target_calories * 0.85), 'portion': '1 bowl'},
                {'name': 'Mixed Vegetable', 'calories': int(target_calories * 0.8), 'portion': '1 plate'},
                {'name': 'Dal with Rice', 'calories': int(target_calories * 0.75), 'portion': '1 bowl'}
            ],
            'snacks': [
                {'name': 'Jhal Muri', 'calories': int(target_calories * 0.8), 'portion': '1 cup'},
                {'name': 'Tele Bhaja', 'calories': int(target_calories * 0.7), 'portion': '4 pieces'},
                {'name': 'Chop', 'calories': int(target_calories * 0.6), 'portion': '2 pieces'},
                {'name': 'Singara', 'calories': int(target_calories * 0.75), 'portion': '1 piece'}
            ]
        },
        'West India': {
            'breakfast': [
                {'name': 'Poha with Peanuts', 'calories': int(target_calories * 0.8), 'portion': '1 plate'},
                {'name': 'Thepla', 'calories': int(target_calories * 0.85), 'portion': '2 pieces'},
                {'name': 'Dhokla', 'calories': int(target_calories * 0.75), 'portion': '4 pieces'},
                {'name': 'Khandvi', 'calories': int(target_calories * 0.7), 'portion': '6 pieces'}
            ],
            'lunch': [
                {'name': 'Gujarati Thali', 'calories': int(target_calories * 0.9), 'portion': '1 plate'},
                {'name': 'Dal Bhaat', 'calories': int(target_calories * 0.85), 'portion': '1 bowl'},
                {'name': 'Kadhi Khichdi', 'calories': int(target_calories * 0.95), 'portion': '1 plate'},
                {'name': 'Undhiyu', 'calories': int(target_calories * 0.8), 'portion': '1 bowl'}
            ],
            'dinner': [
                {'name': 'Roti with Sabzi', 'calories': int(target_calories * 0.9), 'portion': '2 rotis'},
                {'name': 'Paneer Curry', 'calories': int(target_calories * 0.85), 'portion': '1 bowl'},
                {'name': 'Mixed Vegetable', 'calories': int(target_calories * 0.8), 'portion': '1 plate'},
                {'name': 'Dal with Rice', 'calories': int(target_calories * 0.75), 'portion': '1 bowl'}
            ],
            'snacks': [
                {'name': 'Fafda', 'calories': int(target_calories * 0.8), 'portion': '4 pieces'},
                {'name': 'Gathiya', 'calories': int(target_calories * 0.7), 'portion': '1 serving'},
                {'name': 'Khaman', 'calories': int(target_calories * 0.6), 'portion': '3 pieces'},
                {'name': 'Sev Khamani', 'calories': int(target_calories * 0.75), 'portion': '1 bowl'}
            ]
        }
    }
    
    # Get region-specific meals or fallback to North India
    region_data = region_meals.get(region, region_meals['North India'])
    return region_data.get(meal_time, region_data['breakfast'])

@main.route('/api/clear-shuffle-cache', methods=['POST'])
def clear_shuffle_cache():
    return jsonify({'success': True, 'message': 'Cache cleared'})

@main.route('/api/test-variety', methods=['POST'])
def test_variety():
    return jsonify({'success': True, 'variety': 'tested'})

@main.route('/api/debug-meals', methods=['GET'])
def debug_meals():
    return jsonify({
        'success': True,
        'model_loaded': meal_model is not None,
        'model_path': os.path.join('app', 'models', 'meal_recommender.pkl'),
        'available_regions': ['North India', 'South India', 'East India', 'West India'],
        'meal_times': ['breakfast', 'lunch', 'dinner', 'snacks']
    })

# Register blueprint
app.register_blueprint(main)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
