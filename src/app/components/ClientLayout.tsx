"use client";

import { useState, createContext, useContext } from "react";
import Header from "./Header";
import { UnitProvider } from "../context/UnitContext";
import { StravaAuthProvider } from "../context/StravaAuthContext";
import { WeekStartProvider } from "../context/WeekStartContext";
import { DisabledActivitiesProvider } from "../context/DisabledActivitiesContext";
import { ActivityTypeProvider } from "../context/ActivityTypeContext";
import { HeartRateZonesProvider } from "../context/HeartRateZonesContext";

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
      <main className="grow font-sans">
        {children}
      </main>
    </ConfigContext.Provider>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <StravaAuthProvider>
      <ActivityTypeProvider>
        <WeekStartProvider>
          <DisabledActivitiesProvider>
            <UnitProvider>
              <HeartRateZonesProvider>
                <ClientLayoutContent>{children}</ClientLayoutContent>
              </HeartRateZonesProvider>
            </UnitProvider>
          </DisabledActivitiesProvider>
        </WeekStartProvider>
      </ActivityTypeProvider>
    </StravaAuthProvider>
  );
}
