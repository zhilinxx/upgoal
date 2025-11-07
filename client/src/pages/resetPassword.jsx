import React, { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { resetPassword } from "../api/auth";
import logo from "../assets/upgoal_logo.png";
import { FaEye, FaEyeSlash, FaKey } from "react-icons/fa";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [validation, setValidation] = useState("");

  const togglePassword = () => setShowPassword((prev) => !prev);

  const validatePassword = (password) => {
    const regex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,16}$/;
    return regex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = params.get("token");
    
    if (!validatePassword(newPassword)) {
      setValidation(
        "Password must be 8–16 characters long and include at least one letter, one number, and one symbol."
      );
      return;
    }
    else setValidation("");
    try {
      const res = await resetPassword({ token, newPassword });
      setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error occurred");
    }
  };

  const isSuccess = message.toLowerCase().includes("success");

  return (
    <div className="container">
      <div className="card">
        <img src={logo} alt="UpGoal" className="logo" />
        <h3>Enter New Password</h3>

        <form onSubmit={handleSubmit} className="reset-form">
          <div className="input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={togglePassword}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <FaEye /> : <FaEyeSlash />}
            </button>
          </div>
          {validation && <p className="validation">{validation}</p>}
          <button type="submit" className="reset-btn">Reset Password</button>
        </form>

        {message && (
          <p
            style={{
              color: isSuccess ? "#7ed77a" : "red",
              marginTop: "10px",
              fontWeight: "500",
            }}
          >
            {message}
          </p>
        )}

        {isSuccess && (
          <Link to="/login" className="login-link">
            Click here to Login
          </Link>
        )}
      </div>
    </div>
  );
}
