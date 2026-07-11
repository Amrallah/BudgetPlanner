"use client";

import { useEffect, useMemo, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";

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
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-full max-w-md mx-auto p-6 bg-card rounded-xl shadow-lg text-center border border-border">
          <div className="mx-auto mb-3 h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" aria-label="Loading" />
          <p className="text-foreground/90 font-medium">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-card rounded-xl shadow-xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Signed in</p>
            <p className="text-lg font-semibold text-foreground">{user.email}</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-500/15 rounded-full border border-green-300 dark:border-green-500/30">Active</span>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}
        <button
          onClick={logout}
          className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-secondary active:bg-secondary transition-colors"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-card rounded-xl shadow-xl border border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h3 className="text-2xl font-bold text-foreground">Finance Dashboard</h3>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="flex gap-2 text-sm font-semibold">
          <button
            className={`px-3 py-1 rounded-lg ${mode === "login" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Login
          </button>
          <button
            className={`px-3 py-1 rounded-lg ${mode === "register" ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Register
          </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-1">Email</label>
          <input
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouchedEmail(true)}
            className="w-full p-3 border-2 border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
            autoComplete="email"
          />
          {emailInvalid && touchedEmail && (
            <p className="mt-1 text-xs text-red-600">Enter a valid email address.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-1">Password</label>
          <div className="relative">
            <input
              type={passwordVisible ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouchedPassword(true)}
              className="w-full p-3 pr-24 border-2 border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setPasswordVisible((v) => !v)}
              className="absolute inset-y-0 right-2 my-1 px-3 text-sm font-semibold text-muted-foreground rounded-lg hover:bg-muted"
            >
              {passwordVisible ? "Hide" : "Show"}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Minimum 6 characters recommended.</p>
          {passwordTooShort && touchedPassword && (
            <p className="mt-1 text-xs text-red-600">Password must be at least 6 characters.</p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={formInvalid}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${formInvalid ? "bg-muted-foreground/40 cursor-not-allowed" : "bg-primary hover:bg-primary/90 active:bg-primary/80"}`}
        >
          {pending ? "Working..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
