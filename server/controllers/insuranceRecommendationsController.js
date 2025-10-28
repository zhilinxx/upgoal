import { getDB } from "../config/db.js";

export const getInsuranceRecommendations = async (req, res) => {
  try {
    const { user_id } = req.user?.user_id;
    const db = getDB();

    // 1️⃣ Fetch user profile
    const [userRows] = await db.query("SELECT * FROM insurance_profile WHERE user_id = ?", [user_id]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: "Insurance profile not found" });
    }
    const profile = userRows[0];

    // 2️⃣ Fetch all insurance plans
    const [plans] = await db.query("SELECT * FROM insurance_plan");

    // 3️⃣ Determine user risk level (simplified example)
    let riskLevel = profile.risk_level;
    const riskLoading = { Low: 0, Medium: 0.5, High: 1 }[riskLevel];
    const allowance = profile.allowance;

    // 4️⃣ Calculate premium and score
    const recommendations = plans.map(plan => {
      const base = plan.premium;
      const finalPremium = base * (1 + riskLoading);

      let score = 100;
      const limit = allowance * 0.1; // ideal = 10% of allowance
      if (finalPremium > limit) {
        const diff = finalPremium - limit;
        score = Math.max(0, 100 - Math.floor(diff / 50) * 10);
      }

      return {
        ...plan,
        finalPremium: finalPremium.toFixed(2),
        score,
        riskLevel,
      };
    }).filter(p => p.score >= 70);

    res.json(recommendations);
  } catch (err) {
    console.error("Recommendation Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getProviders = async (req, res) => {
  try {
    const db = getDB();
    const [rows] = await db.query("SELECT DISTINCT provider FROM insurance_plan");
    res.json(rows.map(r => r.company_name));
  } catch (err) {
    console.error("Provider Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch providers" });
  }
};

