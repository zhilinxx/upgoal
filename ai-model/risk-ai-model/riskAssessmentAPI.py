from flask import Flask, request, jsonify
from flask_cors import CORS 
import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
import os

app = Flask(__name__)
CORS(app)

# Load model
base_dir = os.path.dirname(__file__)
model = joblib.load(os.path.join(base_dir, "risk_model.pkl"))
mapping = joblib.load(os.path.join(base_dir, "risk_mapping.pkl"))
scaler = joblib.load(os.path.join(base_dir, "risk_scaler.pkl"))

@app.route("/api/predict_risk", methods=["POST"])
def predict_risk():
    try:
        data = request.get_json()

        features = pd.DataFrame([{
            "age": int(data["age"]),
            "cholesterol": int(data["cholesterol"]),
            "occup_danger": int(data["occupation"]),
            "bmi": float(data["bmi"]) / 500,
            "smoker": 1 if data["smoke"] == "Yes" else 0,
            "diabetes": 1 if data["diabetes"] == "Yes" else 0,
            "hds": 1 if data["heart_disease"] == "Yes" else 0,
            "asthma": 1 if data["asthma"] == "Yes" else 0,
            "alcohol": int(data["alcohol"]),
            "exercise": int(data["exercise"]),
            "family_cancer": 1 if data["family_cancer"] == "Yes" else 0
        }])

        features = features[list(scaler.feature_names_in_)]
        X_scaled = scaler.transform(features)
        cluster = int(model.predict(X_scaled)[0])
        risk_level = mapping.get(cluster, "Medium")

        return jsonify({"risk_level": risk_level})
    except Exception as e:
        print("Prediction error:", e)
        return jsonify({"error": str(e)}), 500
