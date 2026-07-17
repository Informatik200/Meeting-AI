"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Video } from "lucide-react";
import { GOOGLE_CLIENT_ID, login, loginWithGoogle, register, type AuthUser } from "../lib/auth";
import type { Lang } from "../lib/types";

interface AuthScreenProps {
  lang: Lang;
  onAuthenticated: (user: AuthUser) => void;
}

type Mode = "login" | "register";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (r: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = "google-identity-services";

export default function AuthScreen({ lang, onAuthenticated }: AuthScreenProps) {
  const t = (en: string, de: string) => (lang === "de" ? de : en);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const googleRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const handleCredential = async (credential: string) => {
      setError("");
      setLoading(true);
      try {
        onAuthenticated(await loginWithGoogle(credential));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google sign-in failed.");
      } finally {
        setLoading(false);
      }
    };
    const renderButton = () => {
      if (!window.google || !googleRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (r) => void handleCredential(r.credential),
      });
      googleRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleRef.current, {
        theme: "outline",
        size: "large",
        width: 340,
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand-200/30 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-200/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-rise rounded-2xl border border-slate-100 bg-white p-8 shadow-soft-lg">
        <div className="mb-6 flex items-center gap-2 text-brand-600">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 text-white shadow-glow">
            <Video className="h-4 w-4" />
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-900">Orivon</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {mode === "login" ? t("Welcome back", "Willkommen zurück") : t("Create your account", "Konto erstellen")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("Your private AI knowledge workspace.", "Ihr privater KI-Wissensarbeitsbereich.")}
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4" noValidate>
          {mode === "register" && (
            <Field label={t("Name (optional)", "Name (optional)")}>
              <input
                id="auth-name"
                className={inputCls}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </Field>
          )}
          <Field label="Email">
            <input
              id="auth-email"
              className={inputCls}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          <Field label={t("Password", "Passwort")}>
            <input
              id="auth-password"
              className={inputCls}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "register" ? 8 : undefined}
              required
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? t("Sign in", "Anmelden") : t("Create account", "Konto erstellen")}
          </button>
        </form>

        {GOOGLE_CLIENT_ID && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              {t("or", "oder")}
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div ref={googleRef} className="google-btn-host flex justify-center" />
          </>
        )}

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "login" ? "register" : "login"));
            setError("");
          }}
          className="mt-6 w-full text-center text-sm text-slate-500 transition-colors hover:text-brand-600"
        >
          {mode === "login"
            ? t("New here? Create an account", "Neu hier? Konto erstellen")
            : t("Already have an account? Sign in", "Bereits registriert? Anmelden")}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}
