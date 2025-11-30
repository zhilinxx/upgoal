// client/src/App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { FiMenu, FiX, FiUser, FiSettings } from "react-icons/fi";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import "./App.css";
import useTheme from "./hooks/useTheme";
import { logoutUser } from "./api/auth";
import { API, getMe } from "./api/auth";

// Pages
import BudgetPlanner from "./pages/budgetPlanner";
import AccountManagement from "./pages/accountManagement";
import InsurancePlanManagement from "./pages/insurancePlanManagement";
import Login from "./pages/login";
import Register from "./pages/register";
import VerifyEmail from "./pages/verifyEmail";
import ForgotPassword from "./pages/forgetPassword";
import ResetPassword from "./pages/resetPassword";
import IncomeSetup from "./pages/IncomeSetup";
import Profile from "./pages/profile";
import InsuranceRecommendations from "./pages/insuranceRecommendations";
import InsuranceProfileSetup from "./pages/insuranceProfileSetup";
import AddInsurancePlan from "./pages/addInsurancePlan";
import MonthlyExpenses from "./pages/MonthlyExpenses";
import InsurancePlanDetails from "./pages/planDetails";
import FavouriteList from "./pages/insuranceFavouriteList";
import Settings from "./pages/settings";
import ComparePlan from "./pages/comparePlan";
import logo from "./assets/upgoal_logo.png";

// Page titles
const PAGE_TITLES = {
  "/budgetPlanner": "Budget Planner",
  "/accountManagement": "Account Management",
  "/insurancePlanManagement": "Insurance Plan Management",
  "/login": "Login",
  "/register": "Register",
  "/forgotPassword": "Forgot Password",
  "/profile": "Profile",
  "/settings": "Settings",
  "/incomeSetup": "Income Setup",
  "/insuranceRecommendations": "Insurance Recommendations",
  "/planDetails": "Plan Details",
  "/favouriteList": "Favourite List",
  "/comparePlans": "Plan Comparison",
};

function App() {
  const { loading: themeLoading } = useTheme();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await getMe(); // this will auto-refresh if needed
        setUser(res.data.user);
        setIsLoggedIn(true);
      } catch (err) {
        setUser(null);
        setIsLoggedIn(false);
      }

      setLoadingAuth(false);
    };

    checkAuth();
  }, []);

  if (loadingAuth || themeLoading) {
    return <div>Loading...</div>;
  }


  return (
    <Router>
      <AppContent
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
        role={role}
        adminEmail={adminEmail}
      />
      <ToastContainer position="top-right" autoClose={3000} />
    </Router>
  );
}

// ProtectedRoute component
const ProtectedRoute = ({ children, allowedRoles = null, isLoggedIn, role }) => {
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" replace />;
  return children;
};

