"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { suggestUsername } from "@/lib/display-name";
import { isTanzania } from "@/lib/locale";

export type SettingsData = {
  profile: { email: string; fullName: string; username: string };
  auto_audit: boolean;
  workspace: {
    id: string;
    name: string;
    plan: "solo" | "team";
    domain: string | null;
    country: string;
    languages: { bilingual: boolean; label: string; defaultMode: string };
    role: "admin" | "member";
    memberCount: number;
  };
  error?: string;
};

type SettingsContextValue = {
  data: SettingsData | null;
  fullName: string;
  setFullName: (value: string) => void;
  username: string;
  setUsername: (value: string) => void;
  workspaceName: string;
  setWorkspaceName: (value: string) => void;
  countryDraft: string;
  setCountryDraft: (value: string) => void;
  locationMode: "tz" | "other";
  setLocationMode: (value: "tz" | "other") => void;
  error: string | null;
  info: string | null;
  saving: string | null;
  patch: (body: Record<string, unknown>, key: string, ok?: string) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SettingsData | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [countryDraft, setCountryDraft] = useState("");
  const [locationMode, setLocationMode] = useState<"tz" | "other">("tz");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const settingsRes = await authFetch("/api/settings");
      const settings = (await settingsRes.json()) as SettingsData;
      if (!settingsRes.ok) {
        setError(settings.error || "Could not load settings.");
        return;
      }
      setData(settings);
      setFullName(settings.profile.fullName);
      setUsername(
        settings.profile.username ||
          suggestUsername(settings.profile.email, settings.profile.fullName),
      );
      setWorkspaceName(settings.workspace.name);
      const country = settings.workspace.country || "Tanzania";
      if (isTanzania(country)) {
        setLocationMode("tz");
        setCountryDraft("");
      } else {
        setLocationMode("other");
        setCountryDraft(country);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback(
    async (body: Record<string, unknown>, key: string, ok = "Saved.") => {
      setSaving(key);
      setError(null);
      setInfo(null);
      try {
        const response = await authFetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await response.json()) as SettingsData;
        if (!response.ok) throw new Error(json.error || "Could not save");
        setData(json);
        setFullName(json.profile.fullName);
        setUsername(json.profile.username || username);
        setWorkspaceName(json.workspace.name);
        const country = json.workspace.country || "Tanzania";
        if (isTanzania(country)) {
          setLocationMode("tz");
          setCountryDraft("");
        } else {
          setLocationMode("other");
          setCountryDraft(country);
        }
        setInfo(ok);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      } finally {
        setSaving(null);
      }
    },
    [username],
  );

  const value = useMemo(
    () => ({
      data,
      fullName,
      setFullName,
      username,
      setUsername,
      workspaceName,
      setWorkspaceName,
      countryDraft,
      setCountryDraft,
      locationMode,
      setLocationMode,
      error,
      info,
      saving,
      patch,
    }),
    [data, fullName, username, workspaceName, countryDraft, locationMode, error, info, saving, patch],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used within SettingsProvider");
  return value;
}
