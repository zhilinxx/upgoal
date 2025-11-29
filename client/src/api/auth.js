// api/auth.js
import axios from "axios";

export const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
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

    // If there's no response (network error), just reject
    if (!error.response) {
      return Promise.reject(error);
    }

    const status = error.response.status;

    // 🚫 IMPORTANT: do NOT try to refresh if the failing request IS the refresh endpoint
    if (originalRequest.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    // ✅ Only handle 401/403 once per request
    if ((status === 401 || status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await API.get("/auth/refresh", { withCredentials: true });

        localStorage.setItem("accessToken", data.accessToken);
        API.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }

        // 🔁 Retry the original failed request
        return API(originalRequest);
      } catch (refreshErr) {
        console.error("Refresh token failed:", refreshErr);

        // Optional: preserve theme
        const savedTheme = localStorage.getItem("theme");
        localStorage.clear();
        if (savedTheme) localStorage.setItem("theme", savedTheme);

        window.location.href = "/login";
        return Promise.reject(refreshErr);
      }
    }

    // If not a handled case, just pass the error through
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

// // === Profile functions ===
// export const getProfile = () => API.get("/profile/me");
// export const updateInsuranceProfile = (data) => API.put("/profile/insurance", data);
