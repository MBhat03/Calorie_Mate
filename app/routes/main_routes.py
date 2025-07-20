import os
from flask import Blueprint, render_template, redirect, url_for, session, send_from_directory

main_bp = Blueprint("main", __name__)

@main_bp.route("/")
def home():
    return render_template("home.html")

@main_bp.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

@main_bp.route("/badges")
def badges():
    return render_template("badges.html")

@main_bp.route("/login")
def login():
    return render_template("login.html")

@main_bp.route("/register")
def register():
    return render_template("register.html")

@main_bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("main.home"))

@main_bp.route("/meals")
def meals():
    return render_template("meals.html")

@main_bp.route("/user_details")
def user_details():
    return render_template("user_details.html")

@main_bp.route('/app/meals.json')
def serve_meals_json():
    # Get the absolute path to the 'app' directory (one level up from this file)
    app_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    return send_from_directory(app_dir, 'meals.json')
