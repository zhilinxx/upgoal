// server/repositories/incomeRepository.js
import pool from '../config/db.js';

/** Insert one income row; returns new income_id */
export async function insertIncome(conn, { userId, netIncome, lifestyle }) {
  const sql = `
    INSERT INTO income (user_id, net_income, lifestyle)
    VALUES (?, ?, ?)
  `;
  const params = [userId, netIncome, lifestyle];
  const [r] = await conn.execute(sql, params);
  return r.insertId;
}

export async function updateIncomeById(conn, incomeId, { netIncome, lifestyle }) {
  await conn.execute(
    `UPDATE income SET net_income = ?, lifestyle = ? WHERE income_id = ?`,
    [netIncome, lifestyle, incomeId]
  );
}

/** Get latest income row for a user (highest income_id) */
export async function getLatestIncomeByUser(userId) {
  const [rows] = await pool.execute(
    `SELECT * FROM income
     WHERE user_id = ?
     ORDER BY income_id DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

/** Get all commitments for a user */
export async function getCommitmentsByUser(userId) {
  const [rows] = await pool.execute(
    `SELECT commitment_id, commitment_type, commitment_amt
     FROM monthly_commitments
     WHERE user_id = ?
     ORDER BY commitment_id`,
    [userId]
  );
  return rows;
}

/** DELETE all commitments for a user (replace strategy) */
export async function deleteCommitmentsForUser(conn, userId) {
  await conn.execute(`DELETE FROM monthly_commitments WHERE user_id = ?`, [userId]);
}

/** BULK INSERT commitments for a user (explicit placeholders; no hard-coding) */
export async function insertCommitments(conn, userId, items) {
  if (!items?.length) return;

  // items: [{ type, amount }, ...]
  const placeholders = items.map(() => '(?, ?, ?)').join(', ');
  const flat = items.flatMap(i => [userId, String(i.type), Number(i.amount)]);

  const sql = `
    INSERT INTO monthly_commitments (user_id, commitment_type, commitment_amt)
    VALUES ${placeholders}
  `;
  await conn.execute(sql, flat);
}

export default pool;
