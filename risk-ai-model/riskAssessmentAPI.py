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


@app.route("/api/predict_risk", methods=["POST"])
def predict_risk():
    try:
        data = request.get_json()

        # Extract and structure input
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

        # ✅ Step 2: Reorder columns to match the scaler’s expected order
        expected_cols = list(scaler.feature_names_in_)
        features = features[expected_cols]

        # ✅ Step 3: Scale and predict
        X_scaled = scaler.transform(features)
        cluster = int(model.predict(X_scaled)[0])
        risk_level = mapping.get(cluster, "Medium")

        # ✅ Step 4: Helpful debug info
        print("\n--- DEBUG ---")
        print("Raw Input:", data)
        print("Scaler feature order:", scaler.feature_names_in_)
        print("Prediction DataFrame columns:", list(features.columns))
        print("Prepared features:\n", features)
        print("Scaled values:\n", X_scaled)
        print("Predicted cluster:", cluster)
        print("Mapped risk level:", risk_level)
        print("---------------\n")


        return jsonify({"risk_level": risk_level})
    except Exception as e:
        print("Prediction error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5001, debug=True, use_reloader=False)

