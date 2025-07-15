# Calorie Mate - Flask Backend

A Flask-based REST API for calorie tracking and weight management built with Firebase Firestore.

## Features

- **BMI & Calorie Calculation**: Calculate BMI, BMR, and daily calorie targets using Mifflin-St Jeor equation
- **Weight Tracking**: Log and track weight changes over time
- **Meal Management**: Region-based meal recommendations
- **User Management**: Create and manage user profiles
- **Progress Tracking**: Visualize weight progress over time

## Project Structure

```
Calorie_Mate/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── models/              # Data models
│   │   ├── __init__.py
│   │   ├── user.py          # User model with BMI calculations
│   │   └── weight_log.py    # Weight log model
│   ├── routes/              # API routes
│   │   ├── __init__.py
│   │   ├── main_routes.py   # Main routes (calculate, health)
│   │   ├── user_routes.py   # User management
│   │   ├── meal_routes.py   # Meal operations
│   │   └── weight_routes.py # Weight tracking
│   └── services/            # Business logic
│       ├── __init__.py
│       ├── user_service.py  # User operations
│       ├── weight_service.py # Weight operations
│       └── meal_service.py  # Meal operations
├── app.py                   # Application entry point
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- Firebase project with Firestore enabled
- Firebase service account key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Calorie_Mate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Firebase Setup**
   
   **Option A: Service Account Key (Recommended for production)**
   - Download your Firebase service account key JSON file
   - Set the environment variable:
     ```bash
     export FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/your/serviceAccountKey.json
     ```
   
   **Option B: Default Credentials (Development)**
   - Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable:
     ```bash
     export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/serviceAccountKey.json
     ```

4. **Run the application**
   ```bash
   python app.py
   ```

The API will be available at `http://localhost:5000`

## API Endpoints

### Health Check
- **GET** `/health` - Check API status

### Calorie Calculation
- **POST** `/calculate` - Calculate BMI, BMR, and calorie target

**Request Body:**
```json
{
  "age": 25,
  "gender": "male",
  "height_cm": 175,
  "weight_kg": 70,
  "activity_level": "moderate",
  "goal": "maintain",
  "region": "North"
}
```

**Response:**
```json
{
  "bmi": 22.86,
  "bmr": 1655,
  "calorie_target": 2565,
  "status": "normal"
}
```

### User Management
- **POST** `/api/users` - Create a new user
- **GET** `/api/users/<user_id>` - Get user details

### Weight Tracking
- **POST** `/api/log-weight` - Log a new weight entry
- **GET** `/api/get-progress?user_id=XYZ` - Get weight progress
- **GET** `/api/weight-logs/<user_id>` - Get detailed weight logs

**Log Weight Request:**
```json
{
  "user_id": "user123",
  "new_weight": 68.5,
  "date": "2024-01-15T10:30:00"  // Optional
}
```

### Meal Management
- **GET** `/api/get-meals?region=South` - Get meals by region
- **POST** `/api/meals` - Add a new meal
- **GET** `/api/meals` - Get all meals

## Firebase Collections

The application uses the following Firestore collections:

- **Users**: User profiles and preferences
- **WeightLogs**: Weight tracking entries
- **Meals**: Regional meal database
- **Streaks**: User achievement tracking (future feature)

## Deployment to Render.com

1. **Create a new Web Service** on Render.com
2. **Connect your GitHub repository**
3. **Configure the service:**
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Environment Variables**:
     - `FIREBASE_SERVICE_ACCOUNT_PATH`: Path to your service account JSON
     - `PYTHON_VERSION`: `3.9` (or your preferred version)

4. **Deploy the service**

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (missing/invalid data)
- `404`: Not Found
- `500`: Internal Server Error

All error responses include an `error` field with a descriptive message.

## BMI Categories

- **Underweight**: BMI < 18.5
- **Normal**: BMI 18.5 - 24.9
- **Overweight**: BMI 25.0 - 29.9
- **Obese**: BMI ≥ 30.0

## Activity Levels

- **Sedentary**: 1.2x BMR
- **Light**: 1.375x BMR
- **Moderate**: 1.55x BMR
- **Active**: 1.725x BMR
- **Very Active**: 1.9x BMR

## Calorie Goals

- **Loss**: TDEE - 500 calories
- **Maintain**: TDEE (no adjustment)
- **Gain**: TDEE + 500 calories

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. 