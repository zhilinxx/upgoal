import {
    getMonthlyExpenses,
    addExpense,
    editExpense,
    deleteExpenseById,
} from "../services/expensesService.js";

export const readMonthlyExpenses = async (req, res, next) => {
  try {
    const userId =
      req.user?.user_id || Number(req.query.userId || req.body.userId) || 4;

    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    const {
      month = currentMonth,          
      page = 1,
      pageSize = 10,
      search = "",
      category = "",
    } = req.query;

    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 10;

    const data = await getMonthlyExpenses({
      userId,
      month,
      page: pageNum,
      pageSize: pageSizeNum,
      search,
      category,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const createExpense = async (req, res, next) => {
    try {
        const userId = req.user?.user_id || Number(req.query.userId || req.body.userId);
        console.log("=== POST /api/expenses ===");
        console.log("Headers:", {
            "content-type": req.headers["content-type"],
            origin: req.headers.origin,
        });
        console.log("Resolved userId:", userId);
        console.log("Request body:", req.body);
        const r = await addExpense({ userId, payload: req.body });
        res.status(201).json({ message: "Expense created", ...r });
    } catch (e) {
        console.error("POST /api/expenses error:", e);
        next(e);
    }
};

export const updateExpense = async (req, res, next) => {
    try {
        const userId = req.user?.user_id || Number(req.query.userId || req.body.userId);
        const id = Number(req.params.expenseId);
        const r = await editExpense({ userId, id, payload: req.body });
        res.json({ message: "Expense updated", ...r });
    } catch (e) {
        next(e);
    }
};

export const removeExpense = async (req, res, next) => {
    try {
        const userId = req.user?.user_id || Number(req.query.userId || req.body.userId);
        const id = Number(req.params.expenseId);
        const r = await deleteExpenseById({ userId, id });
        res.json({ message: "Expense deleted", ...r });
    } catch (e) {
        next(e);
    }
};
