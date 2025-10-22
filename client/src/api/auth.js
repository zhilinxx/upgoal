import axios from "axios";

export const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});



export const registerUser = (formData) => API.post("/auth/register", formData);
// export const registerUser = (data) => API.post("/register", data);
export const loginUser = (data) => API.post("/auth/login", data);
export const verifyEmail = (token) => API.get(`/auth/verify-email?token=${token}`);
export const resendVerificationEmail = (email) =>
  API.post("/resend-verification", { email });
export const forgotPassword = (data) => API.post("/auth/forgot-password", data);
export const resetPassword = (data) => API.post("/auth/reset-password", data);


