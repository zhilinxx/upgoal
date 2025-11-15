// repositories/goalsRepository.js
import pool from "../config/db.js";

/* -------------------- helpers -------------------- */
const to2num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
};

// Always return a non-null string (handy if column is NOT NULL)
const trimOrEmpty = (s) => {
  if (s === undefined || s === null) return "";
  const t = String(s).trim();
  return t.length ? t : "";
};

// For DATE columns: keep as 'YYYY-MM-DD' (no time, no TZ)
const toDateOnly = (v) => {
  if (!v) return null;

  // If a real Date sneaks in, format it as local yyyy-mm-dd
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const s = String(v);
  // Strip timezone/time part if someone sent ISO like '2026-01-20T00:00:00.000Z'
  if (s.includes("T")) return s.split("T")[0];

  // Fallback: first 10 chars (yyyy-mm-dd)
  return s.slice(0, 10);
};


/* -------------------- queries -------------------- */

/**
 * List goals for a user.
 * NOTE: `deadline` is returned as 'YYYY-MM-DD' string to avoid TZ issues.
 */
export async function listGoalsRepo(userId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `
      SELECT
        goal_id                           AS id,
        goal_name                         AS name,
        goal_amt                          AS target,
        saved_amt                         AS current,
        DATE_FORMAT(due_date, '%Y-%m-%d') AS deadline,  -- ✅ plain string, no TZ
        description
      FROM savings_goals
      WHERE user_id = ?
      ORDER BY goal_id DESC
      `,
      [Number(userId)]
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      target: to2num(r.target),
      current: to2num(r.current),
      deadline: r.deadline,               // 'YYYY-MM-DD'
      description: r.description ?? null, // keep nulls for empty descriptions
    }));
  } finally {
    conn.release();
  }
}

/**
 * Create a goal and return a normalized row.
 */
export async function createGoalRepo({ userId, name, target, description, dueDate }) {
  const conn = await pool.getConnection();
  try {
    const goalName = String(name).trim();
    const goalAmt  = to2num(target);
    const desc     = trimOrEmpty(description);
    const deadline = toDateOnly(dueDate); // 'YYYY-MM-DD' for DATE column

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
      deadline,                // 'YYYY-MM-DD'
      description: desc || null,
    };
  } finally {
    conn.release();
  }
}

/**
 * Update a goal and return the updated row in normalized shape.
 * Reads it back with DATE_FORMAT to guarantee `deadline` is a string.
 */
export async function updateGoalRepo(id, { name, target, description, dueDate, saved }) {
  const conn = await pool.getConnection();
  try {
    const sets = [];
    const vals = [];

    if (name !== undefined)        { sets.push("goal_name = ?"); vals.push(String(name).trim()); }
    if (target !== undefined)      { sets.push("goal_amt = ?");  vals.push(to2num(target)); }
    if (saved !== undefined)       { sets.push("saved_amt = ?"); vals.push(to2num(saved)); }
    if (dueDate !== undefined)     { sets.push("due_date = ?");  vals.push(toDateOnly(dueDate)); }
    if (description !== undefined) { sets.push("description = ?"); vals.push(trimOrEmpty(description)); }

    if (sets.length) {
      vals.push(Number(id));
      await conn.query(`UPDATE savings_goals SET ${sets.join(", ")} WHERE goal_id = ?`, vals);
    }

    // Read back the row using DATE_FORMAT to avoid timezone surprises
    const [rows] = await conn.query(
      `
      SELECT
        goal_id                           AS id,
        goal_name                         AS name,
        goal_amt                          AS target,
        saved_amt                         AS current,
        DATE_FORMAT(due_date, '%Y-%m-%d') AS deadline,
        description
      FROM savings_goals
      WHERE goal_id = ?
      `,
      [Number(id)]
    );

    const row = rows?.[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      target: to2num(row.target),
      current: to2num(row.current),
      deadline: row.deadline,          // 'YYYY-MM-DD'
      description: row.description ?? null,
    };
  } finally {
    conn.release();
  }
}

/**
 * Delete a goal.
 */
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
