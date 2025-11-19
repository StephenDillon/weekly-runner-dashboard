"use client";

import { useState, createContext, useContext } from "react";
import Header from "./Header";
import { UnitProvider } from "../context/UnitContext";
import { StravaAuthProvider } from "../context/StravaAuthContext";
import { WeekStartProvider } from "../context/WeekStartContext";
import { DisabledActivitiesProvider } from "../context/DisabledActivitiesContext";

const ConfigContext = createContext<{ showConfig: boolean; setShowConfig: (show: boolean) => void } | undefined>(undefined);

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) throw new Error('useConfig must be used within ConfigContext');
  return context;
}

function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  const [showConfig, setShowConfig] = useState(false);
  
  return (
    <ConfigContext.Provider value={{ showConfig, setShowConfig }}>
      <Header onConfigToggle={() => setShowConfig(!showConfig)} showConfig={showConfig} />
      <main className="grow">
        {children}
      </main>
    </ConfigContext.Provider>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <StravaAuthProvider>
      <WeekStartProvider>
        <DisabledActivitiesProvider>
          <UnitProvider>
            <ClientLayoutContent>{children}</ClientLayoutContent>
          </UnitProvider>
        </DisabledActivitiesProvider>
      </WeekStartProvider>
    </StravaAuthProvider>
  );
}
