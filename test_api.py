#!/usr/bin/env python3
"""
Simple test script for Calorie Mate API
Run this after setting up Firebase credentials
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_calculate():
    """Test calorie calculation endpoint"""
    print("Testing calculate endpoint...")
    data = {
        "age": 25,
        "gender": "male",
        "height_cm": 175,
        "weight_kg": 70,
        "activity_level": "moderate",
        "goal": "maintain",
        "region": "North"
    }
    
    response = requests.post(f"{BASE_URL}/calculate", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_create_user():
    """Test user creation endpoint"""
    print("Testing user creation...")
    data = {
        "age": 30,
        "gender": "female",
        "height_cm": 165,
        "weight_kg": 60,
        "activity_level": "active",
        "goal": "loss",
        "region": "South"
    }
    
    response = requests.post(f"{BASE_URL}/api/users", json=data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {result}")
    
    if response.status_code == 201:
        user_id = result.get('user_id')
        print(f"Created user with ID: {user_id}")
        return user_id
    return None

def test_get_user(user_id):
    """Test getting user details"""
    if not user_id:
        return
    
    print(f"Testing get user {user_id}...")
    response = requests.get(f"{BASE_URL}/api/users/{user_id}")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_log_weight(user_id):
    """Test weight logging"""
    if not user_id:
        return
    
    print(f"Testing weight logging for user {user_id}...")
    data = {
        "user_id": user_id,
        "new_weight": 59.5
    }
    
    response = requests.post(f"{BASE_URL}/api/log-weight", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_get_progress(user_id):
    """Test getting weight progress"""
    if not user_id:
        return
    
    print(f"Testing get progress for user {user_id}...")
    response = requests.get(f"{BASE_URL}/api/get-progress?user_id={user_id}")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_get_meals():
    """Test getting meals by region"""
    print("Testing get meals by region...")
    response = requests.get(f"{BASE_URL}/api/get-meals?region=South")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

if __name__ == "__main__":
    print("Calorie Mate API Test Suite")
    print("=" * 40)
    
    try:
        # Test basic endpoints
        test_health()
        test_calculate()
        
        # Test user management
        user_id = test_create_user()
        if user_id:
            test_get_user(user_id)
            
            # Test weight tracking
            test_log_weight(user_id)
            test_get_progress(user_id)
        
        # Test meal management
        test_get_meals()
        
        print("All tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the API. Make sure the Flask app is running on http://localhost:5000")
    except Exception as e:
        print(f"Error during testing: {e}") 