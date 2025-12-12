import pool from "../config/db.js";

const to2num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
};

const trimOrEmpty = (s) => {
  if (s === undefined || s === null) return "";
  const t = String(s).trim();
  return t.length ? t : "";
};

const toDateOnly = (v) => {
  if (!v) return null;

  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const s = String(v);
  if (s.includes("T")) return s.split("T")[0];

  return s.slice(0, 10);
};

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
        DATE_FORMAT(due_date, '%Y-%m-%d') AS deadline,  
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
      deadline: r.deadline,               
      description: r.description ?? null, 
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
    const desc     = trimOrEmpty(description);
    const deadline = toDateOnly(dueDate); 

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
      description: desc || null,
    };
  } finally {
    conn.release();
  }
}

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
      deadline: row.deadline,          
      description: row.description ?? null,
    };
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
