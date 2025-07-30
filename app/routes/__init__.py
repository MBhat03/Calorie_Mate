# Import route handlers (these will attach to the blueprints)
from . import main_routes, user_routes, meal_routes, weight_routes

# Export the blueprints from their respective modules
from .main_routes import main_bp
from .user_routes import user_bp
from .meal_routes import meal_routes as meals_bp
from .weight_routes import weight_bp
