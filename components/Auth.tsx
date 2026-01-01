"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [pending, setPending] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);

  const { user, loading } = useAuth();

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("fd_auth_email") : null;
    if (saved) setEmail(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (email) {
      window.localStorage.setItem("fd_auth_email", email);
    } else {
      window.localStorage.removeItem("fd_auth_email");
    }
  }, [email]);

  const submitLabel = useMemo(() => mode === "login" ? "Log in" : "Create account", [mode]);

  const emailInvalid = useMemo(() => {
    if (!email) return false;
    return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [email]);

  const passwordTooShort = useMemo(() => {
    if (!password) return false;
    return password.length < 6;
  }, [password]);

  const formInvalid = pending || !email || !password || emailInvalid || passwordTooShort;

  const handleSubmit = async () => {
    setError("");
    setPending(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError(mode === "login" ? "Login failed" : "Registration failed");
    } finally {
      setPending(false);
    }
  };

  const logout = async () => {
    setError("");
    try {
      await signOut(auth);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError("Logout failed");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg text-center border border-gray-100">
          <div className="mx-auto mb-3 h-10 w-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" aria-label="Loading" />
          <p className="text-gray-700 font-medium">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-xl border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">Signed in</p>
            <p className="text-lg font-semibold text-gray-900">{user.email}</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full border border-green-200">Active</span>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        <button
          onClick={logout}
          className="w-full py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 active:bg-gray-700 transition-colors"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-xl border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">Welcome back</p>
          <h3 className="text-2xl font-bold text-gray-900">Finance Dashboard</h3>
        </div>
        <div className="flex gap-2 text-sm font-semibold">
          <button
            className={`px-3 py-1 rounded-lg ${mode === "login" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"}`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Login
          </button>
          <button
            className={`px-3 py-1 rounded-lg ${mode === "register" ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-gray-600 hover:text-gray-900"}`}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Register
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouchedEmail(true)}
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            autoComplete="email"
          />
          {emailInvalid && touchedEmail && (
            <p className="mt-1 text-xs text-red-600">Enter a valid email address.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <div className="relative">
            <input
              type={passwordVisible ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouchedPassword(true)}
              className="w-full p-3 pr-24 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setPasswordVisible((v) => !v)}
              className="absolute inset-y-0 right-2 my-1 px-3 text-sm font-semibold text-gray-600 rounded-lg hover:bg-gray-100"
            >
              {passwordVisible ? "Hide" : "Show"}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Minimum 6 characters recommended.</p>
          {passwordTooShort && touchedPassword && (
            <p className="mt-1 text-xs text-red-600">Password must be at least 6 characters.</p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={formInvalid}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${formInvalid ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"}`}
        >
          {pending ? "Working..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
