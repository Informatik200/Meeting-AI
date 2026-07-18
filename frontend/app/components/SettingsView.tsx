"use client";

import { useState } from "react";
import { Check, Keyboard, Loader2, Lock, Palette, User } from "lucide-react";
import { changePassword, updateProfile, type AuthUser } from "../lib/auth";
import { initials, type Lang } from "../lib/types";

interface SettingsViewProps {
  user: AuthUser;
  lang: Lang;
  onChangeLanguage: (lang: Lang) => void;
  onProfileUpdated: (user: AuthUser) => void;
  onShowShortcuts: () => void;
}

const inputCls =
  "w-full rounded-lg border border-border-subtle bg-bg-base px-3 py-2.5 text-sm text-text-primary transition-all placeholder:text-text-muted focus:border-accent-lime focus:outline-none focus:ring-1 focus:ring-accent-lime";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-accent-lime px-4 py-2 text-xs font-semibold text-black shadow-glow transition-colors hover:bg-opacity-95 disabled:opacity-40 cursor-pointer";

function Section({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-soft">
      <div className="flex items-center gap-2 border-b border-border-subtle px-6 py-4 text-text-muted">
        <Icon className="h-4 w-4 text-accent-lime" />
        <h2 className="text-sm font-bold text-text-primary">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export default function SettingsView({ user, lang, onChangeLanguage, onProfileUpdated, onShowShortcuts }: SettingsViewProps) {
  const t = (en: string, de: string) => (lang === "de" ? de : en);
  const [name, setName] = useState(user.name ?? "");
  const [nameStatus, setNameStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [nameError, setNameError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pwError, setPwError] = useState("");

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === (user.name ?? "")) return;
    setNameStatus("saving");
    setNameError("");
    try {
      onProfileUpdated(await updateProfile(name.trim()));
      setNameStatus("saved");
      setTimeout(() => setNameStatus("idle"), 2000);
    } catch (err) {
      setNameStatus("error");
      setNameError(err instanceof Error ? err.message : t("Could not save your name.", "Name konnte nicht gespeichert werden."));
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (newPassword.length < 8) {
      setPwStatus("error");
      setPwError(t("New password must be at least 8 characters.", "Mindestens 8 Zeichen erforderlich."));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwStatus("error");
      setPwError(t("Passwords do not match.", "Passwörter stimmen nicht überein."));
      return;
    }
    setPwStatus("saving");
    try {
      await changePassword(user.has_password ? currentPassword : null, newPassword);
      setPwStatus("saved");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwStatus("idle"), 2500);
    } catch (err) {
      setPwStatus("error");
      setPwError(err instanceof Error ? err.message : t("Could not change your password.", "Passwort konnte nicht geändert werden."));
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8 text-text-primary animate-rise">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">{t("Settings", "Einstellungen")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("Manage your profile, security, and preferences.", "Verwalten Sie Profil, Sicherheit und Einstellungen.")}</p>
      </header>

      <div className="space-y-6">
        {/* Profile */}
        <Section title={t("Profile", "Profil")} icon={User}>
          <div className="mb-5 flex items-center gap-4 border-b border-border-subtle pb-5">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-lime text-base font-bold text-black shadow-glow">
              {initials(user.name || user.email)}
            </span>
            <div>
              <div className="text-sm font-semibold text-text-primary">{user.email}</div>
              <div className="text-xs text-text-muted">{t("Your email address can't be changed yet.", "E-Mail kann derzeit nicht geändert werden.")}</div>
            </div>
          </div>
          <form onSubmit={(e) => void saveName(e)}>
            <label className="block">
              <span className={labelCls}>{t("Display name", "Anzeigename")}</span>
              <input id="settings-name" className={inputCls} type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
            {nameStatus === "error" && <p className="mt-2 text-sm text-rose-400">{nameError}</p>}
            <div className="mt-4 flex items-center justify-end gap-3">
              {nameStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-accent-lime">
                  <Check className="h-3.5 w-3.5" /> {t("Saved", "Gespeichert")}
                </span>
              )}
              <button type="submit" className={primaryBtn} disabled={nameStatus === "saving" || !name.trim() || name.trim() === (user.name ?? "")}>
                {nameStatus === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("Save changes", "Speichern")}
              </button>
            </div>
          </form>
        </Section>

        {/* Password */}
        <Section title={t("Password", "Passwort")} icon={Lock}>
          <form onSubmit={(e) => void savePassword(e)} className="space-y-4">
            {user.has_password ? (
              <label className="block">
                <span className={labelCls}>{t("Current password", "Aktuelles Passwort")}</span>
                <input id="settings-current-password" className={inputCls} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required />
              </label>
            ) : (
              <p className="rounded-lg bg-surface-card/60 px-3 py-2.5 text-xs text-text-secondary border border-border-subtle">
                {t("You signed up with Google — set a password below to also sign in with email.", "Sie haben sich mit Google angemeldet — legen Sie unten ein Passwort fest.")}
              </p>
            )}
            <label className="block">
              <span className={labelCls}>{t("New password", "Neues Passwort")}</span>
              <input id="settings-new-password" className={inputCls} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
            </label>
            <label className="block">
              <span className={labelCls}>{t("Confirm new password", "Passwort bestätigen")}</span>
              <input id="settings-confirm-password" className={inputCls} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
            </label>
            {pwStatus === "error" && <p className="text-sm text-rose-400">{pwError}</p>}
            <div className="flex items-center justify-end gap-3">
              {pwStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-accent-lime">
                  <Check className="h-3.5 w-3.5" /> {t("Password updated", "Passwort aktualisiert")}
                </span>
              )}
              <button type="submit" className={primaryBtn} disabled={pwStatus === "saving"}>
                {pwStatus === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("Update password", "Passwort aktualisieren")}
              </button>
            </div>
          </form>
        </Section>

        {/* Preferences */}
        <Section title={t("Preferences", "Einstellungen")} icon={Palette}>
          <div className="space-y-4">
            <label className="block">
              <span className={labelCls}>{t("Language", "Sprache")}</span>
              <select
                id="settings-language"
                value={lang}
                onChange={(e) => onChangeLanguage(e.target.value as Lang)}
                className={inputCls}
                aria-label="Select settings language"
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </label>
            <button onClick={onShowShortcuts} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-card py-2.5 text-xs font-semibold text-text-secondary hover:bg-elevated-hover hover:text-text-primary transition-colors cursor-pointer">
              <Keyboard className="h-4 w-4 text-accent-lime" /> {t("Keyboard shortcuts", "Tastenkombinationen")}
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
