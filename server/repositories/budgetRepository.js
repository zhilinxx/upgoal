// server/repositories/budgetRepository.js
import pool from "../config/db.js";

/**
 * Latest income row for a user (net_income + lifestyle).
 */
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

/**
 * Monthly commitments (typed + amount).
 */
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

/**
 * Recent expenses in the last 30 days (name + ABS(amount)).
 */
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

/**
 * Savings goals for the dashboard.
 * ✅ Force deadline to plain 'YYYY-MM-DD' to avoid timezone shifts in UI.
 */
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

/**
 * This calendar month's total spending in the "Other" category.
 */
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

/**
 * Last calendar month's total spending in the "Other" category.
 * Returns a number (0 if none).
 *
 * For example, if today is 2025-12-02, this will sum "Other" for 2025-11-01 .. 2025-12-01 (exclusive).
 */
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
