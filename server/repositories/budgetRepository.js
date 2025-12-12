import pool from "../config/db.js";

export async function getLatestIncome(userId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT income_id, net_income, lifestyle
       FROM income
       WHERE user_id = ?
       ORDER BY income_id DESC
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

export async function getMonthlyCommitments(userId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT commitment_type AS type, commitment_amt AS amount
       FROM monthly_commitments
       WHERE user_id = ?`,
      [userId]
    );
    return rows;
  } finally {
    conn.release();
  }
}

export async function getRecentExpenses(userId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT expenses_name AS name, ABS(expenses_amt) AS amount
       FROM expenses
       WHERE user_id = ?
         AND expenses_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       ORDER BY expenses_date DESC
       LIMIT 30`,
      [userId]
    );
    return rows;
  } finally {
    conn.release();
  }
}

export async function getSavingsGoals(userId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT
         goal_id AS id,
         goal_name AS name,
         saved_amt AS current,
         goal_amt AS target,
         DATE_FORMAT(due_date, '%Y-%m-%d') AS deadline
       FROM savings_goals
       WHERE user_id = ?
       ORDER BY goal_id DESC
       LIMIT 5`,
      [userId]
    );
    return rows;
  } finally {
    conn.release();
  }
}

export async function getOtherSpendThisMonth(userId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `
      SELECT
        COALESCE(SUM(ABS(expenses_amt)), 0) AS other_total
      FROM expenses
      WHERE user_id = ?
        AND UPPER(expenses_category) = 'OTHER'
        AND expenses_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND expenses_date <  DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
      `,
      [userId]
    );
    return Number(rows?.[0]?.other_total || 0);
  } finally {
    conn.release();
  }
}

export async function getOtherSpendLastMonth(userId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `
      SELECT
        COALESCE(SUM(ABS(expenses_amt)), 0) AS other_total
      FROM expenses
      WHERE user_id = ?
        AND UPPER(expenses_category) = 'OTHER'
        AND expenses_date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
        AND expenses_date <  DATE_FORMAT(CURDATE(), '%Y-%m-01')
      `,
      [userId]
    );
    return Number(rows?.[0]?.other_total || 0);
  } finally {
    conn.release();
  }
}
