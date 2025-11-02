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
    params: { userId, ...params },   // <-- include userId in query
  });
  return data; // { items, totalPages, categoryTotals, currency }
}

export const createExpense = (payload) => {
  const userId = getUserId();
  return api.post("/expenses", { userId, ...payload }); // <-- include userId in body
};

export const updateExpense = (id, payload) => {
  const userId = getUserId();
  return api.put(`/expenses/${id}`, { userId, ...payload }); // <-- include userId in body
};

export const deleteExpense = (id) => {
  const userId = getUserId();
  // axios.delete must pass body as { data: ... }
  return api.delete(`/expenses/${id}`, { data: { userId } }); // <-- include userId in body
};
