import pool from "../config/db.js";
import {
  insertIncome,
  updateIncomeById,
  deleteCommitmentsForUser,
  insertCommitments,
  getLatestIncomeByUser,
  getCommitmentsByUser,
} from "../repositories/incomeRepository.js";

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/** Map DTO -> commitment rows for monthly_commitments */
function buildCommitmentRows(dto) {
  const housingLoan = num(dto.commitments?.housingLoan);
  const carLoan = num(dto.commitments?.carLoan);
  const others = Array.isArray(dto.commitments?.other)
    ? dto.commitments.other.map(num).filter((x) => x > 0)
    : [];

  const rows = [];
  if (housingLoan > 0) rows.push({ type: "Housing Loan", amount: housingLoan });
  if (carLoan > 0) rows.push({ type: "Car Loan", amount: carLoan });
  others.forEach((amt, i) => rows.push({ type: `Other ${i + 1}`, amount: amt }));
  return rows;
}

/** CREATE: insert income + replace commitments (transaction) */
export async function createIncomeWithCommitments(dto) {
  const userId = Number(dto?.session?.user?.id ?? dto.userId ?? 0);
  if (!userId) throw new Error("userId is required");

  const incomePayload = {
    userId,
    netIncome: num(dto.netIncome),
    lifestyle: dto.lifestyle || "None",
  };
  const commitmentRows = buildCommitmentRows(dto);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const incomeId = await insertIncome(conn, incomePayload);
    await deleteCommitmentsForUser(conn, userId);
    await insertCommitments(conn, userId, commitmentRows);

    await conn.commit();
    return { incomeId, commitmentsInserted: commitmentRows.length };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/**
 * EDIT: update an existing income row (by latest or provided id)
 * and replace commitments (transaction).
 * Pass dto.incomeId if you want to edit a specific row; otherwise it edits latest.
 */
export async function editIncomeSetup(dto) {
  const userId = Number(dto.userId ?? 1);
  if (!userId) throw new Error("userId is required");

  const base = {
    netIncome: num(dto.netIncome),
    lifestyle: dto.lifestyle || "None",
  };
  const commitmentRows = buildCommitmentRows(dto);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let incomeId = dto.incomeId ? Number(dto.incomeId) : null;
    if (!incomeId) {
      const latest = await getLatestIncomeByUser(userId);
      if (!latest) throw new Error("No income row to update");
      incomeId = latest.income_id;
    }

    await updateIncomeById(conn, incomeId, base);

    await deleteCommitmentsForUser(conn, userId);
    await insertCommitments(conn, userId, commitmentRows);

    await conn.commit();
    return { incomeId, commitmentsReplaced: commitmentRows.length };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/** READ: return latest income + commitments in the same shape your form uses */
export async function getIncomeSetup(userId) {
  const uid = Number(userId ?? 1);
  if (!uid) throw new Error("userId is required");

  const income = await getLatestIncomeByUser(uid);
  const commits = await getCommitmentsByUser(uid);

  // Map monthly_commitments rows back into your UI fields
  let housingLoan = 0;
  let carLoan = 0;
  const others = [];

  for (const c of commits) {
    const t = (c.commitment_type || "").toLowerCase();
    if (t.includes("housing")) housingLoan = Number(c.commitment_amt || 0);
    else if (t.includes("car")) carLoan = Number(c.commitment_amt || 0);
    else others.push(Number(c.commitment_amt || 0));
  }

  return {
    userId: uid,
    netIncome: income ? Number(income.net_income) : 0,
    lifestyle: income ? income.lifestyle : "None",
    commitments: {
      housingLoan,
      carLoan,
      other: others,
    },
  };
}
