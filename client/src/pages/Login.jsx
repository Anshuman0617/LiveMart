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

  async function handleLogin() {
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      nav("/");
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
      nav("/");
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
    <div className="App">
      <h2>Login / Register</h2>

      <input
        placeholder="Name (for registration)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <label>Register as:</label>
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="customer">User</option>
        <option value="retailer">Retailer</option>
        <option value="wholesaler">Wholesaler</option>
      </select>

      <div style={{ marginTop: 14 }}>
        <button onClick={handleLogin}>Login</button>
        <button onClick={handleRegister} style={{ marginLeft: 8 }}>
          Register
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        <GoogleLoginButton onSuccess={handleGoogleSuccess} />
      </div>
    </div>
  );
}
