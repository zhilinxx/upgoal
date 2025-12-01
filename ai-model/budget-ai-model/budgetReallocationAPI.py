from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/api/segment", methods=["POST"])
def segment():
    try:
        data = request.get_json() or {}
        income = float(data.get("income") or 0)
        c = data.get("commitments") or {}

        # Safe defaults
        housingLoan = float(c.get("housingLoan") or 0)
        carLoan = float(c.get("carLoan") or 0)
        insurance = float(c.get("insurance") or 0)
        others = float(c.get("others") or 0)
        commit_total = housingLoan + carLoan + insurance + others

        burden = (commit_total / income) if income > 0 else 0.0
        if burden >= 0.6:
            label = "frequent over-spender"
        elif burden <= 0.4:
            label = "conservative saver"
        else:
            label = "balanced spender"

        # return safe ratios as fallback
        ratios = {"essentials": 0.55, "savings": 0.25, "insurance": 0.1, "other": 0.1}

        return jsonify({"label": label, "ratios": ratios, "repayment_plan": None})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5002))
    app.run(host="0.0.0.0", port=port)
