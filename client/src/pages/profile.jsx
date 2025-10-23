import React, { useState } from "react";
import { logoutUser } from "../api/auth";
import { FaKey, FaEnvelope } from "react-icons/fa";
import "../profile.css";

export default function Profile() {
  const [email] = useState(localStorage.getItem("userEmail") || "abc123@gmail.com");
  const [message, setMessage] = useState("");

  const handleLogout = async () => {
    try {
      await logoutUser();
      localStorage.clear();
      window.location.href = "/login";
    } catch (err) {
      setMessage("Logout failed. Try again.");
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-info">
          <div className="info-row">
            <label>Email</label>
            <span>{email}</span>
          </div>
          <div className="info-row">
            <label>Password</label>
            <span>*********</span>
          </div>
        </div>

        <div className="section">
          <h3>Change Password</h3>
          <div className="input-group">
            <label>New Password*</label>
            <div className="input-wrapper">
              <FaKey className="input-icon" />
              <input type="password" placeholder="******" />
            </div>
          </div>

          <div className="input-group">
            <label>Current Password*</label>
            <div className="input-wrapper">
              <FaKey className="input-icon" />
              <input type="password" placeholder="******" />
            </div>
          </div>
          <button className="change-btn">Change</button>
        </div>

        <div className="section">
          <h3>Email Verification</h3>
        </div>

        <div className="section">
          <h3>Insurance Favourite List</h3>
        </div>

        <div className="section">
          <h3>Income Setup</h3>
        </div>

        <div className="section">
          <h3>Insurance Profile Setup</h3>
        </div>

        {message && <p className="message">{message}</p>}

        <button className="logout-btn" onClick={handleLogout}>Log Out</button>
      </div>
    </div>
  );
}
