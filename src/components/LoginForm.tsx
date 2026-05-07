"use client";

import React, { useState } from "react";
import { Icons } from "./Icons";
import { useAuth } from "./AuthProvider";
import type { SignUpResult } from "./AuthProvider";

export function LoginForm() {
  const { signIn, signUp, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (isSignUp && password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      if (isSignUp) {
        const result: SignUpResult = await signUp(email.trim(), password);

        if (result === "confirm-email") {
          setSuccessMsg(
            `Account created! We've sent a confirmation email to ${email.trim()}. ` +
            `Please check your inbox (and spam folder) and click the verification link before signing in.`
          );
          setPassword("");
        } else {
          // Signed in directly (email verification disabled)
          setSuccessMsg("Account created and signed in!");
        }
      } else {
        await signIn(email.trim(), password);
        // signIn triggers onAuthStateChange which updates session automatically
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const busy = isLoading || submitting;

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur p-8 shadow-xl dark:border-slate-700/50 dark:bg-slate-900/80 dark:backdrop-blur dark:shadow-2xl">
      <h2 className="mb-8 text-center text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
        {isSignUp ? "Create Account" : "Sign In"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            className="w-full rounded-lg border border-slate-300/50 bg-slate-50/50 backdrop-blur px-4 py-3 text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 dark:border-slate-600/50 dark:bg-slate-800/50 dark:backdrop-blur dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-brand-400 dark:focus:ring-brand-400/30"
            placeholder="your@email.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className="w-full rounded-lg border border-slate-300/50 bg-slate-50/50 backdrop-blur px-4 py-3 pr-12 text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 dark:border-slate-600/50 dark:bg-slate-800/50 dark:backdrop-blur dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:ring-brand-400/30"
              placeholder={isSignUp ? "Min. 6 characters" : "••••••••"}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={busy}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>
          {isSignUp && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Must be at least 6 characters.
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200/50 bg-red-50/50 backdrop-blur p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:backdrop-blur dark:text-red-200">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-lg border border-green-200/50 bg-green-50/50 backdrop-blur p-4 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:backdrop-blur dark:text-green-200">
            {successMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-3 font-medium text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:from-brand-700 hover:to-brand-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none dark:from-brand-600 dark:to-brand-700"
        >
          {busy ? (
            <>
              <Icons.Spinner className="h-4 w-4" />
              {isSignUp ? "Creating account..." : "Signing in..."}
            </>
          ) : isSignUp ? (
            "Create Account"
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError("");
            setSuccessMsg("");
          }}
          disabled={busy}
          className="text-sm font-medium transition-all duration-200 text-brand-600 hover:text-brand-700 hover:underline underline-offset-2 disabled:opacity-50 dark:text-brand-400 dark:hover:text-brand-300"
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "Need an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
