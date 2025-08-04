import os
from flask import Flask
from flask_cors import CORS
from app.firebase_config import db

def create_app():
    # Get the absolute path to the project root
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # Set template and static folder paths explicitly
    template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
    static_dir = os.path.join(base_dir, 'static')
    app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
    CORS(app)

    # ✅ Add secret key for session handling
    app.secret_key = os.environ.get("SECRET_KEY", "super-secret-key")

    app.config['FIRESTORE_DB'] = db

    from app.routes import main_bp, user_bp, weight_bp, meals_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(user_bp, url_prefix='/api')
    app.register_blueprint(weight_bp, url_prefix='/api')
    app.register_blueprint(meals_bp)

    return app
