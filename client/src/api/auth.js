// client/src/api/auth.js
import axios from "axios";

export const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true, // send cookies (refreshToken)
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers["Authorization"] = "Bearer " + token;
  }
  return config;
});


API.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers["Authorization"] = "Bearer " + token;
          return API(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await API.post("/auth/refresh");
        const newToken = res.data.accessToken;
        localStorage.setItem("accessToken", newToken);
        API.defaults.headers.common["Authorization"] = "Bearer " + newToken;
        processQueue(null, newToken);
        isRefreshing = false;

        original.headers["Authorization"] = "Bearer " + newToken;
        return API(original);

      } catch (e) {
        processQueue(e, null);
        isRefreshing = false;
        return Promise.reject(e);
      }
    }

    return Promise.reject(err);
  }
);

// API helpers
export const registerUser = (formData) => API.post("/auth/register", formData);
export const loginUser = (data) => API.post("/auth/login", data);
export const verifyEmail = (token) => API.get(`/auth/verify-email?token=${token}`);
export const resendVerificationEmail = (email) =>
  API.post("/auth/resend-verification", { email });
export const forgotPassword = (data) => API.post("/auth/forgot-password", data);
export const resetPassword = (data) => API.post("/auth/reset-password", data);
export const logoutUser = () => API.post("/auth/logout");
export const getMe = () => API.get("/auth/me");
