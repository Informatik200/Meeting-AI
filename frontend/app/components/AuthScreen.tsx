"use client";

import { useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID, login, loginWithGoogle, register, type AuthUser } from "../lib/auth";

interface AuthScreenProps {
  lang: string;
  onAuthenticated: (user: AuthUser) => void;
}

type Mode = "login" | "register";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = "google-identity-services";

export default function AuthScreen({ lang, onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const handleCredential = async (credential: string) => {
      setError("");
      setLoading(true);
      try {
        const user = await loginWithGoogle(credential);
        onAuthenticated(user);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google sign-in failed.");
      } finally {
        setLoading(false);
      }
    };

    const renderButton = () => {
      if (!window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => void handleCredential(response.credential),
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "filled_black",
        size: "large",
        width: 320,
        text: modeRef.current === "register" ? "signup_with" : "signin_with",
      });
    };

    if (document.getElementById(GOOGLE_SCRIPT_ID)) {
      renderButton();
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.head.appendChild(script);
    // The script tag is left in place for the app's lifetime - Google's
    // client library isn't designed to be torn down and reloaded per mount.
  }, [mode, onAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user =
        mode === "login" ? await login(email, password) : await register(email, password, name || undefined);
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError("");
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span aria-hidden="true">✦</span> ORIVON
        </div>
        <h1>
          {mode === "login"
            ? lang === "de"
              ? "Willkommen zurück"
              : "Welcome back"
            : lang === "de"
              ? "Konto erstellen"
              : "Create your account"}
        </h1>
        <p className="auth-subtitle">
          {lang === "de" ? "Ihr privater KI-Wissensarbeitsbereich." : "Your private AI knowledge workspace."}
        </p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {mode === "register" && (
            <div className="settings-field">
              <label htmlFor="auth-name">{lang === "de" ? "Name (optional)" : "Name (optional)"}</label>
              <input
                id="auth-name"
                className="modal-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}
          <div className="settings-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="modal-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="settings-field">
            <label htmlFor="auth-password">{lang === "de" ? "Passwort" : "Password"}</label>
            <input
              id="auth-password"
              className="modal-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "register" ? 8 : undefined}
              required
            />
          </div>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary btn-brand auth-submit" disabled={loading}>
            {loading
              ? lang === "de"
                ? "Bitte warten…"
                : "Please wait…"
              : mode === "login"
                ? lang === "de"
                  ? "Anmelden"
                  : "Sign in"
                : lang === "de"
                  ? "Konto erstellen"
                  : "Create account"}
          </button>
        </form>

        {GOOGLE_CLIENT_ID && (
          <>
            <div className="auth-divider">
              <span>{lang === "de" ? "oder" : "or"}</span>
            </div>
            <div ref={googleButtonRef} className="auth-google-btn" />
          </>
        )}

        <button type="button" className="btn-primary btn-ghost auth-toggle" onClick={toggleMode}>
          {mode === "login"
            ? lang === "de"
              ? "Neu hier? Konto erstellen"
              : "New here? Create an account"
            : lang === "de"
              ? "Bereits registriert? Anmelden"
              : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
