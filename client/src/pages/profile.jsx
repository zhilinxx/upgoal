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
    <div className="profile-inner">
      {/* Change Password */}
        <div className="profile-section">
          <div className="always">

          <p><strong>Email:</strong> {profile.email}</p>
        </div>
        <div className="favourite" onClick={() => navigate("/forgot-password")}>
                                   <hr />
          <div className="section-header">

            <h3>Change Password</h3>
            <FaChevronRight />
          </div>
        </div>

          {/* Favourite list */}
        <div className="favourite" onClick={() => navigate("/favourite")}>
                                   <hr />
          <div className="section-header">

            <h3>Insurance Favourite List</h3>
            <FaChevronRight />
          </div>
        </div>
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
            <div className="info-grid">
              <p>Monthly Income: {profile.income_monthly}</p>
              <p>Lifestyle: {profile.lifestyle_pref}</p>
              <p>Housing Loan: {profile.housing_loan}</p>
              <p>Car Loan: {profile.car_loan}</p>
            </div>
            <button className="edit-btn" onClick={() => navigate("/insurance-edit")}>
              <FaEdit /> Edit
            </button>
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
              <p>Gender: {profile.gender}</p>
              <p>Birth Date: {profile.birth_date}</p>
              <p>Height: {profile.height} cm</p>
              <p>Weight:{profile.weight} kg</p>
              <p>Exercise: {profile.exercise}</p>
              <p>Alcohol: {profile.alcohol}</p>
              <p>Smoke:{profile.smoke}</p>
              <p>Diabetes: {profile.diabetes}</p>
              <p>Cholesterol: {profile.cholesterol}</p>
              <p>Asthma: {profile.asthma}</p>
              <p>Family Cancer: {profile.family_cancer}</p>
              <p>Heart Disease: {profile.heart_disease}</p>
              <p>Occupation: {profile.occupation}</p>
              <p>Allowance: {profile.allowance}</p>
            </div>
            <button className="edit-btn" onClick={() => navigate("/insurance-edit")}>
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
