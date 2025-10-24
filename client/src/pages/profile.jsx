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
      <h2>My Profile</h2>

      {/* Email & Password always visible */}
      <div className="profile-section always">
        <p><strong>Email:</strong> {profile.email}</p>
      </div>

      {/* Change Password */}
      <div className="profile-section">
        {isMobile ? (
          <div className="section-header" onClick={() => toggleSection("password")}>
            <h3>Change Password</h3>
            {openSection === "password" ? <FaChevronDown /> : <FaChevronRight />}
          </div>
        ) : (
          <h3>Change Password</h3>
        )}
        {(!isMobile || openSection === "password") && (
          <div className="section-content">
            <button onClick={() => navigate("/change-password")}>Change Password</button>
          </div>
        )}
      </div>

      {/* Income Setup */}
      <div className="profile-section">
        {isMobile ? (
          <div className="section-header" onClick={() => toggleSection("income")}>
            <h3>Income Setup</h3>
            {openSection === "income" ? <FaChevronDown /> : <FaChevronRight />}
          </div>
        ) : (
          <h3>Income Setup</h3>
        )}
        {(!isMobile || openSection === "income") && (
          <div className="section-content">
            <p><strong>Monthly Income:</strong> {profile.income_monthly}</p>
            <p><strong>Lifestyle:</strong> {profile.lifestyle_pref}</p>
            <p><strong>Housing Loan:</strong> {profile.housing_loan}</p>
            <p><strong>Car Loan:</strong> {profile.car_loan}</p>
          </div>
        )}
      </div>

      {/* Insurance Profile */}
      <div className="profile-section">
        {isMobile ? (
          <div className="section-header" onClick={() => toggleSection("insurance")}>
            <h3>Insurance Profile Setup</h3>
            {openSection === "insurance" ? <FaChevronDown /> : <FaChevronRight />}
          </div>
        ) : (
          <h3>Insurance Profile Setup</h3>
        )}
        {(!isMobile || openSection === "insurance") && (
          <div className="section-content">
            <div className="info-grid">
              <p><strong>Gender:</strong> {profile.gender}</p>
              <p><strong>Birth Date:</strong> {profile.birth_date}</p>
              <p><strong>Height:</strong> {profile.height} cm</p>
              <p><strong>Weight:</strong> {profile.weight} kg</p>
              <p><strong>Exercise:</strong> {profile.exercise}</p>
              <p><strong>Alcohol:</strong> {profile.alcohol}</p>
              <p><strong>Smoke:</strong> {profile.smoke}</p>
              <p><strong>Diabetes:</strong> {profile.diabetes}</p>
              <p><strong>Cholesterol:</strong> {profile.cholesterol}</p>
              <p><strong>Asthma:</strong> {profile.asthma}</p>
              <p><strong>Family Cancer:</strong> {profile.family_cancer}</p>
              <p><strong>Heart Disease:</strong> {profile.heart_disease}</p>
              <p><strong>Occupation:</strong> {profile.occupation}</p>
              <p><strong>Allowance:</strong> {profile.allowance}</p>
            </div>
            <button className="edit-btn" onClick={() => navigate("/insurance-edit")}>
              <FaEdit /> Edit
            </button>
          </div>
        )}
      </div>

      {/* Favourite list */}
      <div className="profile-section favourite" onClick={() => navigate("/favourite")}>
        <div className="section-header">
          <h3>Insurance Favourite List</h3>
          <FaChevronRight />
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
