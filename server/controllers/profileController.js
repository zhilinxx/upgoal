// controllers/profileController.js
import { getDB } from "../config/db.js";

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.query.userId;
    if (!userId) return res.status(400).json({ message: "User ID missing" });

    const db = getDB();

    // 1️⃣ Fetch main user + income + insurance profile
    const [rows] = await db.query(
      `SELECT 
          u.user_id, u.email, u.role, u.theme,
          inc.net_income, inc.lifestyle,
          ins.birth_date, ins.gender, ins.height, ins.weight, ins.exercise, 
          ins.alcohol, ins.smoke, ins.diabetes, ins.cholesterol, ins.asthma, 
          ins.fam_cancer, ins.heart_disease, ins.occupation, ins.allowance
      FROM user u
      LEFT JOIN income inc ON u.user_id = inc.user_id
      LEFT JOIN insurance_profile ins ON u.user_id = ins.user_id
      WHERE u.user_id = ?`,
      [userId]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Profile not found" });

    const profile = rows[0];

    // Fetch all monthly commitments for this user
    const [commitRows] = await db.query(
      "SELECT commitment_type, commitment_amt FROM monthly_commitments WHERE user_id = ?",
      [userId]
    );

    profile.commitments = commitRows.map((c) => ({
      type: c.commitment_type,
      amt: parseFloat(c.commitment_amt),
    }));

    // Return full combined profile
    res.json(profile);
  } catch (err) {
    console.error("getUserProfile Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
