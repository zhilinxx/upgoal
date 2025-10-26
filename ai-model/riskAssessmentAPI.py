from flask import Flask, request, jsonify
from flask_cors import CORS 
import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)
CORS(app)

# ✅ Load the trained model and scaler (you save them in Jupyter)
import os

base_dir = os.path.dirname(__file__)  # directory where this file lives
model_path = os.path.join(base_dir, "risk_model.pkl")
mapping_path = os.path.join(base_dir, "risk_mapping.pkl")
scaler_path = os.path.join(base_dir, "risk_scaler.pkl")

model = joblib.load(model_path)
mapping = joblib.load(mapping_path)
scaler = joblib.load(scaler_path)

# Mapping clusters to risk labels
RISK_MAPPING = {0: "Low", 1: "Medium", 2: "High"}  # adjust based on your training

@app.route("/api/predict_risk", methods=["POST"])
def predict_risk():
    try:
        data = request.get_json()

        # Extract and structure input
        features = pd.DataFrame([{
            "sex": 1 if data["gender"] == "Male" else 0,
            "age": data["age"],
            "cholesterol": 1 if data["cholesterol"] == "Yes" else 0,
            "occup_danger": int(data["occupation"]),
            "bmi": data["bmi"],
            "smoker": 1 if data["smoke"] == "Yes" else 0,
            "diabetes": 1 if data["diabetes"] == "Yes" else 0,
            "hds": 1 if data["heart_disease"] == "Yes" else 0,
            "asthma": 1 if data["asthma"] == "Yes" else 0,
            "alcohol": int(data["alcohol"]),
            "exercise": int(data["exercise"]),
            "family_cancer": 1 if data["family_cancer"] == "Yes" else 0
        }])

        # Scale and predict
        X_scaled = scaler.transform(features)
        cluster = model.predict(X_scaled)[0]
        risk_level = RISK_MAPPING.get(cluster, "Medium")

        return jsonify({"risk_level": risk_level})
    except Exception as e:
        print("Prediction error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5001, debug=True)
