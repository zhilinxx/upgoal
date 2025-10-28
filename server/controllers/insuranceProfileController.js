import { getDB } from "../config/db.js";
import axios from "axios";

// ✅ Utility to calculate age
function calculateAge(birth_date) {
  const diff = Date.now() - new Date(birth_date).getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

function mapGender(value) {
  if (value.toLowerCase() === "male") return "M";
  if (value.toLowerCase() === "female") return "F";
}

function mapYesNo(value) {
  if (typeof value === "string") {
    return value.toLowerCase() === "yes" ? 1 : 0;
  }
  return value ? 1 : 0;
}

// ✅ Utility for payment rule-based suggestion
function getPaymentSuggestion(age, allowance) {
  if (age < 30) {
    if (allowance < 4000) {
      return "Flat rate low premium and increase with age growth";
    } else {
      return "Flat rate but higher premium for a short term";
    }
  }

  // Age 30–34
  if (age < 35) {
    if (allowance < 4000) {
      return "Flat rate and lower premium until coverage term";
    } else {
      return "Flat rate but higher premium for a short term";
    }
  }

  // Age ≥ 35
  if (age >= 35) {
    if (allowance >= 5000) {
      return "High premium but lower after certain age";
    } else if (allowance < 4000) {
      return "Flat rate and low premium until coverage term";
    } else {
      return "Flat rate but high premium for a short term";
    }
  }

  // Default fallback
  return "Flat rate and lower premium until coverage term";
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

function mapOccupationDB(value) {
  switch (value) {
    case "Unemployed": return 0;
    case "Low Risk e.g.Office Worker/Techer/Government": return 1;
    case "Moderate Risk e.g.Driver/Security Guard/Chef": return 2;
    case "High Risk e.g.Manual,Industrial Worker/Police/Army": return 3;
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
    const user_id = req.user?.user_id || req.body.user_id;

    const db = getDB();
    const age = calculateAge(birth_date);
    const bmi = (weight / ((height / 100) ** 2)).toFixed(2);
    const parsedHeight = parseFloat(height);
    const parsedWeight = parseFloat(weight);
    const parsedAllowance = parseFloat(allowance);
    const today = new Date();

    if (birth_date > today || age < 18 || age > 70) {
      return res.status(400).json({ message: "Invalid birth date (must be 18–70 years old)" });
    }

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
          mapGender(gender),
          birth_date,
          parsedHeight.toFixed(2),
          parsedWeight.toFixed(2),
          mapFrequency(exercise),
          mapFrequency(alcohol),
          mapYesNo(smoke),
          mapYesNo(diabetes),
          cholesterol,
          mapYesNo(asthma),
          mapYesNo(family_cancer),
          mapYesNo(heart_disease),
          mapOccupationDB(occupation),
          parsedAllowance.toFixed(2),
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
          mapGender(gender),
          birth_date,
          parsedHeight.toFixed(2),
          parsedWeight.toFixed(2),
          mapFrequency(exercise),
          mapFrequency(alcohol),
          mapYesNo(smoke),
          mapYesNo(diabetes),
          cholesterol,
          mapYesNo(asthma),
          mapYesNo(family_cancer),
          mapYesNo(heart_disease),
          mapOccupationDB(occupation),
          parsedAllowance.toFixed(2),
        ]
      );
    }

    // ✅ Call AI model for risk level
    let risk_level = "Low"; // default
    try {
      const aiRes = await axios.post("http://localhost:5001/api/predict_risk", {
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
      message: "Insurance Profile saved successfully",
      risk_level,
      payment_suggestion,
    });
  } catch (err) {
    console.error("Profile Save Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getInsuranceProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "User ID required" });

    const db = getDB();
    const [rows] = await db.query(
      "SELECT * FROM insurance_profile WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.json({}); // frontend will treat this as “no data yet”
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ getInsuranceProfile Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
