import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import React, { useState,useEffect } from "react";
import { FiMenu, FiX, FiUser, FiSettings } from "react-icons/fi";
import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


// Pages
import BudgetPlanner from "./pages/budget-planner";
import AccountManagement from "./pages/account-management";
import InsurancePlanManagement from "./pages/insurance-plan-management";
import Login from "./pages/login";
import Register from "./pages/register";
import VerifyEmail from "./pages/verifyEmail";
import ForgotPassword from "./pages/forgetPassword";
import ResetPassword from "./pages/resetPassword";
import logo from "./assets/upgoal_logo.png";
import IncomeSetup from "./pages/IncomeSetup";
import Profile from "./pages/profile";

// ✅ Page titles for mobile header
const PAGE_TITLES = {
  "/budget-planner": "Budget Planner",
  "/account-management": "Account Management",
  "/insurance-plan": "Insurance Plan Management",
  "/login": "Login",
  "/register": "Register",
  "/forgot-password": "Forgot Password",
  "/profile": "Profile",
  "/settings": "Settings",
  "/income-setup": "Income Setup"
};

import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true, // this ensures cookies are sent
});


function App() {
  const [message, setMessage] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // ✅ Added

  // Test backend connection
  useEffect(() => {
    fetch("http://localhost:5000/api", { credentials: "include" })
      .then(r => r.json())
      .then(d => setMessage(d.msg))
      .catch(err => console.error("Backend not reachable:", err));
  }, []);



  // ✅ Load auth state (try refresh if no token)
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const storedRole = localStorage.getItem("role");

    const checkAuth = async () => {
      try {
        if (!token) {
          // Try refreshing
          const { data } = await API.get("/auth/refresh");
          localStorage.setItem("accessToken", data.accessToken);
          // Optional: decode role if needed from token payload
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(true);
        }
        if (storedRole !== null) setRole(parseInt(storedRole));
      } catch (err) {
        console.warn("Auto login failed:", err);
        setIsLoggedIn(false);
        localStorage.clear();
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);


  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  // ✅ Protected route component
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!isLoggedIn) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(role))
      return <Navigate to="/" replace />;
    return children;
  };

//   const accessToken = localStorage.getItem("accessToken");

// const res = await API.get("/protected", {
//   headers: { Authorization: `Bearer ${accessToken}` },
// });

  const AppContent = () => {
    const location = useLocation();

    // ===== Hide header/sidebar on these routes =====
    const hideLayoutRoutes = [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
    ];

    const hideLayout = hideLayoutRoutes.includes(location.pathname);

    // ===== Navigation links =====
    const renderNavLinks = () => {
      const getLinkClass = (path) =>
        location.pathname === path ? "active-link" : "";

      if (!isLoggedIn) {
        return (
          <>
            <Link to="/login" className={getLinkClass("/login")}>
              Login
            </Link>
            <Link to="/register" className={getLinkClass("/register")}>
              Register
            </Link>
            <Link
              to="/forgot-password"
              className={getLinkClass("/forgot-password")}
            >
              Forgot Password
            </Link>
          </>
        );
      }

      if (role === 1) {
        return (
          <>
            <Link
              to="/account-management"
              className={getLinkClass("/account-management")}
            >
              Account Management
            </Link>
            <Link
              to="/insurance-plan"
              className={getLinkClass("/insurance-plan")}
            >
              Insurance Plans
            </Link>
          </>
        );
      }

      return (
        <>
          <Link
            to="/budget-planner"
            className={getLinkClass("/budget-planner")}
          >
            Budget Planner
          </Link>
        </>
      );
    };

    return (
      <>
        {/* ===== HEADER & SIDEBAR (only if not on auth pages) ===== */}
        {!hideLayout && (
          <>
            <header className="header">
              <div className="left-section">
                <button className="menu-btn" onClick={toggleSidebar}>
                  <FiMenu />
                </button>
                <div className="logo">
                  <img src={logo} alt="UpGoal" id="logo" />
                </div>

                <nav className="top-nav">{renderNavLinks()}</nav>
              </div>

              <div className="logo">
                <span>{PAGE_TITLES[location.pathname] || "UPGOAL"}</span>
              </div>

              <div className="right-icons">
                {isLoggedIn ? (
                  <Link to="/profile" className="icon-btn" title="Profile">
                    <FiUser />
                  </Link>
                ) : (
                  <Link to="/login" className="icon-btn" title="Login">
                    <span id="login-btn">Login</span>
                  </Link>
                )}
                <Link to="/settings" className="icon-btn" title="Settings">
                  <FiSettings />
                </Link>
              </div>
            </header>

            <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
              <button className="close-btn" onClick={closeSidebar}>
                <FiX />
              </button>
              <nav>
                <ul>
                  {isLoggedIn ? (
                    role === 1 ? (
                      <>
                        <li>
                          <Link to="/account-management" onClick={closeSidebar}>
                            Account Management
                          </Link>
                        </li>
                        <li>
                          <Link to="/insurance-plan" onClick={closeSidebar}>
                            Insurance Plans
                          </Link>
                        </li>
                      </>
                    ) : (
                      <>
                        <li>
                          <Link to="/budget-planner" onClick={closeSidebar}>
                            Budget Planner
                          </Link>
                        </li>
                      </>
                    )
                  ) : (
                    <>
                      <li>
                        <Link to="/login" onClick={closeSidebar}>
                          Login
                        </Link>
                      </li>
                      <li>
                        <Link to="/register" onClick={closeSidebar}>
                          Register
                        </Link>
                      </li>
                      <li>
                        <Link to="/forgot-password" onClick={closeSidebar}>
                          Forgot Password
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              </nav>
            </aside>
          </>
        )}

        {/* ===== MAIN CONTENT ===== */}
        <main className="main-content">
          <Routes>
            {/* Default redirect depending on login and role */}
            <Route
              path="/"
              element={
                isCheckingAuth ? (
                  <div>Loading...</div>
                ) : isLoggedIn ? (
                  role === 1 ? (
                    <Navigate to="/account-management" replace />
                  ) : (
                    <Navigate to="/budget-planner" replace />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route
              path="/budget-planner"
              element={
                <ProtectedRoute allowedRoles={[0]}>
                  <BudgetPlanner />
                </ProtectedRoute>
              }
            />

            <Route path="/income-setup" element={
              <ProtectedRoute allowedRoles={[0]}>
                <IncomeSetup />
              </ProtectedRoute>} 
              />

            <Route
              path="/account-management"
              element={
                <ProtectedRoute allowedRoles={[1]}>
                  <AccountManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/insurance-plan"
              element={
                <ProtectedRoute allowedRoles={[1]}>
                  <InsurancePlanManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={[0, 1]}>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </>
    );
  };


  // === Prevent rendering until auth check done ===
  if (isCheckingAuth) {
    return <div>Checking authentication...</div>;
  }

  return (
    <Router>
      <AppContent />
      <ToastContainer position="top-right" autoClose={3000} />
    </Router>
  );
}

export default App;
