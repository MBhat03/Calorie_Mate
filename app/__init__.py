import os
from flask import Flask
from flask_cors import CORS
from app.firebase_config import db

def create_app():
    # Set template folder path explicitly
    template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
    app = Flask(__name__, template_folder=template_dir)
    CORS(app)

    app.config['FIRESTORE_DB'] = db

    from app.routes import main_bp, user_bp, weight_bp, meal_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(user_bp, url_prefix='/api')
    app.register_blueprint(weight_bp, url_prefix='/api')
    app.register_blueprint(meal_bp)

    return app
