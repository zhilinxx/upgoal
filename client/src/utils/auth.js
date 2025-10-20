// src/utils/auth.js
export function isLoggedIn() {
  const token = localStorage.getItem("token"); // or use cookies if you stored there
  return !!token;
}

export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}
