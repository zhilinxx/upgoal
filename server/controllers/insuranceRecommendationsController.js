import { getDB } from "../config/db.js";

async function calculatePlanScore(plan, profile, sumAssured, taxRelief) {
  const riskLevel = profile.risk_level;
  const allowance = Number(profile.allowance) || 0;
  const riskLoading = { L: 0, M: 0.5, H: 1 }[riskLevel] || 0;

  // Ensure all numeric
  let basePremium = Number(plan.premium) || 0;
  let adjustedPremium = basePremium;
  let adjustedSumAssured = Number(plan.sum_assured) || 0;
  let multiplier = 1;

  const desiredSum = Number(sumAssured) || adjustedSumAssured;

  // Adjust based on selected sum assured
  if (adjustedSumAssured === 100000 && desiredSum !== adjustedSumAssured) {
    if (plan.plan_type === "Life") {
      multiplier =
        desiredSum === 200000 ? 1.2 :
        desiredSum === 300000 ? 1.5 :
        desiredSum === 400000 ? 1.7 :
        desiredSum === 500000 ? 2 : 1;
    } else if (plan.plan_type === "Life + Medical") {
      multiplier =
        desiredSum === 200000 ? 1.1 :
        desiredSum === 300000 ? 1.4 :
        desiredSum === 400000 ? 1.6 :
        desiredSum === 500000 ? 1.8 : 1;
    }
    adjustedPremium = basePremium * multiplier;
    adjustedSumAssured = desiredSum;
  }

  // Apply risk loading
  let finalPremium = adjustedPremium * (1 + riskLoading);

  // Calculate suitability score
  let score = 100;
  const limit = allowance * 0.1; // ideal 10%
  if (finalPremium > limit && limit > 0) {
    const diff = finalPremium - limit;
    score = Math.max(0, 100 - Math.floor(diff / 5)); // 1% for every RM5
  }

  let premiumNoTax = finalPremium;
  let premiumWithTax = Math.max(0, finalPremium - 250);
  // Apply tax relief if needed
  if (taxRelief === "true") {
    finalPremium = Math.max(0, finalPremium - 250);
  }

  return {
    score,
    finalPremium: Number(finalPremium.toFixed(2)),
    premiumNoTax: Number(premiumNoTax),
    premiumWithTax: Number(premiumWithTax),
    adjustedSumAssured,
    riskLevel,
  };
}


export const getInsuranceRecommendations = async (req, res) => {
  try {
    const user_id = req.params.userId;
    if (!user_id) return res.status(400).json({ message: "Missing user ID" });

    const db = getDB();

    // Get user profile
    const [userRows] = await db.query(
      "SELECT * FROM insurance_profile WHERE user_id = ?",
      [user_id]
    );
    if (userRows.length === 0)
      return res.status(404).json({ message: "Insurance profile not found" });

    const profile = userRows[0];

    // Get plans
    const [plans] = await db.query("SELECT * FROM insurance_plan");

    // NEW: Only one value from slider
    const {
      premiumMin,
      premiumMax,
      planType,
      provider,
      taxRelief,
      sort,
      sumAssured // <— this replaces sumMin & sumMax
    } = req.query;

    // Calculate premiums & score using sumAssured instead of sumMax
    const recommendations = await Promise.all(
      plans.map(async (plan) => {
        const calc = await calculatePlanScore(
          plan,
          profile,
          sumAssured,   // <— use single value
          taxRelief
        );

        return {
          ...plan,
          finalPremium: calc.finalPremium,
          adjustedSumAssured: calc.adjustedSumAssured,
          score: calc.score,
          riskLevel: calc.riskLevel,
          premiumWithTax: calc.premiumWithTax,
          premiumNoTax: calc.premiumNoTax,
        };
      })
    );

    // Filter out unsuitable plans
    let filtered = recommendations.filter((p) => p.score >= 70);

    // Premium filtering
    if (premiumMin || premiumMax) {
      filtered = filtered.filter((p) => {
        const prem = parseFloat(p.finalPremium);
        return (
          (!premiumMin || prem >= premiumMin) &&
          (!premiumMax || prem <= premiumMax)
        );
      });
    }

    // Plan type filter
    if (planType && planType !== "All") {
      filtered = filtered.filter((p) => p.plan_type === planType);
    }

    // Provider filter
    if (provider) {
      filtered = filtered.filter((p) => p.provider === provider);
    }

    // Sorting
    if (sort) {
      const compare = {
        premiumHigh: (a, b) => b.finalPremium - a.finalPremium,
        premiumLow: (a, b) => a.finalPremium - b.finalPremium,
        scoreHigh: (a, b) => b.score - a.score,
        scoreLow: (a, b) => a.score - b.score,
      };
      filtered.sort(compare[sort]);
    }

    res.json(filtered);
  } catch (err) {
    console.error("Recommendation Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



export const getPlanScore = async (req, res) => {
  try {
    const { planId, userId, sumMax } = req.query;
    const db = getDB();

    // Get user profile
    const [userRows] = await db.query("SELECT * FROM insurance_profile WHERE user_id = ?", [userId]);
    if (userRows.length === 0)
      return res.status(404).json({ message: "User profile not found" });

    const profile = userRows[0];

    // Get plan
    const [plans] = await db.query("SELECT * FROM insurance_plan WHERE plan_id = ?", [planId]);
    if (plans.length === 0)
      return res.status(404).json({ message: "Plan not found" });

    const plan = plans[0];

    // Calculate using shared helper
    const calc = await calculatePlanScore(plan, profile, sumMax, false);
    console.log("🔹 getPlanScore params:", req.query);
    res.json({
      planId,
      finalPremium: calc.finalPremium,
      premiumWithTax: calc.premiumWithTax,
      premiumNoTax: calc.premiumNoTax,
      score: calc.score,
      adjustedSumAssured: calc.adjustedSumAssured,
      riskLevel: calc.riskLevel
    });
  } catch (err) {
    console.error("Get Plan Score Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getProviders = async (req, res) => {
  try {
    const db = getDB();
    const [rows] = await db.query("SELECT DISTINCT provider FROM insurance_plan");
    res.json(rows.map(r => r.provider));
  } catch (err) {
    console.error("Provider Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch providers" });
  }
};

export const getPlanById = async (req, res) => {
  try {
    const { planId } = req.params;
    const { userId } = req.query;
    const db = getDB();

    const [userRows] = await db.query("SELECT * FROM insurance_profile WHERE user_id = ?", [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User profile not found" });
    }
    const profile = userRows[0];

    const [plans] = await db.query("SELECT * FROM insurance_plan WHERE plan_id = ?", [planId]);
    if (plans.length === 0) {
      return res.status(404).json({ message: "Plan not found" });
    }

    res.json({
      plan: plans[0],
      userSuggestion: profile.payment_suggestion || "",
    });
  } catch (err) {
    console.error("Get Plan Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



