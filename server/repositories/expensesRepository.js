import pool from "../config/db.js";

function buildWhere({ userId, start, end, search, category }) {
  const where = ["user_id = ?"];
  const args = [userId];

  if (start) { where.push("expenses_date >= ?"); args.push(start); }
  if (end)   { where.push("expenses_date < ?");  args.push(end); }

  if (search)   { where.push("expenses_name LIKE ?"); args.push(`%${search}%`); }
  if (category) { where.push("expenses_category = ?"); args.push(category); }

  return { where: where.join(" AND "), args };
}

export async function countByFilters({ userId, start, end, search, category }) {
  const { where, args } = buildWhere({ userId, start, end, search, category });
  const sql = `SELECT COUNT(*) AS cnt FROM expenses WHERE ${where}`;
  const [[row]] = await pool.query(sql, args);
  return Number(row.cnt || 0);
}

export async function listByFilters({ userId, start, end, search, category, limit, offset }) {
  const { where, args } = buildWhere({ userId, start, end, search, category });
  const sql = `
    SELECT expenses_id, expenses_name, expenses_amt, expenses_category,
           DATE_FORMAT(expenses_date, '%Y-%m-%d') AS expenses_date
    FROM expenses
    WHERE ${where}
    ORDER BY expenses_date DESC, expenses_id DESC
    LIMIT ? OFFSET ?`;
  const [rows] = await pool.query(sql, [...args, limit, offset]);
  return rows;
}

export async function totalsByCategory({ userId, start, end, search, category }) {
  const { where, args } = buildWhere({ userId, start, end, search, category });
  const sql = `
    SELECT expenses_category AS name, SUM(expenses_amt) AS total
    FROM expenses
    WHERE ${where}
    GROUP BY expenses_category`;
  const [rows] = await pool.query(sql, args);
  return rows;
}

export async function findById(id) {
  const sql = `
    SELECT expenses_id, user_id, expenses_name, expenses_amt, expenses_category,
           DATE_FORMAT(expenses_date, '%Y-%m-%d') AS expenses_date
    FROM expenses WHERE expenses_id = ?`;
  const [rows] = await pool.query(sql, [id]);
  return rows[0] || null;
}

export async function insertExpense({ userId, name, amount, category, date }) {
  const sql = `
    INSERT INTO expenses (user_id, expenses_name, expenses_amt, expenses_category, expenses_date)
    VALUES (?, ?, ?, ?, ?)`;
  const [res] = await pool.query(sql, [userId, name, amount, category, date]);
  return res.insertId;
}

export async function updateExpenseById({ id, userId, name, amount, category, date }) {
  const sql = `
    UPDATE expenses
    SET expenses_name = ?, expenses_amt = ?, expenses_category = ?, expenses_date = ?
    WHERE expenses_id = ? AND user_id = ?`;
  const [res] = await pool.query(sql, [name, amount, category, date, id, userId]);
  return res.affectedRows > 0;
}

export async function deleteExpenseByIdRepo({ id, userId }) {
  const sql = `DELETE FROM expenses WHERE expenses_id = ? AND user_id = ?`;
  const [res] = await pool.query(sql, [id, userId]);
  return res.affectedRows > 0;
}
