import { getDB } from "../config/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadBase = path.join(process.cwd(), "src", "uploads");
const brochureDir = path.join(uploadBase, "insuranceBrochures");
const logoDir = path.join(uploadBase, "providerLogo");

[uploadBase, brochureDir, logoDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const fileName = (name) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "_")          // replace spaces
    .replace(/[^a-z0-9_.-]/g, ""); // remove special chars


// Configure multer for two different destinations
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "src/uploads/others";

    if (file.fieldname === "logo") {
      folder = "src/uploads/providerLogo";
    } else if (file.fieldname === "brochure") {
      folder = "src/uploads/insuranceBrochures";
    }

    // ✅ Ensure directory exists
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    let baseName = "file"; // fallback

    if (file.fieldname === "logo" && req.body.provider) {
      baseName = fileName(req.body.provider);
    } else if (file.fieldname === "brochure" && req.body.plan_name) {
      baseName = fileName(req.body.plan_name);
    }

    const ext = path.extname(file.originalname);
    cb(null, `${baseName}${ext}`);
  },
});

export const upload = multer({ storage });

// ✅ Get all plans
export const getAllPlans = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10, sort = "plan_id", type = "All" } = req.query;
    const db = getDB();
    const offset = (page - 1) * limit;

    let baseQuery = "FROM insurance_plan WHERE 1=1";
    const params = [];

    // 🔍 Search by plan_id, plan_name, or provider
    if (search) {
      baseQuery += " AND (plan_id LIKE ? OR plan_name LIKE ? OR provider LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // 🧩 Filter by plan_type if not All
    if (type && type !== "All") {
      baseQuery += " AND plan_type = ?";
      params.push(type);
    }

    // 📊 Count total records
    const [countRows] = await db.query(`SELECT COUNT(*) AS total ${baseQuery}`, params);
    const totalRecords = countRows[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // 📋 Fetch plans
    const [plans] = await db.query(
      `SELECT plan_id, plan_name, provider, plan_type, premium, brochure_path, provider_logo, provider_phone, provider_email,
              sum_assured, coverage_age, coverage_scope, annual_limit, lifetime_limit, hp_room_board, payment_structure
       ${baseQuery}
       ORDER BY CAST(${sort} AS UNSIGNED) ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      plans,
      pagination: { currentPage: parseInt(page), totalPages, totalRecords },
    });
  } catch (err) {
    console.error("❌ getAllPlans Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



export const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const [rows] = await db.query("SELECT * FROM insurance_plan WHERE plan_id = ?", [id]);

    if (rows.length === 0)
      return res.status(404).json({ message: "Plan not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ getPlanById Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Add new plan
export const addPlan = async (req, res) => {
  try {
    const {
      plan_name,
      plan_type,
      provider,
      provider_phone,
      provider_email,
      premium,
      payment_structure,
      sum_assured,
      coverage_age,
      coverage_scope,
      annual_limit,
      lifetime_limit,
      hp_room_board,
    } = req.body;

    const logoPath = req.files?.logo?.[0]
      ? `uploads/providerLogo/${req.files.logo[0].filename}`
      : null;
    const brochurePath = req.files?.brochure?.[0]
      ? `uploads/insuranceBrochures/${req.files.brochure[0].filename}`
      : null;

    const db = getDB();
    await db.query(
      `INSERT INTO insurance_plan 
      (plan_name, plan_type, provider, provider_logo, provider_phone, provider_email, premium, payment_structure, brochure_path, 
       sum_assured, coverage_age, coverage_scope, annual_limit, lifetime_limit, hp_room_board)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        plan_name, plan_type, provider, logoPath, provider_phone, provider_email,
        premium, payment_structure, brochurePath,
        sum_assured || null, coverage_age || null, coverage_scope || null,
        annual_limit || null, lifetime_limit || null, hp_room_board || null,
      ]
    );

    res.json({ message: "Insurance plan added successfully" });
  } catch (err) {
    console.error("❌ addPlan Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update plan
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      plan_name,
      plan_type,
      provider,
      provider_phone,
      provider_email,
      premium,
      payment_structure,
      sum_assured,
      coverage_age,
      coverage_scope,
      annual_limit,
      lifetime_limit,
      hp_room_board,
    } = req.body;

    const logoPath = req.files?.logo?.[0]
      ? `uploads/providerLogo/${req.files.logo[0].filename}`
      : null;
    const brochurePath = req.files?.brochure?.[0]
      ? `uploads/insuranceBrochures/${req.files.brochure[0].filename}`
      : null;

    const db = getDB();
    await db.query(
      `UPDATE insurance_plan SET
        plan_name=?, plan_type=?, provider=?, provider_phone=?, provider_email=?, premium=?, payment_structure=?,
        sum_assured=?, coverage_age=?, coverage_scope=?, annual_limit=?, lifetime_limit=?, hp_room_board=?,
        provider_logo=COALESCE(?, provider_logo), brochure_path=COALESCE(?, brochure_path)
      WHERE plan_id=?`,
      [
        plan_name, plan_type, provider, provider_phone, provider_email, premium, payment_structure,
        sum_assured || null, coverage_age || null, coverage_scope || null,
        annual_limit || null, lifetime_limit || null, hp_room_board || null,
        logoPath, brochurePath, id,
      ]
    );

    res.json({ message: "Plan updated successfully" });
  } catch (err) {
    console.error("❌ updatePlan Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete selected plans
export const deletePlans = async (req, res) => {
  try {
    const { planIds } = req.body;
    if (!planIds?.length) return res.status(400).json({ message: "No plan IDs provided" });

    const db = getDB();
    await db.query("DELETE FROM insurance_plan WHERE plan_id IN (?)", [planIds]);

    res.json({ message: "Plans deleted successfully" });
  } catch (err) {
    console.error("❌ deletePlans Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
