// client/src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { getProfile } from "../api/profileAPI";
import { logoutUser } from "../api/auth";
import { useNavigate } from "react-router-dom";
import "../styles/profile.css";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { FaChevronRight, FaChevronDown, FaEdit } from "react-icons/fa";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [openSection, setOpenSection] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [openLogoutConfirm, setOpenLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  // --- helpers ---
  const formatGender = (value) => {
    if (value === "M") return "Male";
    if (value === "F") return "Female";
    return value || "-";
  };

  const formatYesNo = (value) => {
    if (value === 1 || value === "1" || value === "Yes") return "Yes";
    if (value === 0 || value === "0" || value === "No") return "No";
    return value || "-";
  };

  const formatFrequency = (num) => {
    switch (parseInt(num)) {
      case 0: return "Never";
      case 1: return "Rarely";
      case 2: return "Sometimes";
      case 3: return "Often";
      default: return "-";
    }
  };

  const formatOccupation = (value) => {
    switch (parseInt(value)) {
      case 0: return "Unemployed";
      case 1: return "Low Risk (Office Worker / Teacher / Government)";
      case 2: return "Moderate Risk (Driver / Security Guard / Chef)";
      case 3: return "High Risk (Manual / Industrial / Police / Army)";
      default: return "-";
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // always show 2 decimals for money
  const fmt2 = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : "-";
  };

  // --- effects ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getProfile();
        setProfile(data);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
      localStorage.removeItem("accessToken");
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (!profile) return <p className="loading">Loading profile...</p>;

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="profile-container">
      <h2>Profile</h2>
      <div className="profile-inner">
        {/* Always visible account/email + actions */}
        <div className="profile-section">
          <div className="always">
            <h3>Email: {profile.email}</h3>
          </div>

          <div className="favourite" onClick={() => navigate("/forgotPassword")}>
            <hr />
            <div className="section-header">
              <h3>Change Password</h3>
              <FaChevronRight className="chevron-icon" />
            </div>
          </div>

          <div className="favourite" onClick={() => navigate("/favouriteList")}>
            <hr />
            <div className="section-header">
              <h3>Insurance Favourite List</h3>
              <FaChevronRight className="chevron-icon" />
            </div>
          </div>
        </div>

        {/* Income Setup */}
        <div className="profile-section">
          {isMobile ? (
            <div className="section-header" onClick={() => toggleSection("income")}>
              <h3>Income Setup</h3>
              {openSection === "income" ? (
                <FaChevronDown className="chevron-icon" />
              ) : (
                <FaChevronRight className="chevron-icon" />
              )}
            </div>
          ) : (
            <h3>Income Setup</h3>
          )}

          {(!isMobile || openSection === "income") && (
            <div className="section-content">
              <div className="info-list">
                <div className="info-row">
                  <span className="info-label">Monthly Income:</span>
                  <span className="info-value">RM {fmt2(profile.net_income)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Lifestyle:</span>
                  <span className="info-value">{profile.lifestyle || "-"}</span>
                </div>

                {profile.commitments && profile.commitments.length > 0 ? (
                  profile.commitments.map((c, index) => (
                    <div key={index} className="info-row">
                      <span className="info-label">{c.type}:</span>
                      <span className="info-value">RM {fmt2(c.amt)}</span>
                    </div>
                  ))
                ) : (
                  <div className="info-row">
                    <span className="info-label">Monthly Commitments:</span>
                    <span className="info-value">None</span>
                  </div>
                )}
              </div>

              <div className="btn-section">
                <button className="edit-btn" onClick={() => navigate("/incomeSetup")}>
                  <FaEdit /> Edit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Insurance Profile */}
        <div className="profile-section">
          {isMobile ? (
            <div className="section-header" onClick={() => toggleSection("insurance")}>
              <h3>Insurance Profile Setup</h3>
              {openSection === "insurance" ? (
                <FaChevronDown className="chevron-icon" />
              ) : (
                <FaChevronRight className="chevron-icon" />
              )}
            </div>
          ) : (
            <h3>Insurance Profile Setup</h3>
          )}

          {(!isMobile || openSection === "insurance") && (
            <div className="section-content">
              <div className="info-list">
                <div className="info-row">
                  <span className="info-label">Gender:</span>
                  <span className="info-value">{formatGender(profile.gender)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Birth Date:</span>
                  <span className="info-value">{formatDate(profile.birth_date)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Height:</span>
                  <span className="info-value">{profile.height} cm</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Weight:</span>
                  <span className="info-value">{profile.weight} kg</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Excercise:</span>
                  <span className="info-value">{formatFrequency(profile.exercise)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Alcohol:</span>
                  <span className="info-value">{formatFrequency(profile.alcohol)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Somke:</span>
                  <span className="info-value">{formatYesNo(profile.smoke)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Diabetes:</span>
                  <span className="info-value">{formatYesNo(profile.diabetes)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Cholesterol:</span>
                  <span className="info-value">{profile.cholesterol}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Asthma:</span>
                  <span className="info-value">{formatYesNo(profile.asthma)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Family Cancer:</span>
                  <span className="info-value">{formatYesNo(profile.fam_cancer)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Heart Disease:</span>
                  <span className="info-value">{formatYesNo(profile.heart_disease)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Occupation:</span>
                  <span className="info-value">{formatOccupation(profile.occupation)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Allowance:</span>
                  <span className="info-value">RM {fmt2(profile.allowance)}</span>
                </div>
              </div>

              <div className="btn-section">
                <button
                  className="edit-btn"
                  onClick={() => navigate("/insuranceProfileSetup")}
                >
                  <FaEdit /> Edit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={openLogoutConfirm}
        action="logout"
        subject="your account"
        message="Do you confirm to logout your account?"
        confirmText="Logout"
        cancelText="Cancel"
        onCancel={() => setOpenLogoutConfirm(false)}
        onConfirm={() => {
          setOpenLogoutConfirm(false);
          handleLogout();
        }}
      />

      {/* Logout section */}
      <div className="profile-section logout">
        <button className="logout-btn" onClick={() => setOpenLogoutConfirm(true)}>
          Logout
        </button>
      </div>
    </div>
  );
}
