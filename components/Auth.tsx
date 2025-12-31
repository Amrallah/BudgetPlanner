"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { user, loading } = useAuth();

  const login = async () => {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError("Login failed");
    }
  };

  const register = async () => {
    setError("");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError("Registration failed");
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (user) {
    return (
      <div style={{ padding: 16 }}>
        <p>
          Logged in as <b>{user.email}</b>
        </p>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 300 }}>
      <h3>Login / Register</h3>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />

      <button onClick={login} style={{ width: "100%", marginBottom: 8 }}>
        Login
      </button>

      <button onClick={register} style={{ width: "100%" }}>
        Register
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
