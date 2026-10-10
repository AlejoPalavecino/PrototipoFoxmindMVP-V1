import React, { lazy, useState, useEffect } from "react";
import { useUrlNavigation } from "./app/useUrlNavigation";
import { RoutePresentationContext, RoutePresentationReady, routeTitle, useRoutePresentation } from "./app/useRoutePresentation";
import { createDefaultAppSettings } from "./app/settings";
import { RoleSelection } from "./views/RoleSelection";
import { RouteBoundary } from "./components/layout/RouteBoundary";
import { encodeRoute } from "./app/routing";
import { AppContext } from "./context";
import { AccessibilityPanel } from "./components/ui/AccessibilityPanel";
import { Toaster } from "./components/ui/Toaster";

const DocenteLayout = lazy(() => import("./components/layout/DocenteLayout").then(module => ({ default: module.DocenteLayout })));
const AlumnoLayout = lazy(() => import("./components/layout/AlumnoLayout").then(module => ({ default: module.AlumnoLayout })));

function RoleSelectionMain() {
  const mainRef = useRoutePresentation();
  return (
    <main ref={mainRef} tabIndex={-1} className="h-screen overflow-y-auto">
      <RoutePresentationReady><RoleSelection /></RoutePresentationReady>
    </main>
  );
}

export default function App() {
  const { role, view, navigationParams, setRole, setView, presentation } = useUrlNavigation();
  const [settings, setSettings] = useState(createDefaultAppSettings());

  useEffect(() => { document.title = routeTitle({ role, view }); }, [role, view]);

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
        setRole,
        setView,
        updateSettings,
      }}
    >
      <div
        className={`min-h-screen font-sans selection:bg-fox-purple/30 theme-${settings.theme} density-${settings.density} text-size-${settings.fontSize} bg-fox-bg text-fox-text-main/90`}
      >
        <RoutePresentationContext.Provider value={presentation}>
          {role === "none" && <RoleSelectionMain />}
          {role !== "none" && (
            <RouteBoundary routeKey={encodeRoute({ role, view, navigationParams })}>
              {role === "docente" && <DocenteLayout />}
              {role === "alumno" && <AlumnoLayout />}
            </RouteBoundary>
          )}
        </RoutePresentationContext.Provider>
        <AccessibilityPanel />
        <Toaster />
      </div>
    </AppContext.Provider>
  );
}
