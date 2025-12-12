import { API } from "./auth";

function getUserId() {
    const id = Number(localStorage.getItem("userId"));
    if (!id) throw new Error("Missing userId in localStorage");
    return id;
}

export async function fetchMonthlyExpenses(params) {
    const userId = getUserId();
    const { data } = await API.get("/expenses", {
        params: { userId, ...params },
    });
    return data;
}

export const createExpense = (payload) => {
    const userId = getUserId();
    return API.post("/expenses", { userId, ...payload });
};

export const updateExpense = (id, payload) => {
    const userId = getUserId();
    return API.put(`/expenses/${id}`, { userId, ...payload });
};

export const deleteExpense = (id) => {
    const userId = getUserId();
    return API.delete(`/expenses/${id}`, { data: { userId } });
};
