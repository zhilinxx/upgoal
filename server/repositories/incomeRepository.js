import pool from '../config/db.js';

export async function upsertIncome(conn, { userId, netIncome, lifestyle }) {
  await conn.execute(
    `INSERT INTO income (user_id, net_income, lifestyle)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       net_income = VALUES(net_income),
       lifestyle  = VALUES(lifestyle)`,
    [Number(userId), Number(netIncome), String(lifestyle)]
  );

  const [rows] = await conn.execute(
    `SELECT income_id FROM income WHERE user_id = ? ORDER BY income_id DESC LIMIT 1`,
    [Number(userId)]
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
  if (!Array.isArray(items) || !items.length) return;

  // Normalize and validate
  const cleaned = items
    .map((i, idx) => ({
      type: String(i.type ?? i.name),
      amount: Number(i.amount),
    }))
    .filter(i => i.type.trim().length > 0 && Number.isFinite(i.amount) && i.amount > 0);

  if (!cleaned.length) return;

  const placeholders = cleaned.map(() => '(?, ?, ?)').join(', ');
  const params = cleaned.flatMap(i => [Number(userId), i.type.trim(), i.amount]);

  const sql = `
    INSERT INTO monthly_commitments (user_id, commitment_type, commitment_amt)
    VALUES ${placeholders}
  `;

  await conn.execute(sql, params);
}

export default pool;
