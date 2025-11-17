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

  async function handleLogin() {
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
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

  async function handleRegister() {
    try {
      const res = await api.post("/auth/register", {
        email,
        password,
        name: name || email.split("@")[0],
        role
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
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
      alert("Registration failed");
    }
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
                  setShowRegister(true);
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
                setShowRegister(false);
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
