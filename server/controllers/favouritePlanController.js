import { getDB } from "../config/db.js";

// ✅ Get all favourites for a user
export const getFavourites = async (req, res) => {
  try {
    const { userId } = req.params;
    const db = getDB();

    const [rows] = await db.query(
      `SELECT f.plan_id, f.sum_assured, p.plan_name, p.provider, p.provider_logo, p.plan_type, p.premium
       FROM favourite_plan f
       JOIN insurance_plan p ON f.plan_id = p.plan_id
       WHERE f.user_id = ?`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Get favourites error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Add plan to favourites (with sum_assured)
export const addFavourite = async (req, res) => {
  try {
    const { userId, planId, sumAssured } = req.body;
    const db = getDB();

    await db.query(
      "INSERT INTO favourite_plan (user_id, plan_id, sum_assured) VALUES (?, ?, ?)",
      [userId, planId, sumAssured]
    );

    res.json({ success: true, message: "Added to favourites" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Already in favourites" });
    }
    console.error("Add favourite error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Remove favourite
export const removeFavourite = async (req, res) => {
  try {
    const { userId, planId } = req.body;
    const db = getDB();

    await db.query("DELETE FROM favourite_plan WHERE user_id = ? AND plan_id = ?", [userId, planId]);
    res.json({ success: true, message: "Removed from favourites" });
  } catch (err) {
    console.error("Remove favourite error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Remove multiple favourites
export const removeMultipleFavourites = async (req, res) => {
  try {
    const { userId, plans } = req.body; // plans = [{ plan_id, sum_assured }]
    const db = getDB();

    for (const { plan_id, sum_assured } of plans) {
      await db.query(
        "DELETE FROM favourite_plan WHERE user_id = ? AND plan_id = ? AND sum_assured = ?",
        [userId, plan_id, sum_assured]
      );
    }

    res.json({ success: true, message: "Selected favourites removed" });
  } catch (err) {
    console.error("Remove multiple favourites error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Check if a plan is favourite
export const checkFavourite = async (req, res) => {
  try {
    const { userId, planId } = req.params;
    const {sumAssured} = req.query;
    const db = getDB();

    const [rows] = await db.query(
      "SELECT * FROM favourite_plan WHERE user_id = ? AND plan_id = ? AND sum_assured = ?",
      [userId, planId, sumAssured]
    );

    res.json({ 
      isFavourite: rows.length > 0, 
      sumAssured: rows.length > 0 ? rows[0].sum_assured : null 
    });
  } catch (err) {
    console.error("Check favourite error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
