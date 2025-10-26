import { getDB } from "../config/db.js";
import axios from "axios";

// ✅ Utility to calculate age
function calculateAge(birth_date) {
  const diff = Date.now() - new Date(birth_date).getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

// ✅ Utility for payment rule-based suggestion
function getPaymentSuggestion(age, allowance) {
  if (age >= 18 && allowance < 4000)
    return "Flat rate and lower premium until coverage term";
  if (age >= 18 && allowance >= 4000)
    return "Flat rate but higher payment for a short term";
  if (age < 30 && allowance < 4000)
    return "Increase with age growth";
  if (age >= 35 && allowance >= 5000)
    return "Start with higher premium and lower after certain age";
  return "Standard payment structure";
}

function mapFrequency(value) {
  switch (value) {
    case "Never": return 0;
    case "Rarely": return 1;
    case "Sometimes": return 2;
    case "Often": return 3;
    default: return 0;
  }
}

function mapOccupation(value){
  switch (value) {
    case "Unemployed" || "Low Risk e.g.Office Worker/Techer/Government": return 1;
    case "Moderate Risk e.g.Driver/Security Guard/Chef": return 2;
    case "High Risk e.g.Manual,Industrial Worker/Police/Army": return 3;
    default: return 0;
  }
}

export const saveInsuranceProfile = async (req, res) => {
  try {
    const {
      user_id,
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

    if (
      !user_id ||
      !gender ||
      !birth_date ||
      !height ||
      !weight ||
      !exercise ||
      !alcohol ||
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
    const age = calculateAge(birth_date);
    const bmi = (weight / ((height / 100) ** 2)).toFixed(2);

    // Check if profile exists
    const [existing] = await db.query(
      "SELECT * FROM insurance_profile WHERE user_id = ?",
      [user_id]
    );

    // ✅ Save or update profile
    if (existing.length > 0) {
      await db.query(
        `UPDATE insurance_profile SET gender=?, birth_date=?, height=?, weight=?, exercise=?, alcohol=?, 
         smoke=?, diabetes=?, cholesterol=?, asthma=?, fam_cancer=?, heart_disease=?, occupation=?, allowance=? 
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
          user_id,
        ]
      );
    } else {
      await db.query(
        `INSERT INTO insurance_profile 
         (user_id, gender, birth_date, height, weight, exercise, alcohol, smoke, diabetes, cholesterol, asthma, fam_cancer, heart_disease, occupation, allowance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
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
        ]
      );
    }

    // ✅ Call AI model for risk level
    let risk_level = "Low"; // default
    try {
      const aiRes = await axios.post("http://localhost:5001/api/predict_risk", {
        gender,
        age,
        cholesterol,
        occupation: mapOccupation(occupation),
        bmi: parseFloat(bmi),
        smoke,
        diabetes,
        heart_disease,
        asthma,
        alcohol: mapFrequency(alcohol),
        exercise: mapFrequency(exercise),
        family_cancer,
      });
      risk_level = aiRes.data.risk_level || "Low";
    } catch (err) {
      console.error("AI model connection failed:", err.message);
    }

    // ✅ Apply rule-based payment suggestion
    const payment_suggestion = getPaymentSuggestion(age, allowance);

    // ✅ Save risk & payment suggestion
    await db.query(
      "UPDATE insurance_profile SET risk_level=?, payment_suggestion=? WHERE user_id=?",
      [risk_level, payment_suggestion, user_id]
    );

    res.status(200).json({
      message: "Profile saved successfully",
      risk_level,
      payment_suggestion,
    });
  } catch (err) {
    console.error("Profile Save Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
