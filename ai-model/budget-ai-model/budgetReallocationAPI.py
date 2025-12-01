from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def cap_other_by_last_month(last_month_other_ratio):
    """Return max allowed 'Other' ratio based on last month overspend"""
    if last_month_other_ratio <= 0.10:
        return 0.10
    elif last_month_other_ratio <= 0.15:
        return 0.08
    elif last_month_other_ratio <= 0.20:
        return 0.06
    else:
        return 0.05

@app.route("/api/segment", methods=["POST"])
def segment():
    try:
        data = request.get_json() or {}
        income = float(data.get("income") or 0)
        last_month_other = float(data.get("last_month_other") or 0)

        # Step 1: base ratios
        ratios = {"essentials": 0.55, "savings": 0.25, "insurance": 0.10, "other": 0.10}

        # Step 2: apply last month overspend cap
        last_month_ratio = last_month_other / income if income > 0 else 0
        if last_month_ratio > 0.10:
            cap = cap_other_by_last_month(last_month_ratio)
            delta = ratios["other"] - cap
            if delta > 0:
                ratios["other"] = cap
                # redistribute delta to savings/essentials
                ratios["savings"] += delta * 0.7
                ratios["essentials"] += delta * 0.3

        # Step 3: compute allocations based on full income
        essentials_amt = round(income * ratios["essentials"], 2)
        savings_amt = round(income * ratios["savings"], 2)
        insurance_amt = round(income * ratios["insurance"], 2)
        other_amt = round(income * ratios["other"], 2)

        # Step 4: adjust rounding drift to ensure total = income
        total_alloc = essentials_amt + savings_amt + insurance_amt + other_amt
        drift = round(income - total_alloc, 2)
        essentials_amt += drift  # add drift to essentials

        return jsonify({
            "label": "adjusted_budget",
            "ratios": ratios,
            "repayment_plan": None,
            "amounts": {
                "essentials": essentials_amt,
                "savings": savings_amt,
                "insurance": insurance_amt,
                "other": other_amt,
                "income_total": income
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5002))
    app.run(host="0.0.0.0", port=port)
