"use client";

import { useState, useEffect } from "react";
import WeekSelector from "./components/WeekSelector";
import WeeklyMileageChart from "./components/WeeklyMileageChart";
import LongestDistanceChart from "./components/LongestDistanceChart";
import AvgCadenceChart from "./components/AvgCadenceChart";
import ConnectStrava from "./components/ConnectStrava";
import { getLastFullWeek } from "./utils/dateUtils";
import { useUnit } from "./context/UnitContext";
import { useStravaAuth } from "./context/StravaAuthContext";
import { useWeekStart } from "./context/WeekStartContext";

export default function Home() {
  const { weekStartDay } = useWeekStart();
  const [selectedWeek, setSelectedWeek] = useState<Date>(getLastFullWeek(weekStartDay));
  const { unit } = useUnit();
  const { isAuthenticated, setIsAuthenticated } = useStravaAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check for auth success in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('auth');
    
    if (authSuccess === 'success') {
      localStorage.setItem('strava_authenticated', 'true');
      setIsAuthenticated(true);
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
    
    setIsCheckingAuth(false);
  }, [setIsAuthenticated]);

  // Update selected week when week start day changes
  useEffect(() => {
    setSelectedWeek(getLastFullWeek(weekStartDay));
  }, [weekStartDay]);

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

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="font-sans bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="font-sans bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4">
          <ConnectStrava onConnect={handleConnect} />
        </div>
      </div>
    );
  }
  
  return (
    <div className="font-sans bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <WeekSelector selectedWeek={selectedWeek} onWeekChange={setSelectedWeek} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <WeeklyMileageChart endDate={selectedWeek} unit={unit} />
          <LongestDistanceChart endDate={selectedWeek} unit={unit} />
        </div>

        <div className="grid grid-cols-1 gap-8 mb-8">
          <AvgCadenceChart endDate={selectedWeek} />
        </div>
      </div>
    </div>
  );
}
