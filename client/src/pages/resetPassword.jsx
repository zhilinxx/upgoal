import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth";
import logo from "../assets/react.svg";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = params.get("token");
    try {
      const res = await resetPassword({ token, newPassword });
      setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error occurred");
    }
  };

  return (
    <div className="container">
      <div className="card">
        <img src={logo} alt="UpGoal" className="logo" />
        <h2>Enter New Password</h2>
        <form onSubmit={handleSubmit}>~
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <button type="submit">Reset Password</button>
        </form>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}
