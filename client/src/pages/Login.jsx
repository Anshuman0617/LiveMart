// client/src/pages/Login.jsx
import React, { useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import GoogleLoginButton from "../components/GoogleLoginButton";

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [name, setName] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  
  // OTP verification states
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [otpError, setOtpError] = useState("");

  async function handleLogin() {
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      // Clear any registration flag (user is logging in, not registering)
      localStorage.removeItem("justRegistered");
      // Dispatch event to update Navbar
      window.dispatchEvent(new Event('userLogin'));
      
      // Redirect based on role
      if (res.data.user.role == 'retailer') {
        window.location.href = '/retailer';
      } else if (res.data.user.role == 'wholesaler') {
        window.location.href = '/wholesaler';
      } else {
        nav("/");
      }
    } catch {
      alert("Invalid email or password");
    }
  }

  async function handleSendOTP() {
    if (!email) {
      alert("Please enter your email first");
      return;
    }

    setSendingOTP(true);
    setOtpError("");
    try {
      await api.post("/otp/send", { email });
      setOtpSent(true);
      alert("OTP sent to your email! Please check your inbox.");
    } catch (err) {
      setOtpError(err.response?.data?.error || "Failed to send OTP. Please try again.");
    } finally {
      setSendingOTP(false);
    }
  }

  async function handleVerifyOTP() {
    if (!otp || otp.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP");
      return;
    }

    setVerifyingOTP(true);
    setOtpError("");
    try {
      await api.post("/otp/verify", { email, otp });
      setOtpVerified(true);
      alert("Email verified successfully! You can now register.");
    } catch (err) {
      setOtpError(err.response?.data?.error || "Invalid OTP. Please try again.");
    } finally {
      setVerifyingOTP(false);
    }
  }

  async function handleRegister() {
    if (!otpVerified) {
      alert("Please verify your email with OTP first");
      return;
    }

    try {
      const res = await api.post("/auth/register", {
        email,
        password,
        name: name || email.split("@")[0],
        role
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      // Set flag to indicate user was just registered (for auto-opening profile settings)
      localStorage.setItem("justRegistered", "true");
      // Dispatch event to update Navbar
      window.dispatchEvent(new Event('userLogin'));
      
      // Redirect based on role
      if (res.data.user.role == 'retailer') {
        window.location.href = '/retailer';
      } else if (res.data.user.role == 'wholesaler') {
        window.location.href = '/wholesaler';
      } else {
        nav("/");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Registration failed";
      alert(errorMsg);
    }
  }

  // Reset OTP states when switching between login/register
  function handleShowRegister() {
    setShowRegister(true);
    setOtpSent(false);
    setOtpVerified(false);
    setOtp("");
    setOtpError("");
  }

  function handleShowLogin() {
    setShowRegister(false);
    setOtpSent(false);
    setOtpVerified(false);
    setOtp("");
    setOtpError("");
  }

  function handleGoogleSuccess(user) {
    // User is already logged in by GoogleLoginButton
    // Just navigate to home
    nav("/");
  }

  return (
    <div className="login-page-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Welcome to LiveMart</h2>
          <p>Login or create a new account</p>
        </div>

        <div className="login-form">
          {/* Email and Password at the top */}
          <input
            className="login-input"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="login-input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Register fields - only show when showRegister is true */}
          {showRegister && (
            <>
              <input
                className="login-input"
                placeholder="Name (for registration)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div className="login-form-group">
                <label>Register as:</label>
                <select
                  className="login-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="customer">User</option>
                  <option value="retailer">Retailer</option>
                  <option value="wholesaler">Wholesaler</option>
                </select>
              </div>

              {/* OTP Verification Section */}
              <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f0f9ff", borderRadius: "8px", border: "1px solid #3399cc" }}>
                <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#333" }}>
                  Email verification required for registration
                </p>
                
                {!otpSent && !otpVerified && (
                  <button
                    type="button"
                    className="login-button"
                    onClick={handleSendOTP}
                    disabled={sendingOTP}
                    style={{ width: "100%", marginBottom: "10px" }}
                  >
                    {sendingOTP ? "Sending OTP..." : "Send OTP to Email"}
                  </button>
                )}

                {otpSent && !otpVerified && (
                  <>
                    <input
                      className="login-input"
                      placeholder="Enter 6-digit OTP"
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        setOtp(value);
                        setOtpError("");
                      }}
                      style={{ marginBottom: "10px" }}
                    />
                    <button
                      type="button"
                      className="login-button"
                      onClick={handleVerifyOTP}
                      disabled={verifyingOTP || otp.length !== 6}
                      style={{ width: "100%", marginBottom: "10px" }}
                    >
                      {verifyingOTP ? "Verifying..." : "Verify OTP"}
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={sendingOTP}
                      style={{ 
                        width: "100%", 
                        background: "transparent", 
                        border: "none", 
                        color: "#3399cc", 
                        cursor: "pointer",
                        textDecoration: "underline",
                        fontSize: "14px"
                      }}
                    >
                      Resend OTP
                    </button>
                  </>
                )}

                {otpVerified && (
                  <div style={{ color: "#28a745", fontSize: "14px", fontWeight: "bold" }}>
                    ✓ Email verified successfully!
                  </div>
                )}

                {otpError && (
                  <div style={{ color: "#dc3545", fontSize: "13px", marginTop: "10px" }}>
                    {otpError}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="login-buttons">
          {!showRegister && (
            <button
              className="login-button login-button-primary"
              onClick={handleLogin}
            >
              Login
            </button>
          )}
          {showRegister && (
            <button
              className="login-button login-button-register"
              onClick={handleRegister}
              disabled={!otpVerified}
              style={{ opacity: otpVerified ? 1 : 0.6, cursor: otpVerified ? "pointer" : "not-allowed" }}
            >
              Register
            </button>
          )}
        </div>

        {!showRegister && (
          <>
            <div className="login-switch-text">
              Don't have an account?{' '}
              <a
                className="login-register-link"
                onClick={(e) => {
                  e.preventDefault();
                  handleShowRegister();
                }}
              >
                Register
              </a>
            </div>

            <div className="login-divider">
              <div className="login-divider-line"></div>
              <span className="login-divider-text">OR</span>
              <div className="login-divider-line"></div>
            </div>

            <div>
              <GoogleLoginButton onSuccess={handleGoogleSuccess} />
            </div>
          </>
        )}

        {showRegister && (
          <div className="login-switch-text">
            Already have an account?{' '}
            <a
              className="login-register-link"
              onClick={(e) => {
                e.preventDefault();
                handleShowLogin();
              }}
            >
              Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
