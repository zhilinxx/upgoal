import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getDB } from "../config/db.js";
import { sendEmail } from "../utils/sendEmail.js";

const createToken = (payload, expiresIn) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

// Register
export const register = async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDB();

    // Check existing email
    const [existing] = await db.query("SELECT * FROM user WHERE email = ?", [email]);
    if (existing.length > 0)
      return res.status(400).json({ message: "Email already registered" });

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create verification token
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Generate verification link
    const verifyLink = `${process.env.CLIENT_URL}/verifyEmail?token=${verificationToken}`;

    // Try sending email FIRST
    // Send email with Resend
    try {
      await sendEmail(
        email,
        "Verify Your Email",
        `
        <p>Click the link below to verify your email. This link expires in 1 day.</p>
        <a href="${verifyLink}">${verifyLink}</a>
        `
      );
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      return res.status(500).json({
        message: "Verification email failed to send. Please try again later.",
      });
    }

    // Insert only AFTER email successfully sent
    const role = 0;
    const is_verified = 0;
    const refresh_token = "";
    const status = 1;
    const theme = 0;

    await db.query(
      `INSERT INTO user 
        (email, password, role, is_verified, verification_token, refresh_token, status, theme) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, hashed, role, is_verified, verificationToken, refresh_token, status, theme]
    );

    res.json({
      message:
        "Verification email sent successfully. Please check your inbox or spam to verify your account.",
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Error Occurred" });
  }
};



// Verify Email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDB();
    await db.query("UPDATE user SET is_verified = 1 WHERE email = ?", [decoded.email]);
    res.json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

// Resend verification email
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const db = getDB();

    const [rows] = await db.query("SELECT * FROM user WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(400).json({ message: "Email not found" });
    }

    const user = rows[0];
    if (user.is_verified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const token = createToken({ email }, "1d");
    const verifyLink = `${process.env.CLIENT_URL}/verifyEmail?token=${token}`;
    await sendEmail(email, "Verify your email", `Click the link below to verify. This link will expired after 1 day. \n ${verifyLink}`);

    res.json({ message: "New verification link sent" });
  } catch (err) {
    console.error("Resend Verification Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDB();

    const [rows] = await db.query("SELECT * FROM user WHERE email = ?", [email]);
    if (rows.length === 0)
      return res.status(400).json({ message: "User not found" });

    const user = rows[0];
    if (!user.is_verified)
      return res.status(400).json({ message: "Please verify your email" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ message: "Wrong password" });

    // Generate tokens
    const accessToken = createToken(
      { user_id: user.user_id, role: user.role, email: user.email },
      "15m"
    );
    const refreshToken = createToken({ user_id: user.user_id }, "7d");


    // Save refreshToken in db
    await db.query("UPDATE user SET refresh_token = ? WHERE user_id = ?", [
      refreshToken,
      user.user_id,
    ]);
    console.log("🟢 Stored refresh token for user:", user.user_id);
    console.log("🔹 Token preview:", refreshToken.substring(0, 30) + "...");

    // Send refreshToken as cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      accessToken,
      role: user.role,
      userId: user.user_id,
      email,
      theme: user.theme,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken)
      return res.status(401).json({ message: "No refresh token" });

    const db = getDB();
    const [rows] = await db.query("SELECT * FROM user WHERE refresh_token = ?", [refreshToken]);
    if (rows.length === 0)
      return res.status(403).json({ message: "Invalid refresh token" });

    const user = rows[0];

    // Verify and decode token
    jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Generate a new access token
    const newAccessToken = createToken(
      { user_id: user.user_id, role: user.role, email: user.email },
      "15m"
    );


    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Refresh Error:", error);
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      const db = getDB();
      await db.query("UPDATE user SET refresh_token = '' WHERE refresh_token = ?", [refreshToken]);
    }

    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed" });
  }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const db = getDB();

  const [rows] = await db.query("SELECT * FROM user WHERE email = ?", [email]);
  if (rows.length === 0) return res.status(400).json({ message: "Email not found" });

  const token = createToken({ email }, "15m");
  const resetLink = `${process.env.CLIENT_URL}/resetPassword?token=${token}`;
  await sendEmail(email, "Reset Password", `Click to reset your password: ${resetLink}`);

  res.json({ message: "Reset password email verification sent. Please check your inbox or spam" });
};

// Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const hashed = await bcrypt.hash(newPassword, 10);
    const db = getDB();
    await db.query("UPDATE user SET password = ? WHERE email = ?", [hashed, decoded.email]);
    res.json({ message: "Password updated successfully" });
  } catch {
    res.status(400).json({ message: "Invalid or expired token" });
  }
};


// --- Get current user (/auth/me) ---
export const getMe = async (req, res) => {
  try {
    const db = getDB();
    const [rows] = await db.query("SELECT user_id, email, role, theme FROM user WHERE user_id = ?", [
      req.user.user_id,
    ]);

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: rows[0] });
  } catch (error) {
    console.error("GetMe Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
