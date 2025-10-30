// import axios from "axios";

// const api = axios.create({
//   baseURL: "http://localhost:5000/api", 
// });

// export const fetchDashboardData = () => {
//   // Mock data structure, matching the image content
//   const data = {
//     income: 5000,
//     currency: 'RM',
//     breakdown: [
//       { name: 'Essentials', amount: 2500, color: '#ff7b8c' }, // Pink/Red
//       { name: 'Savings', amount: 1500, color: '#f8a9a8' },    // Light Pink/Orange
//       { name: 'Insurance', amount: 500, color: '#ffb9b6' },  // Pale Pink
//       { name: 'Other', amount: 500, color: '#c4e0b5' }       // Light Green
//     ],
//     savingsGoals: [
//       { id: 1, name: 'Vacations ✈', current: 200, target: 1000, deadline: '21st July, 2025' }
//     ],
//     expenses: [
//       { name: 'Tar Kopitiam', amount: 10.50 },
//       { name: 'Digi topup', amount: 30.00 },
//       { name: 'Shopee', amount: 20.50 },
//       { name: 'Milk tea', amount: 9.00 },
//     ]
//   };

//   // Simulate network delay
//   return new Promise(resolve => {
//     setTimeout(() => {
//       resolve(data);
//     }, 500);
//   });
// };

// export default api;

//-------------------------------------------------------------------------------------
// import axios from "axios";

// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
// });

// // GET /api/budget/dashboard?userId=123
// export async function fetchDashboardData() {
//   const userId = Number(localStorage.getItem("userId") || 0);
//   const { data } = await api.get("/budget/dashboard", { params: { userId } });
//   return data; // { income, currency, breakdown, savingsGoals, expenses }
// }

// export default api;
//-----------------------------------------------------------------------------------------------

// client/src/api/budgetAPI.js
import axios from "axios";

// ✅ Use your existing VITE_API_URL first (not VITE_API_BASE)
const ROOT = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

// This covers all APIs like /api/income, /api/budget, etc.
const API_BASE = `${ROOT}/api`;
const api = axios.create({ baseURL: API_BASE });
export default api;

// Budget-specific routes
const BUDGET_BASE = `${API_BASE}/budget`;

// GET /api/budget/dashboard?userId=...
export const getDashboard = (userId) =>
  axios.get(`${BUDGET_BASE}/dashboard`, { params: { userId } });

// POST /api/budget/rules/alerts
export const postAlerts = (payload) =>
  axios.post(`${BUDGET_BASE}/rules/alerts`, payload);

// POST /api/budget/rules/adjust-budgets
export const postAdjustBudgets = (payload) =>
  axios.post(`${BUDGET_BASE}/rules/adjust-budgets`, payload);

// Convenience helper for BudgetPlanner page
export async function fetchDashboardData() {
  const userId = Number(localStorage.getItem("userId"));
  if (!userId) throw new Error("Missing userId in localStorage");
  const { data } = await getDashboard(userId);
  return data;
}
