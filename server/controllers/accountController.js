// controllers/accountController.js
import { getDB } from "../config/db.js";

// ✅ Get all users (with pagination + search + status filter)
export const getAllUsers = async (req, res) => {
  try {
    const { search = "", status = "All", page = 1, limit = 10 } = req.query;
    const db = getDB();

    const offset = (page - 1) * limit;

    let baseQuery = "FROM user WHERE 1=1";
    const params = [];

    if (search) {
      baseQuery += " AND (user_id LIKE ? OR email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // ✅ Convert "Active"/"Inactive" → numeric 1/0
    if (status === "Active") {
      baseQuery += " AND status = 1";
    } else if (status === "Inactive") {
      baseQuery += " AND status = 0";
    }

    // Get total count
    const [countRows] = await db.query(`SELECT COUNT(*) AS total ${baseQuery}`, params);
    const totalRecords = countRows[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // Get paginated users
    const [users] = await db.query(
      `SELECT user_id, email, status ${baseQuery} ORDER BY user_id ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // ✅ Convert numeric status → readable string
    const formattedUsers = users.map((u) => ({
      ...u,
      status: u.status === 1 ? "Active" : "Inactive",
    }));

    // ✅ Return formatted users
    res.json({
      users: formattedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords,
      },
    });
  } catch (err) {
    console.error("❌ getAllUsers Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update user status (Activate / Deactivate)
export const updateUserStatus = async (req, res) => {
  try {
    const { userIds, status } = req.body;
    if (!userIds?.length || !status)
      return res.status(400).json({ message: "Invalid data" });

    const db = getDB();

    // Convert "Active"/"Inactive" → numeric 1/0
    const newStatus = status === "Active" ? 1 : 0;

    const [result] = await db.query(
      "UPDATE user SET status = ? WHERE user_id IN (?)",
      [newStatus, userIds]
    );

    res.json({ message: `Updated ${result.affectedRows} user(s)` });
  } catch (err) {
    console.error("❌ updateUserStatus Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
