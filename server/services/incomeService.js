import pool from "../config/db.js";
import {
  upsertIncome,
  deleteCommitmentsForUser,
  insertCommitments,
  getLatestIncomeByUser,
  getCommitmentsByUser,
} from "../repositories/incomeRepository.js";

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// Convert DTO -> [{type, amount}]
function buildCommitmentRows(dto) {
  const housingLoan = num(dto.commitments?.housingLoan);
  const carLoan     = num(dto.commitments?.carLoan);
  const othersRaw   = Array.isArray(dto.commitments?.other) ? dto.commitments.other : [];

  const rows = [];
  if (housingLoan > 0) rows.push({ type: "Housing Loan", amount: housingLoan });
  if (carLoan > 0)     rows.push({ type: "Car Loan", amount: carLoan });

  // Accept both { name, amount } and legacy number values
  othersRaw.forEach((o, i) => {
    if (typeof o === "number") {
      const amt = num(o);
      if (amt > 0) rows.push({ type: `Other ${i + 1}`, amount: amt });
      return;
    }
    const label = (o?.name || `Other ${i + 1}`).trim();
    const amt   = num(o?.amount);
    if (label && amt > 0) rows.push({ type: label, amount: amt });
  });

  return rows;
}

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

    const incomeId = await upsertIncome(conn, incomePayload);
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

export async function editIncomeSetup(dto) {
  const userId = Number(dto.userId ?? 0);
  if (!userId) throw new Error("userId is required");

  const base = {
    userId,
    netIncome: num(dto.netIncome),
    lifestyle: dto.lifestyle || "None",
  };
  const commitmentRows = buildCommitmentRows(dto);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Upsert 1 income row per user (UNIQUE(user_id))
    const incomeId = await upsertIncome(conn, base);

    // Replace commitments fully
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

export async function getIncomeSetup(userId) {
  const uid = Number(userId ?? 0);
  if (!uid) throw new Error("userId is required");

  const income = await getLatestIncomeByUser(uid);
  const commits = await getCommitmentsByUser(uid);

  let housingLoan = 0;
  let carLoan = 0;
  const others = [];

  for (const c of commits) {
    const t = (c.commitment_type || "").toLowerCase();
    if (t.includes("housing")) housingLoan = Number(c.commitment_amt || c.commitment_amount || 0);
    else if (t.includes("car")) carLoan = Number(c.commitment_amt || c.commitment_amount || 0);
    else others.push(Number(c.commitment_amt || c.commitment_amount || 0));
  }

  return {
    userId: uid,
    incomeId: income ? income.income_id : null,
    netIncome: income ? Number(income.net_income) : 0,
    lifestyle: income ? income.lifestyle : "None",
    commitments: { housingLoan, carLoan, other: others },
  };
}
