import pool from '../config/db.js';

export async function upsertIncome(conn, { userId, netIncome, lifestyle }) {
  await conn.execute(
    `INSERT INTO income (user_id, net_income, lifestyle)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       net_income = VALUES(net_income),
       lifestyle  = VALUES(lifestyle)`,
    [userId, netIncome, lifestyle]
  );

  // Return the correct income_id
  const [rows] = await conn.execute(
    `SELECT income_id FROM income WHERE user_id = ? ORDER BY income_id DESC LIMIT 1`,
    [userId]
  );
  return rows[0]?.income_id;
}

export async function getLatestIncomeByUser(userId) {
  const [rows] = await pool.execute(
    `SELECT * FROM income
     WHERE user_id = ?
     ORDER BY income_id DESC
     LIMIT 1`,
    [Number(userId)]
  );
  return rows[0] || null;
}

export async function getCommitmentsByUser(userId) {
  const [rows] = await pool.execute(
    `SELECT commitment_id, commitment_type, commitment_amt
     FROM monthly_commitments
     WHERE user_id = ?
     ORDER BY commitment_id`,
    [Number(userId)]
  );
  return rows;
}

export async function deleteCommitmentsForUser(conn, userId) {
  await conn.execute(
    `DELETE FROM monthly_commitments WHERE user_id = ?`,
    [Number(userId)]
  );
}

export async function insertCommitments(conn, userId, items) {
  if (!items?.length) return;

  // Build a single multi-row INSERT with proper bindings
  const placeholders = items.map(() => '(?, ?, ?)').join(', ');
  const flat = items.flatMap(i => [
    Number(userId),
    String(i.type),
    Number(i.amount)
  ]);

  const sql = `
    INSERT INTO monthly_commitments (user_id, commitment_type, commitment_amt)
    VALUES ${placeholders}
  `;
  await conn.execute(sql, flat);
}

export default pool;
