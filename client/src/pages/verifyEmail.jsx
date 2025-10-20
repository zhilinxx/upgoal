import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { verifyEmail, resendVerificationEmail } from "../api/auth";
import logo from "../assets/react.svg";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("Verifying...");
  const [showResend, setShowResend] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      verifyEmail(token)
        .then((res) => setMessage(res.data.message))
        .catch((err) => {
          setMessage(err.response?.data?.message || "Verification failed or expired");
          setShowResend(true);
        });
    } else {
      setMessage("No token found");
      setShowResend(true);
    }
  }, []);

  const handleResend = async () => {
    if (!email) {
      setMessage("Please enter your email to resend verification");
      return;
    }

    setLoading(true);
    try {
      const res = await resendVerificationEmail(email);
      setMessage(res.data.message);
      setShowResend(false);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <img src={logo} alt="UpGoal" className="logo" />
        <h2>{message}</h2>

        {showResend && (
          <div className="resend-section">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="email-input"
            />
            <button onClick={handleResend} disabled={loading}>
              {loading ? "Resending..." : "Resend Verification Email"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
