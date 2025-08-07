import os
import datetime
import firebase_admin
from firebase_admin import credentials, firestore
import requests

# Initialize Firebase
cred = credentials.Certificate("firebase_key.json")  # path will be set by GitHub Action
firebase_admin.initialize_app(cred)
db = firestore.client()

# Load environment variable
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "noreply@caloriemate.com")

def send_email(to_email, subject, content):
    url = "https://api.sendgrid.com/v3/mail/send"
    headers = {
        "Authorization": f"Bearer {SENDGRID_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "personalizations": [{
            "to": [{"email": to_email}],
            "subject": subject
        }],
        "from": {"email": FROM_EMAIL},
        "content": [{
            "type": "text/plain",
            "value": content
        }]
    }
    response = requests.post(url, headers=headers, json=data)
    print(f"Email to {to_email}: {response.status_code}")
    return response.status_code

def main():
    users_ref = db.collection("users")
    users = users_ref.stream()

    today = datetime.date.today()
    for user in users:
        user_data = user.to_dict()
        email = user_data.get("email")
        name = user_data.get("name", "User")
        last_log_str = user_data.get("last_weight_log_date")

        if not email or not last_log_str:
            continue

        last_log_date = datetime.datetime.strptime(last_log_str, "%Y-%m-%d").date()
        days_inactive = (today - last_log_date).days

        if days_inactive >= 3:
            subject = "⏰ Reminder: Don't forget to log your weight!"
            message = f"Hi {name},\n\nYou haven't logged your weight in {days_inactive} days. Keep up the good work on your health journey! 🚀\n\n- CalorieMate"
            send_email(email, subject, message)

if __name__ == "__main__":
    main() 