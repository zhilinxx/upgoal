import React, { useState } from "react";
import { registerUser } from "../api/auth";
import { Link } from "react-router-dom";
import logo from "../assets/upgoal_logo.png"; // replace with your upgoal logo (e.g. "../assets/upgoal-logo.png")
import { FaEnvelope, FaKey, FaEye, FaEyeSlash } from "react-icons/fa";
import "../register.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [validation, setValidation] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Password validation using regex
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,16}$/;

    if (!passwordRegex.test(password)) {
      setValidation(
        "Password must be 8–16 characters long and include at least one letter, one number, and one symbol."
      );
      return;
    }

    try {
      const res = await registerUser({ email, password });
      setMessage(res.data.message);
    } catch (err) {
      setValidation(err.response?.data?.message || "Error occurred");
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        {/* Logo */}
        <img src={logo} alt="UpGoal" className="register-logo" />

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="register-form">
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
            <label>
              Password<span className="required">*</span>
            </label>
            <div className="input-wrapper">
              <FaKey className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          </div>

          {validation && <p className="validation">{validation}</p>}

          <p className="login-text">
            Already registered? <Link to="/login" className="login-link">Login</Link>
          </p>

          <button type="submit" className="register-btn">Register</button>
          {message && <p className="message">{message}</p>}
        </form>
      </div>
    </div>
  );
}
