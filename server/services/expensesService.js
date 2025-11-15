// services/expensesService.js
import {
    countByFilters,
    listByFilters,
    totalsByCategory,
    insertExpense,
    updateExpenseById,
    deleteExpenseByIdRepo,
    getOtherSpendByRange, // ✅ new flexible version
} from "../repositories/expensesRepository.js";

/* ---------- helpers ---------- */
function monthRangeOrNull(yyyyMM) {
    if (!yyyyMM || yyyyMM === "all") return { start: null, end: null };
    const [y, m] = String(yyyyMM).split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { start: fmt(start), end: fmt(end) };
}
const to2 = (n) => Number.parseFloat(Number(n).toFixed(2));

/* ---------- main read ---------- */
export async function getMonthlyExpenses({
    userId,
    month,
    page = 1,
    pageSize = 10,
    search = "",
    category = "",
}) {
    const { start, end } = monthRangeOrNull(month);

    const p = Math.max(1, Number(page));
    const ps = Math.min(50, Math.max(5, Number(pageSize)));
    const offset = (p - 1) * ps;

    const baseFilters = { userId, start, end, search, category };

    const total = await countByFilters(baseFilters);
    const totalPages = Math.max(1, Math.ceil(total / ps));

    const items = await listByFilters({ ...baseFilters, limit: ps, offset });
    const startNo = total - offset;
    const itemsWithNo = items.map((r, i) => ({ ...r, rowNo: startNo - i }));

    const cats = await totalsByCategory(baseFilters);
    const categoryTotals = {};
    for (const c of cats) categoryTotals[c.name] = Number(c.total || 0);

    // get “Other” total for the selected month
    let otherThisMonth = 0;
    if (start && end) {
        otherThisMonth = await getOtherSpendByRange(userId, start, end);
    }

    return {
        items: itemsWithNo,
        totalPages,
        categoryTotals,
        currency: "RM",
        otherThisMonth, // <-- include so front-end can alert
    };
}

/* ---------- mutations ---------- */
export async function addExpense({ userId, payload }) {
    const name = String(payload.expenses_name || "").trim();
    const amount = to2(payload.expenses_amt ?? 0);
    const category = payload.expenses_category || "Other";
    const date = payload.expenses_date;
    if (!name) throw new Error("Missing expense name");
    if (!(amount >= 0)) throw new Error("Invalid amount");
    if (!date) throw new Error("Missing date");
    const id = await insertExpense({ userId, name, amount, category, date });
    return { expenses_id: id };
}

export async function editExpense({ userId, id, payload }) {
    const name = String(payload.expenses_name || "").trim();
    const amount = to2(payload.expenses_amt ?? 0);
    const category = payload.expenses_category || "Other";
    const date = payload.expenses_date;
    if (!id) throw new Error("Missing expense id");
    if (!name) throw new Error("Missing expense name");
    if (!(amount >= 0)) throw new Error("Invalid amount");
    if (!date) throw new Error("Missing date");
    const ok = await updateExpenseById({ id, userId, name, amount, category, date });
    if (!ok) throw new Error("Expense not found or not owned by user");
    return { expenses_id: id };
}

export async function deleteExpenseById({ userId, id }) {
    if (!id) throw new Error("Missing expense id");
    const ok = await deleteExpenseByIdRepo({ id, userId });
    if (!ok) throw new Error("Expense not found or not owned by user");
    return { deleted: true };
}
