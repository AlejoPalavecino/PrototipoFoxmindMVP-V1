import React, { useState, useEffect } from "react";
import { Role } from "./types";
import type { AppView, SetAppView, StoredNavigationParams } from "./app/navigation";
import { RoleSelection } from "./views/RoleSelection";
import { DocenteLayout } from "./components/layout/DocenteLayout";
import { AlumnoLayout } from "./components/layout/AlumnoLayout";
import { AppContext } from "./context";
import { AccessibilityPanel } from "./components/ui/AccessibilityPanel";
import { Toaster } from "./components/ui/Toaster";

export default function App() {
  const [role, setRole] = useState<Role>("none");
  const [view, setView] = useState<AppView>("dashboard");
  const [navigationParams, setNavigationParams] = useState<StoredNavigationParams | undefined>(undefined);
  const [settings, setSettings] = useState({
    theme: "light",
    density: "comoda",
    fontSize: "normal",
    dyslexic: false,
    contrast: false,
    easyRead: false,
    textSize: "M",
  });

  useEffect(() => {
    const html = document.documentElement;
    // Clear previous a11y classes
    html.classList.remove("a11y-text-s", "a11y-text-m", "a11y-text-l", "font-dyslexic", "high-contrast", "easy-read");
    
    // Apply new classes to HTML root so rem-based tailwind classes scale
    html.classList.add(`a11y-text-${settings.textSize.toLowerCase()}`);
    if (settings.dyslexic) html.classList.add("font-dyslexic");
    if (settings.contrast) html.classList.add("high-contrast");
    if (settings.easyRead) html.classList.add("easy-read");
    
  }, [settings.textSize, settings.dyslexic, settings.contrast, settings.easyRead]);

  const handleSetRole = (newRole: Role) => {
    setRole(newRole);
    setView("dashboard");
    setNavigationParams(undefined);
  };

  const handleSetView: SetAppView = (newView, params) => {
    setView(newView);
    setNavigationParams(params);
  };

  const updateSettings = (newSettings: Partial<typeof settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <AppContext.Provider
      value={{
        role,
        view,
        navigationParams,
        settings,
        setRole: handleSetRole,
        setView: handleSetView,
        updateSettings,
      }}
    >
      <div
        className={`min-h-screen font-sans selection:bg-fox-purple/30 theme-${settings.theme} density-${settings.density} text-size-${settings.fontSize} bg-fox-bg text-fox-text-main/90`}
      >
        {role === "none" && <RoleSelection />}
        {role === "docente" && <DocenteLayout />}
        {role === "alumno" && <AlumnoLayout />}
        <AccessibilityPanel />
        <Toaster />
      </div>
    </AppContext.Provider>
  );
}
