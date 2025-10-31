from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib, os

app = Flask(__name__)
CORS(app)

base_dir = os.path.dirname(__file__)
model_path   = os.path.join(base_dir, "budget_model.pkl")   # your trained Pipeline (preprocess + kmeans)
labels_path  = os.path.join(base_dir, "labels_mapping.pkl") # optional { "labels_mapping": {clusterId: "balanced spender", ...} }

pipe = joblib.load(model_path)
try:
    labels_mapping = joblib.load(labels_path)["labels_mapping"]
except Exception:
    labels_mapping = {}

def map_segment_to_ratios(label: str):
    key = (label or "").lower()
    if "conservative" in key:
        return {"essentials": 0.50, "savings": 0.30, "insurance": 0.10, "other": 0.10}
    if "over" in key:  # frequent over-spender
        return {"essentials": 0.58, "savings": 0.20, "insurance": 0.10, "other": 0.12}
    # balanced/default
    return {"essentials": 0.55, "savings": 0.25, "insurance": 0.10, "other": 0.10}

def normalize(r):
    e = max(0.0, float(r.get("essentials", 0)))
    s = max(0.0, float(r.get("savings",    0)))
    i = max(0.0, float(r.get("insurance",  0)))
    o = max(0.0, float(r.get("other",      0)))
    sm = e + s + i + o
    if sm <= 0: return {"essentials": .55, "savings": .25, "insurance": .10, "other": .10}
    return {"essentials": e/sm, "savings": s/sm, "insurance": i/sm, "other": o/sm}

def predict_with_pipeline(d):
    """
    d must already contain the features the pipeline expects (same names/order as in training).
    Here we just call the pipeline steps by name: 'pre' then 'kmeans'.
    """
    pre = pipe.named_steps.get("pre")
    km  = pipe.named_steps.get("kmeans") or next(
        pipe.named_steps[k] for k in pipe.named_steps if "kmeans" in k
    )
    X_pre = pre.transform([d]) if pre is not None else [d]
    cluster_id = int(km.predict(X_pre)[0])
    label = labels_mapping.get(cluster_id,
                               ["conservative saver","balanced spender","frequent over-spender"][cluster_id]
                               if cluster_id < 3 else f"cluster-{cluster_id}")
    return label

@app.route("/api/segment", methods=["POST"])
def segment():
    """
    Accepts EITHER:
    A) Full feature payload (the one you used during training)
       -> derive the same engineered features, call predict_with_pipeline, map label->ratios

    B) Lite payload (from your Node server):
       {
         "income": <float>,
         "commitments": {"housingLoan":..,"carLoan":..,"insurance":..,"others":..},
         "lifestyle": "Balanced" | "Frugal" | "Luxury" | "None"
       }
       -> We’ll produce a label heuristically and map to ratios.
    """
    try:
        data = request.get_json() or {}
        # ---- Case B: lite schema (what your Node sends now) ----
        if "income" in data and "commitments" in data:
            income = float(data.get("income") or 0.0)
            c = data.get("commitments") or {}
            # simple heuristic label using commitments burden; you can make smarter later:
            commit_total = float(c.get("housingLoan", 0)) + float(c.get("carLoan", 0)) + float(c.get("insurance", 0)) + float(c.get("others", 0))
            burden = (commit_total / income) if income > 0 else 0.0

            if burden >= 0.6:
                label = "frequent over-spender"
            elif burden <= 0.4:
                label = "conservative saver"
            else:
                label = "balanced spender"

            ratios = normalize(map_segment_to_ratios(label))
            return jsonify({"label": label, "ratios": ratios})

        # ---- Case A: full feature schema (columns like Rent, Groceries, etc.) ----
        # Reconstruct the dict of features the pipeline expects.
        # If in training you engineered *_PctIncome and Savings_Ratio:
        if "Income" in data:
            d = dict(data)
            income = float(d.get("Income") or 0.0) or 1.0
            # ensure engineered fields exist:
            d["Savings_Ratio"] = (float(d.get("Desired_Savings", 0.0)) / income) if income else 0.0
            for c in ["Rent","Loan_Repayment","Insurance","Groceries","Transport","Eating_Out",
                      "Entertainment","Utilities","Healthcare","Education","Miscellaneous"]:
                d[f"{c}_PctIncome"] = (float(d.get(c, 0.0)) / income) if income else 0.0

            label = predict_with_pipeline(d)
            ratios = normalize(map_segment_to_ratios(label))
            return jsonify({"label": label, "ratios": ratios})

        return jsonify({"error": "Unsupported payload"}), 400

    except Exception as e:
        print("segment error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True, use_reloader=False)
