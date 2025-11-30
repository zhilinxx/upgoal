// client/src/api/auth.js
import axios from "axios";

export const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true, // send cookies (refreshToken)
});

// Request interceptor - attach access token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor - handle 401 and refresh
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/login") &&
      !originalRequest.url.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      try {
        const { data } = await API.get("/auth/refresh");
        localStorage.setItem("accessToken", data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return API(originalRequest);
      } catch (refreshErr) {
        console.error("Refresh token failed:", refreshErr);
        localStorage.clear();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
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
