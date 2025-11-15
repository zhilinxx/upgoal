// client/src/api/expensesAPI.js
import api from "./budgetAPI";

function getUserId() {
    const id = Number(localStorage.getItem("userId"));
    if (!id) throw new Error("Missing userId in localStorage");
    return id;
}

export async function fetchMonthlyExpenses(params) {
    const userId = getUserId();
    const { data } = await api.get("/expenses", {
        params: { userId, ...params },
    });
    // now returns { items, totalPages, categoryTotals, currency, otherThisMonth }
    return data;
}

export const createExpense = (payload) => {
    const userId = getUserId();
    return api.post("/expenses", { userId, ...payload });
};

export const updateExpense = (id, payload) => {
    const userId = getUserId();
    return api.put(`/expenses/${id}`, { userId, ...payload });
};

export const deleteExpense = (id) => {
    const userId = getUserId();
    return api.delete(`/expenses/${id}`, { data: { userId } });
};
