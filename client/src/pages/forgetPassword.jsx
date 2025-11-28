import React, { useState } from "react";
import { forgotPassword, resendVerificationEmail } from "../api/auth";
import logo from "../assets/upgoal_logo.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [showResend, setShowResend] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await forgotPassword({ email });
      setMessage(res.data.message);
      setShowResend(true);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error occurred");
    }
  };

  return (
    <div className="container">
      <div className="card">
        <img src={logo} alt="UpGoal" className="logo" />
        <h3>Reset Password</h3>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit">Send Reset Link</button>
        </form>

        {message && <p style={{ color: "#7ed77a" }}>{message}</p>}

        {showResend && (
          <div className="resend-section">
            <p style={{ color: "#f28b8b" }}>Didn’t receive?</p>
            <button onClick={handleSubmit}>Resend</button>
          </div>
        )}
      </div>
    </div>
  );
}
