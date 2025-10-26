import { getDB } from "../config/db.js";

export const saveInsuranceProfile = async (req, res) => {
  try {
    const {
      user_id,
      gender,
      birth_date,
      height,
      weight,
      exercise,
      drinks_alcohol,
      smoke,
      diabetes,
      cholesterol,
      asthma,
      family_cancer,
      heart_disease,
      occupation,
      allowance,
    } = req.body;

    if (
      !user_id ||
      !gender ||
      !birth_date ||
      !height ||
      !weight ||
      !exercise ||
      !drinks_alcohol ||
      !smoke ||
      !diabetes ||
      !cholesterol ||
      !asthma ||
      !family_cancer ||
      !heart_disease ||
      !occupation ||
      !allowance
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const db = getDB();

    // Check if profile already exists
    const [existing] = await db.query(
      "SELECT * FROM insurance_profile WHERE user_id = ?",
      [user_id]
    );

    if (existing.length > 0) {
      // Update if exists
      await db.query(
        `UPDATE insurance_profile SET gender=?, birth_date=?, height=?, weight=?, exercise=?, alcohol=?, 
         smoke=?, diabetes=?, cholesterol=?, asthma=?, fam_cancer=?, heart_disease=?, occupation=?, allowance=? WHERE user_id=?`,
        [
          gender,
          birth_date,
          height,
          weight,
          exercise,
          drinks_alcohol,
          smoke,
          diabetes,
          cholesterol,
          asthma,
          family_cancer,
          heart_disease,
          occupation,
          allowance,
          user_id,
        ]
      );
      return res.json({ message: "Profile updated successfully" });
    } else {
      // Insert if new
      await db.query(
        `INSERT INTO insurance_profile 
         (user_id, gender, birth_date, height, weight, exercise, alcohol, smoke, diabetes, cholesterol, asthma, fam_cancer, heart_disease, occupation, allowance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          gender,
          birth_date,
          height,
          weight,
          exercise,
          drinks_alcohol,
          smoke,
          diabetes,
          cholesterol,
          asthma,
          family_cancer,
          heart_disease,
          occupation,
          allowance,
        ]
      );
      return res.status(201).json({ message: "Profile created successfully" });
    }
  } catch (err) {
    console.error("Profile Save Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
