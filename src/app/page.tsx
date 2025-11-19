"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import WeekSelector from "./components/WeekSelector";
import WeeklyMileageChart from "./components/WeeklyMileageChart";
import AvgCadenceChart from "./components/AvgCadenceChart";
import AvgHeartRateChart from "./components/AvgHeartRateChart";
import ConnectStrava from "./components/ConnectStrava";
import { getLastFullWeek } from "./utils/dateUtils";
import { useUnit } from "./context/UnitContext";
import { useStravaAuth } from "./context/StravaAuthContext";
import { useWeekStart } from "./context/WeekStartContext";

export default function Home() {
  const { weekStartDay } = useWeekStart();
  const [selectedWeek, setSelectedWeek] = useState<Date>(getLastFullWeek(weekStartDay));
  const { unit } = useUnit();
  const { isAuthenticated, setIsAuthenticated, checkAuth } = useStravaAuth();
  const searchParams = useSearchParams();

  // Update selected week when week start day changes
  useEffect(() => {
    setSelectedWeek(getLastFullWeek(weekStartDay));
  }, [weekStartDay]);

  useEffect(() => {
    // Check if user just completed OAuth
    const authSuccess = searchParams.get('auth');
    if (authSuccess === 'success') {
      localStorage.setItem('strava_authenticated', 'true');
      setIsAuthenticated(true);
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams, setIsAuthenticated]);

  const handleConnect = async () => {
    try {
      const response = await fetch('/api/auth/login');
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Failed to initiate Strava connection:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen font-sans bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4">
          <ConnectStrava onConnect={handleConnect} />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen font-sans bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      
      <div className="max-w-7xl mx-auto py-12 px-4">
        <WeekSelector selectedWeek={selectedWeek} onWeekChange={setSelectedWeek} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <WeeklyMileageChart endDate={selectedWeek} unit={unit} />
          <AvgCadenceChart endDate={selectedWeek} />
        </div>
        
        <div className="grid grid-cols-1 gap-8">
          <AvgHeartRateChart endDate={selectedWeek} />
        </div>
      </div>
    </div>
  );
}
