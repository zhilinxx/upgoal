// src/api/accountAPI.js
import { API } from "./auth";

// ✅ Get all accounts (with pagination + search + status filter)
export const getAllAccounts = async (search = "", status = "All", page = 1, limit = 10) => {
  return API.get("/accounts", {
    params: { search, status, page, limit },
  });
};

// ✅ Update user active/inactive
export const updateAccountStatus = async (userIds, status) => {
  return API.put("/accounts/status", { userIds, status });
};
