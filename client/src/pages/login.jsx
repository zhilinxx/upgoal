import React, { useState } from "react";
import { loginUser } from "../api/auth";
import { Link } from "react-router-dom";
import logo from "../assets/upgoal_logo.png";
import { FaEnvelope, FaKey } from "react-icons/fa";
import "../register.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await loginUser({ email, password });
      localStorage.setItem("accessToken", res.data.accessToken);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("userId", res.data.userId);
      window.location.href = "/"; // redirect to homepage

    } catch (err) {
      setMessage(err.response?.data?.message || "Error occurred");
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <img src={logo} alt="UpGoal" className="register-logo"/>
        <form onSubmit={handleSubmit}>
          
          <div className="input-group">
            <label>Email<span className="required">*</span></label>
            <div className="input-wrapper">
              <FaEnvelope className="input-icon" />
              <input
                type="email"
                placeholder="abc123@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password<span className="required">*</span></label>
            <div className="input-wrapper">
              <FaKey className="input-icon" />
              <input
                type="password"
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <p className="login-text">
            Forgot your password?{" "}
            <Link to="/forgot-password" className="login-link">Reset here</Link>
          </p>
          <p className="login-text">
            Don’t have an account? <Link to="/register" className="login-link">Register</Link>
          </p>
          {message && <p>{message}</p>}

          <button type="submit" className="register-btn">Login</button>
        </form>
      </div>
    </div>
  );
}
