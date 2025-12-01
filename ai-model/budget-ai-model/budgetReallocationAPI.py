from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib, os

app = Flask(__name__)
CORS(app)

base_dir = os.path.dirname(__file__)
model_path = os.path.join(base_dir, "budget_model.pkl")
labels_path = os.path.join(base_dir, "labels_mapping.pkl")

pipe = joblib.load(model_path)
try:
    labels_mapping = joblib.load(labels_path)["labels_mapping"]
except Exception:
    labels_mapping = {}

def map_segment_to_ratios(label: str):
    key = (label or "").lower()
    if "conservative" in key:
        return {"essentials": 0.50, "savings": 0.30, "insurance": 0.10, "other": 0.10}
    if "over" in key:
        return {"essentials": 0.58, "savings": 0.20, "insurance": 0.10, "other": 0.12}
    return {"essentials": 0.55, "savings": 0.25, "insurance": 0.10, "other": 0.10}

def normalize(r):
    e = max(0.0, float(r.get("essentials", 0)))
    s = max(0.0, float(r.get("savings", 0)))
    i = max(0.0, float(r.get("insurance", 0)))
    o = max(0.0, float(r.get("other", 0)))
    sm = e + s + i + o
    if sm <= 0:
        return {"essentials": .55, "savings": .25, "insurance": .10, "other": .10}
    return {"essentials": e/sm, "savings": s/sm, "insurance": i/sm, "other": o/sm}

def cap_other_by_band(other_ratio):
    if other_ratio is None:
        return None
    try:
        r = float(other_ratio)
    except:
        return None
    if r <= 0.10: return None
    if r <= 0.15: return 0.08
    if r <= 0.20: return 0.06
    return 0.05

def apply_other_overspend_rules(ratios, other_ratio, income=None, lifestyle=None, label=None,
                               repay_months_default=3):
    cap = cap_other_by_band(other_ratio)
    r = normalize(ratios)
    try:
        current_other = float(r.get("other", 0.0))
    except:
        current_other = 0.0

    if cap is None or current_other <= cap:
        return r, None

    excess_ratio = current_other - cap
    income_val = float(income) if income else None
    excess_amount = round(excess_ratio * income_val, 2) if income_val else None

    months = repay_months_default
    if excess_ratio <= 0.03: months = 2
    elif excess_ratio <= 0.07: months = 3
    else: months = 4

    monthly_amount = round(excess_amount / months, 2) if excess_amount else None

    suggested = dict(r)
    suggested["other"] = cap
    delta = current_other - cap
    key = (label or lifestyle or "").lower()
    if "conservative" in key: w_s, w_e = 0.80, 0.20
    elif "over" in key: w_s, w_e = 0.90, 0.10
    else: w_s, w_e = 0.60, 0.40

    suggested["savings"] = float(suggested.get("savings", 0.0)) + delta * w_s
    suggested["essentials"] = float(suggested.get("essentials", 0.0)) + delta * w_e
    suggested = normalize(suggested)

    repayment_plan = {
        "excess_ratio": round(excess_ratio, 4),
        "excess_amount": excess_amount,
        "months": months,
        "monthly_amount": monthly_amount,
        "strategy": "reduce_savings_first",
        "suggested_future_ratios": suggested
    }

    return r, repayment_plan

def predict_with_pipeline(d):
    pre = pipe.named_steps.get("pre")
    km  = pipe.named_steps.get("kmeans") or next(pipe.named_steps[k] for k in pipe.named_steps if "kmeans" in k)
    X_pre = pre.transform([d]) if pre else [d]
    cluster_id = int(km.predict(X_pre)[0])
    label = labels_mapping.get(cluster_id,
                               ["conservative saver","balanced spender","frequent over-spender"][cluster_id]
                               if cluster_id < 3 else f"cluster-{cluster_id}")
    return label

@app.route("/api/segment", methods=["POST"])
def segment():
    try:
        data = request.get_json() or {}
        # Ensure commitments dict is safe
        c = data.get("commitments") or {}
        income = float(data.get("income") or 0.0)

        if "income" in data and "commitments" in data:
            commit_total = (
                float(c.get("housingLoan", 0) or 0) +
                float(c.get("carLoan", 0) or 0) +
                float(c.get("insurance", 0) or 0) +
                float(c.get("others", 0) or 0)
            )
            burden = (commit_total / income) if income > 0 else 0.0

            if burden >= 0.6:
                label = "frequent over-spender"
            elif burden <= 0.4:
                label = "conservative saver"
            else:
                label = "balanced spender"

            ratios = normalize(map_segment_to_ratios(label))

            ratios, repayment_plan = apply_other_overspend_rules(
                ratios,
                other_ratio = data.get("other_spend_ratio"),
                income     = income,
                lifestyle  = data.get("lifestyle"),
                label      = label
            )
            return jsonify({"label": label, "ratios": ratios, "repayment_plan": repayment_plan})

        # Fallback for older style input
        if "Income" in data:
            d = dict(data)
            income = float(d.get("Income") or 0.0) or 1.0
            d["Savings_Ratio"] = (float(d.get("Desired_Savings", 0.0)) / income) if income else 0.0
            for c_name in [
                "Rent","Loan_Repayment","Insurance","Groceries","Transport","Eating_Out",
                "Entertainment","Utilities","Healthcare","Education","Miscellaneous"
            ]:
                d[f"{c_name}_PctIncome"] = (float(d.get(c_name, 0.0)) / income) if income else 0.0

            label = predict_with_pipeline(d)
            ratios = normalize(map_segment_to_ratios(label))

            ratios, repayment_plan = apply_other_overspend_rules(
                ratios,
                other_ratio = data.get("other_spend_ratio"),
                income     = income,
                lifestyle  = None,
                label      = label
            )
            return jsonify({"label": label, "ratios": ratios, "repayment_plan": repayment_plan})

        return jsonify({"error": "Unsupported payload"}), 400

    except Exception as e:
        print("segment error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    app.run(host="0.0.0.0", port=port)
