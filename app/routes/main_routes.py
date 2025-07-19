from flask import Blueprint, render_template, redirect, url_for, session

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
