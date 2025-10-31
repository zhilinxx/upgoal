// repositories/goalsRepository.js
import pool from "../config/db.js";

/* -------- helpers -------- */
const to2num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
};

// Always returns a string, never null (safe if column is NOT NULL)
const trimOrEmpty = (s) => {
  if (s === undefined || s === null) return "";
  const t = String(s).trim();
  return t.length ? t : "";
};

// If your due_date is DATE, keep YYYY-MM-DD
const toDateOnly = (v) => {
  if (!v) return null;
  return String(v).slice(0, 10);
};

/* -------- queries -------- */

export async function listGoalsRepo(userId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT
         goal_id   AS id,
         goal_name AS name,
         goal_amt  AS target,
         saved_amt AS current,
         due_date  AS deadline,
         description
       FROM savings_goals
       WHERE user_id = ?
       ORDER BY goal_id DESC`,
      [Number(userId)]
    );

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      target: to2num(r.target),
      current: to2num(r.current),
      deadline: r.deadline,               // DATE from DB; keep as-is
      description: r.description ?? null, // expose null to UI if empty string stored
    }));
  } finally {
    conn.release();
  }
}

export async function createGoalRepo({ userId, name, target, description, dueDate }) {
  const conn = await pool.getConnection();
  try {
    const goalName = String(name).trim();
    const goalAmt  = to2num(target);
    const desc     = trimOrEmpty(description); // <-- never null
    const deadline = toDateOnly(dueDate);      // <-- 'YYYY-MM-DD' for DATE column

    const [r] = await conn.query(
      `INSERT INTO savings_goals
        (user_id, goal_name, goal_amt, saved_amt, description, due_date)
       VALUES (?, ?, ?, 0.00, ?, ?)`,
      [Number(userId), goalName, goalAmt, desc, deadline]
    );

    return {
      id: r.insertId,
      name: goalName,
      target: goalAmt,
      current: 0,
      deadline,
      description: desc || null, // UI sees null if empty
    };
  } finally {
    conn.release();
  }
}

export async function updateGoalRepo(id, { name, target, description, dueDate, saved }) {
  const conn = await pool.getConnection();
  try {
    const sets = [], vals = [];

    if (name !== undefined)  { sets.push("goal_name = ?"); vals.push(String(name).trim()); }
    if (target !== undefined){ sets.push("goal_amt = ?");  vals.push(to2num(target)); }
    if (saved !== undefined) { sets.push("saved_amt = ?"); vals.push(to2num(saved)); }
    if (dueDate !== undefined){sets.push("due_date = ?");  vals.push(toDateOnly(dueDate)); }
    if (description !== undefined) {
      sets.push("description = ?");
      vals.push(trimOrEmpty(description)); // <-- never null (safe for NOT NULL)
    }

    if (!sets.length) return;
    vals.push(Number(id));
    await conn.query(`UPDATE savings_goals SET ${sets.join(", ")} WHERE goal_id = ?`, vals);
  } finally {
    conn.release();
  }
}

export async function deleteGoalRepo(id, userId) {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `DELETE FROM savings_goals WHERE goal_id = ? AND user_id = ?`,
      [Number(id), Number(userId)]
    );
  } finally {
    conn.release();
  }
}
