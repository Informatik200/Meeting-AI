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
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 transition-colors hover:bg-brand-700 disabled:opacity-50";

function Section({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
      <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4 text-slate-500">
        <Icon className="h-[15px] w-[15px]" />
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
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
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
      <header className="mb-6 animate-rise">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("Settings", "Einstellungen")}</h1>
        <p className="mt-1 text-slate-500">{t("Manage your profile, security, and preferences.", "Verwalten Sie Profil, Sicherheit und Einstellungen.")}</p>
      </header>

      <div className="space-y-5">
        {/* Profile */}
        <Section title={t("Profile", "Profil")} icon={User}>
          <div className="mb-5 flex items-center gap-4 border-b border-slate-100 pb-5">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-purple-500 text-base font-bold text-white">
              {initials(user.name || user.email)}
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900">{user.email}</div>
              <div className="text-xs text-slate-400">{t("Your email address can't be changed yet.", "E-Mail kann derzeit nicht geändert werden.")}</div>
            </div>
          </div>
          <form onSubmit={(e) => void saveName(e)}>
            <label className="block">
              <span className={labelCls}>{t("Display name", "Anzeigename")}</span>
              <input id="settings-name" className={inputCls} type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
            {nameStatus === "error" && <p className="mt-2 text-sm text-rose-600">{nameError}</p>}
            <div className="mt-4 flex items-center justify-end gap-3">
              {nameStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-brand-600">
                  <Check className="h-3.5 w-3.5" /> {t("Saved", "Gespeichert")}
                </span>
              )}
              <button type="submit" className={primaryBtn} disabled={nameStatus === "saving" || !name.trim() || name.trim() === (user.name ?? "")}>
                {nameStatus === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
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
              <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
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
            {pwStatus === "error" && <p className="text-sm text-rose-600">{pwError}</p>}
            <div className="flex items-center justify-end gap-3">
              {pwStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-brand-600">
                  <Check className="h-3.5 w-3.5" /> {t("Password updated", "Passwort aktualisiert")}
                </span>
              )}
              <button type="submit" className={primaryBtn} disabled={pwStatus === "saving"}>
                {pwStatus === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("Update password", "Passwort aktualisieren")}
              </button>
            </div>
          </form>
        </Section>

        {/* Preferences */}
        <Section title={t("Preferences", "Einstellungen")} icon={Palette}>
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
          <button onClick={onShowShortcuts} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
            <Keyboard className="h-4 w-4" /> {t("Keyboard shortcuts", "Tastenkombinationen")}
          </button>
        </Section>
      </div>
    </div>
  );
}
