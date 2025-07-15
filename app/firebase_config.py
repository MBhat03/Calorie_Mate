import firebase_admin
from firebase_admin import credentials, firestore
import os

# Absolute path to the service account key
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
key_path = os.path.join(BASE_DIR, 'firebase_key.json')

# Check if already initialized (avoids duplicate app init error)
if not firebase_admin._apps:
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)

# Firestore client
db = firestore.client()
