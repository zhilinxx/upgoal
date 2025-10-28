import React, { useEffect, useState } from "react";
import { getProfile } from "../api/profileAPI";
import { logoutUser } from "../api/auth"; // ✅ import logout API
import { useNavigate } from "react-router-dom";
import "../profile.css";
import { FaChevronRight, FaChevronDown, FaEdit } from "react-icons/fa";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [openSection, setOpenSection] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();
  // ✅ Convert database values into readable text
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

  // ✅ Format date into readable format
  const formatDate = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };


  // handle resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // fetch profile
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

  // ✅ Logout function
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
    <div className="profile-inner">
      {/* Change Password */}
        <div className="profile-section">
          <div className="always">

          <h3>Email: {profile.email}</h3>
        </div>
        <div className="favourite" onClick={() => navigate("/forgot-password")}>
                                   <hr />
          <div className="section-header">

            <h3>Change Password</h3>
            <FaChevronRight className="chevron-icon" />
          </div>
        </div>

          {/* Favourite list */}
        <div className="favourite" onClick={() => navigate("/favourite")}>
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
            {openSection === "income" ? <FaChevronDown className="chevron-icon" /> : <FaChevronRight className="chevron-icon" />}
          </div>
        ) : (
          <h3>Income Setup</h3>
        )}
        {(!isMobile || openSection === "income") && (
          <div className="section-content">
            <div className="info-list">
              <div className="info-row">
                <span className="info-label">Monthly Income:</span>
                <span className="info-value">{profile.income_monthly}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Lifestyle:</span>
                <span className="info-value">{profile.lifestyle_pref}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Housing Loan:</span>
                <span className="info-value">{profile.housing_loan}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Car Loan:</span>
                <span className="info-value">{profile.car_loan}</span>
              </div>
            </div>
            
          </div>
        )}
        <button className="edit-btn" onClick={() => navigate("/insurance-edit")}>
              <FaEdit /> Edit
        </button>
      </div>

      {/* Insurance Profile */}
      <div className="profile-section">
        {isMobile ? (
          <div className="section-header" onClick={() => toggleSection("insurance")}>
            <h3>Insurance Profile Setup</h3>
            {openSection === "insurance" ? <FaChevronDown className="chevron-icon" /> : <FaChevronRight className="chevron-icon" />}
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
                <span className="info-value">RM {profile.allowance}</span>
              </div>
            </div>
            <button className="edit-btn" onClick={() => navigate("/insuranceProfileSetup")}>
              <FaEdit /> Edit
            </button>
          </div>
        )}
      </div>
    </div>

      {/* ✅ Logout section */}
      <div className="profile-section logout">
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