const AppContent = ({ isLoggedIn, setIsLoggedIn, role, adminEmail }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
      const savedTheme = localStorage.getItem("theme");
      localStorage.clear();
      if (savedTheme) localStorage.setItem("theme", savedTheme);

      setIsLoggedIn(false);
      setShowAdminMenu(false);
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const hideLayoutRoutes = [
    "/login",
    "/register",
    "/forgotPassword",
    "/resetPassword",
    "/verifyEmail",
    "/insuranceProfileSetup",
    "/incomeSetup",
    "/addInsurancePlan",
    "/monthlyExpenses",
  ];

  const hideLayout = hideLayoutRoutes.includes(location.pathname);

  const renderNavLinks = () => {
    const getLinkClass = (path) => (location.pathname === path ? "active-link" : "");

    if (!isLoggedIn) {
      return (
        <>
          <Link to="/login" className={getLinkClass("/login")}>Login</Link>
          <Link to="/register" className={getLinkClass("/register")}>Register</Link>
          <Link to="/forgotPassword" className={getLinkClass("/forgotPassword")}>Forgot Password</Link>
        </>
      );
    }

    if (role === 1) {
      return (
        <>
          <Link to="/accountManagement" className={getLinkClass("/accountManagement")}>Account Management</Link>
          <Link to="/insurancePlanManagement" className={getLinkClass("/insurancePlanManagement")}>Insurance Plans</Link>
        </>
      );
    }

    return (
      <>
        <Link to="/budgetPlanner" className={getLinkClass("/budgetPlanner")}>Budget Planner</Link>
        <Link to="/insuranceRecommendations" className={getLinkClass("/insuranceRecommendations")}>Insurance Recommendations</Link>
      </>
    );
  };

  return (
    <>
      {!hideLayout && (
        <>
          {/* HEADER */}
          <header className="header">
            <div className="left-section">
              <button className="menu-btn" onClick={toggleSidebar}><FiMenu /></button>
              <div className="logo"><img src={logo} alt="UpGoal" id="logo" /></div>
              <nav className="top-nav">{renderNavLinks()}</nav>
            </div>

            <div className="page-title">
              <span>{PAGE_TITLES[location.pathname] || "UPGOAL"}</span>
            </div>

            <div className="right-icons">
              {isLoggedIn ? (
                role === 1 ? (
                  <div className="admin-profile-menu">
                    <button className="icon-btn" onClick={() => setShowAdminMenu(!showAdminMenu)} title="Admin Profile">
                      <FiUser />
                    </button>
                    {showAdminMenu && (
                      <div className="admin-dropdown">
                        <p className="admin-email">{adminEmail}</p>
                        <hr />
                        <button className="dropdown-item" onClick={() => { setShowAdminMenu(false); navigate("/forgotPassword"); }}>Change Password</button>
                        <button className="dropdown-item logout" onClick={handleLogout}>Logout</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link to="/profile" className="icon-btn" title="Profile"><FiUser /></Link>
                )
              ) : (
                <Link to="/login" className="icon-btn" title="Login">Login</Link>
              )}
              <Link to="/settings" className="icon-btn" title="Settings"><FiSettings /></Link>
            </div>
          </header>

          {/* SIDEBAR */}
          <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
            <div className="sidebar-header">
              <img src={logo} alt="UpGoal" id="sidelogo" />
              <button className="close-btn" onClick={closeSidebar}><FiX /></button>
            </div>
            <nav>
              <ul>
                {isLoggedIn ? (
                  role === 1 ? (
                    <>
                      <li><Link to="/accountManagement" onClick={closeSidebar}>Account Management</Link></li>
                      <li><Link to="/insurancePlanManagement" onClick={closeSidebar}>Insurance Plans</Link></li>
                    </>
                  ) : (
                    <>
                      <li><Link to="/budgetPlanner" onClick={closeSidebar}>Budget Planner</Link></li>
                      <li><Link to="/insuranceRecommendations" onClick={closeSidebar}>Insurance Recommendations</Link></li>
                    </>
                  )
                ) : (
                  <>
                    <li><Link to="/login" onClick={closeSidebar}>Login</Link></li>
                    <li><Link to="/register" onClick={closeSidebar}>Register</Link></li>
                    <li><Link to="/forgotPassword" onClick={closeSidebar}>Forgot Password</Link></li>
                  </>
                )}
              </ul>
            </nav>
          </aside>
        </>
      )}

      <main className="main-content">
        <Routes>
          {/* Default redirect */}
          <Route path="/" element={
            isLoggedIn ? (
              role === 1 ? <Navigate to="/accountManagement" replace /> : <Navigate to="/budgetPlanner" replace />
            ) : <Navigate to="/login" replace />
          }/>

          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verifyEmail" element={<VerifyEmail />} />
          <Route path="/forgotPassword" element={<ForgotPassword />} />
          <Route path="/resetPassword" element={<ResetPassword />} />
          <Route path="/plan/:planId" element={<InsurancePlanDetails />} />
          <Route path="/favouriteList" element={<FavouriteList />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/comparePlans" element={<ComparePlan />} />

          {/* Protected routes */}
          <Route path="/budgetPlanner" element={<ProtectedRoute isLoggedIn={isLoggedIn} role={role} allowedRoles={[0]}><BudgetPlanner /></ProtectedRoute>} />
          <Route path="/incomeSetup" element={<ProtectedRoute isLoggedIn={isLoggedIn} role={role} allowedRoles={[0]}><IncomeSetup /></ProtectedRoute>} />
          <Route path="/monthlyExpenses" element={<ProtectedRoute isLoggedIn={isLoggedIn} role={role} allowedRoles={[0]}><MonthlyExpenses /></ProtectedRoute>} />
          <Route path="/insuranceRecommendations" element={<ProtectedRoute isLoggedIn={isLoggedIn} role={role} allowedRoles={[0]}><InsuranceRecommendations /></ProtectedRoute>} />
          <Route path="/insuranceProfileSetup" element={<ProtectedRoute isLoggedIn={isLoggedIn} role={role} allowedRoles={[0]}><InsuranceProfileSetup /></ProtectedRoute>} />

          <Route path="/accountManagement" element={<ProtectedRoute isLoggedIn={isLoggedIn} role={role} allowedRoles={[1]}><AccountManagement /></ProtectedRoute>} />
          <Route path="/insurancePlanManagement" element={<ProtectedRoute isLoggedIn={isLoggedIn} role={role} allowedRoles={[1]}><InsurancePlanManagement /></ProtectedRoute>} />
          <Route path="/addInsurancePlan/:id" element={<ProtectedRoute isLoggedIn={isLoggedIn} role={role} allowedRoles={[1]}><AddInsurancePlan /></ProtectedRoute>} />
          <Route path="/addInsurancePlan" element={<ProtectedRoute isLoggedIn={isLoggedIn} role={role} allowedRoles={[1]}><AddInsurancePlan /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute isLoggedIn={isLoggedIn} role={role} allowedRoles={[0,1]}><Profile /></ProtectedRoute>} />
        </Routes>
      </main>
    </>
  );
};

export default App;
