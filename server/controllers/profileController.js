// controllers/profileController.js
import { getDB } from "../config/db.js";

// ✅ Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.query.userId;
    if (!userId) return res.status(400).json({ message: "User ID missing" });

    const db = getDB();
    const [rows] = await db.query(
    `SELECT 
        u.user_id, u.email, u.role, u.theme,
        inc.net_income, inc.lifestyle,
        ins.birth_date, ins.gender, ins.height, ins.weight, ins.exercise, ins.alcohol, ins.smoke,
        ins.diabetes, ins.cholesterol, ins.asthma, ins.fam_cancer, ins.heart_disease,
        ins.occupation, ins.allowance
    FROM user u
    LEFT JOIN income inc ON u.user_id = inc.user_id
    LEFT JOIN insurance_profile ins ON u.user_id = ins.user_id
    WHERE u.user_id = ?`,
    [userId]
    );


    if (rows.length === 0)
      return res.status(404).json({ message: "Profile not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ getUserProfile Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update insurance profile info
export const updateInsuranceProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const {
      gender,
      birth_date,
      height,
      weight,
      exercise,
      alcohol,
      smoke,
      diabetes,
      cholesterol,
      asthma,
      family_cancer,
      heart_disease,
      occupation,
      allowance,
    } = req.body;

    const db = getDB();
    await db.query(
      `UPDATE user_profile
       SET gender=?, birth_date=?, height=?, weight=?, exercise=?, alcohol=?, smoke=?,
           diabetes=?, cholesterol=?, asthma=?, family_cancer=?, heart_disease=?, 
           occupation=?, allowance=?
       WHERE user_id=?`,
      [
        gender,
        birth_date,
        height,
        weight,
        exercise,
        alcohol,
        smoke,
        diabetes,
        cholesterol,
        asthma,
        family_cancer,
        heart_disease,
        occupation,
        allowance,
        userId,
      ]
    );

    res.json({ message: "Insurance profile updated successfully" });
  } catch (err) {
    console.error("❌ updateInsuranceProfile Error:", err);
    res.status(500).json({ message: "Update failed" });
  }
};
