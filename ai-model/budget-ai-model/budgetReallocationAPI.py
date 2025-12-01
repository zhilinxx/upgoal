from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib, os

app = Flask(__name__)
CORS(app)

base_dir = os.path.dirname(__file__)
model_path   = os.path.join(base_dir, "budget_model.pkl")   # trained Pipeline (preprocess + kmeans)
labels_path  = os.path.join(base_dir, "labels_mapping.pkl") 

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

# ⬇️ ADD HERE (below normalize / map_segment_to_ratios)
def cap_other_by_band(other_ratio):
    """
    Tiered caps based on how high 'Other' currently is (relative to income).
    10–15%  -> cap at 8%
    15–20%  -> cap at 6%
    >20%    -> cap at 5%
    <=10%   -> no cap (return None)
    """
    if other_ratio is None:
        return None
    try:
        r = float(other_ratio)
    except:
        return None

    if r <= 0.10:     return None
    if r <= 0.15:     return 0.08
    if r <= 0.20:     return 0.06
    return 0.05

# UPDATED apply_other_overspend_rules (paste in replacement)
def apply_other_overspend_rules(ratios, other_ratio, income=None, lifestyle=None, label=None,
                               repay_months_default=3):
    """
    If 'Other' spending is too high, compute a repayment plan instead of forcibly capping
    the current month. Return (ratios_dict, repayment_plan_or_None).

    repayment_plan = {
        "excess_amount": <float in currency>,
        "excess_ratio": <float>,
        "months": <int>,
        "monthly_amount": <float>,
        "strategy": "reduce_savings_first",
        "suggested_future_ratios": { ... }  # what future months' ratios might look like
    }
    """
    cap = cap_other_by_band(other_ratio)
    # normalize original ratios (this represents current month / suggested allocations)
    r = normalize(ratios)

    # If no cap or current other <= cap -> nothing to do
    try:
        current_other = float(r.get("other", 0.0))
    except Exception:
        current_other = 0.0

    if cap is None or current_other <= cap:
        return r, None

    # compute excess ratio and amount (if income provided)
    excess_ratio = current_other - cap
    income_val = None
    try:
        income_val = float(income) if income is not None else None
    except Exception:
        income_val = None

    excess_amount = round(excess_ratio * income_val, 2) if income_val else None

    # Decide repayment months (can be tuned)
    months = repay_months_default
    # adaptive policy: small overspend -> fewer months, big -> more months
    if excess_ratio <= 0.03:
        months = 2
    elif excess_ratio <= 0.07:
        months = 3
    else:
        months = 4

    monthly_amount = round(excess_amount / months, 2) if excess_amount is not None else None

    # Build suggested future ratios by capping 'other' and redistributing delta
    suggested = dict(r)  # copy
    suggested["other"] = cap
    delta = current_other - cap

    key = (label or lifestyle or "").lower()
    if "conservative" in key:
        w_s, w_e = 0.80, 0.20
    elif "over" in key:
        w_s, w_e = 0.90, 0.10
    else:
        w_s, w_e = 0.60, 0.40

    suggested["savings"]    = float(suggested.get("savings", 0.0)) + delta * w_s
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

    # IMPORTANT: Return the actual normalized ratios for the current month (honest),
    # plus the repayment_plan the frontend can show / apply for next months.
    return r, repayment_plan



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
       -> derive engineered features, predict cluster/label, map to ratios, then apply overspend rule

    B) Lite payload (from Node):
       {
         "income": <float>,
         "commitments": {"housingLoan":..,"carLoan":..,"insurance":..,"others":..},
         "lifestyle": "Balanced" | "Frugal" | "Luxury" | "None",
         "other_spend_ratio": <float>   # optional but recommended
       }
       -> Heuristic label -> ratios -> apply overspend rule.
    """
    try:
        data = request.get_json() or {}

        # ---- Case B: lite schema (what your Node sends now) ----
        if "income" in data and "commitments" in data:
            income = float(data.get("income") or 0.0)
            c = data.get("commitments") or {}

            # Simple heuristic label using commitments burden
            commit_total = (
                float(c.get("housingLoan", 0)) +
                float(c.get("carLoan", 0)) +
                float(c.get("insurance", 0)) +
                float(c.get("others", 0))
            )
            burden = (commit_total / income) if income > 0 else 0.0

            if burden >= 0.6:
                label = "frequent over-spender"
            elif burden <= 0.4:
                label = "conservative saver"
            else:
                label = "balanced spender"

            # Base ratios (can be swapped to learned per-cluster ratios later)
            ratios = normalize(map_segment_to_ratios(label))

            # ⬇️ Apply "Other overspend" rule if client sent ratio
            ratios, repayment_plan = apply_other_overspend_rules(
                ratios,
                other_ratio = data.get("other_spend_ratio"),
                income     = income,
                lifestyle  = data.get("lifestyle"),
                label      = label
            )
            return jsonify({"label": label, "ratios": ratios, "repayment_plan": repayment_plan})


        # ---- Case A: full feature schema (columns like Rent, Groceries, etc.) ----
        if "Income" in data:
            d = dict(data)
            income = float(d.get("Income") or 0.0) or 1.0

            # Ensure engineered fields exist (mirror your training)
            d["Savings_Ratio"] = (float(d.get("Desired_Savings", 0.0)) / income) if income else 0.0
            for c in [
                "Rent","Loan_Repayment","Insurance","Groceries","Transport","Eating_Out",
                "Entertainment","Utilities","Healthcare","Education","Miscellaneous"
            ]:
                d[f"{c}_PctIncome"] = (float(d.get(c, 0.0)) / income) if income else 0.0

            # Predict label via pipeline
            label = predict_with_pipeline(d)

            # Base ratios (replace with ratios_by_cluster[...] if you’ve saved them)
            ratios = normalize(map_segment_to_ratios(label))

            # ⬇️ Apply "Other overspend" rule if provided
            ratios = apply_other_overspend_rules(
                ratios,
                other_ratio = data.get("other_spend_ratio"),
                income     = income,
                lifestyle  = None,
                label      = label
            )

            return jsonify({"label": label, "ratios": ratios})

        return jsonify({"error": "Unsupported payload"}), 400

    except Exception as e:
        print("segment error:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5002))
    app.run(host="0.0.0.0", port=port)
