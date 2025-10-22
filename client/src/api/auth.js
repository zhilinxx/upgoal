// api/auth.js
import axios from "axios";

export const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true, // ✅ important to send cookies
});

// 🧠 Request interceptor (optional — can attach token)
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 🧠 Response interceptor to handle expired access token
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // if token expired and not retried yet
    if (
      error.response?.status === 403 &&
      !originalRequest._retry &&
      error.response.data.message?.includes("expired")
    ) {
      originalRequest._retry = true;
      try {
        const { data } = await API.get("/auth/refresh");
        localStorage.setItem("accessToken", data.accessToken);
        API.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
        return API(originalRequest); // retry the original request
      } catch (refreshErr) {
        console.error("Refresh token failed:", refreshErr);
        localStorage.clear();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// === Auth functions ===
export const registerUser = (formData) => API.post("/auth/register", formData);
export const loginUser = (data) => API.post("/auth/login", data);
export const verifyEmail = (token) => API.get(`/auth/verify-email?token=${token}`);
export const resendVerificationEmail = (email) => API.post("/auth/resend-verification", { email });
export const forgotPassword = (data) => API.post("/auth/forgot-password", data);
export const resetPassword = (data) => API.post("/auth/reset-password", data);
export const logoutUser = () => API.post("/auth/logout");
