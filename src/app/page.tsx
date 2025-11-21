"use client";

import { useState, useEffect } from "react";
import WeekSelector from "./components/WeekSelector";
import WeeklyMileageChart from "./components/WeeklyMileageChart";
import LongestDistanceChart from "./components/LongestDistanceChart";
import AvgCadenceChart from "./components/AvgCadenceChart";
import DetailedMetricsTable from "./components/DetailedMetricsTable";
import PaceAnalysisChart from "./components/PaceAnalysisChart";
import ConnectStrava from "./components/ConnectStrava";
import { getLastFullWeek } from "./utils/dateUtils";
import { useUnit } from "./context/UnitContext";
import { useStravaAuth } from "./context/StravaAuthContext";
import { useWeekStart } from "./context/WeekStartContext";
import { useActivityType } from "./context/ActivityTypeContext";

type TabType = 'dashboard' | 'detailed' | 'pace';

export default function Home() {
  const { weekStartDay } = useWeekStart();
  const [selectedWeek, setSelectedWeek] = useState<Date>(getLastFullWeek(weekStartDay));
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const { unit } = useUnit();
  const { isAuthenticated, setIsAuthenticated } = useStravaAuth();
  const { activityType } = useActivityType();
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
      const response = await fetch('/api/v1/auth/login');
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
      <div className="max-w-7xl mx-auto py-4 sm:py-8 md:py-12 px-3 sm:px-4">
        <WeekSelector selectedWeek={selectedWeek} onWeekChange={setSelectedWeek} />
        
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'detailed'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Detailed Metrics
            </button>
            <button
              onClick={() => setActiveTab('pace')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pace'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Pace Analysis
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
              <WeeklyMileageChart endDate={selectedWeek} unit={unit} />
              <LongestDistanceChart endDate={selectedWeek} unit={unit} />
            </div>

            {activityType === 'running' && (
              <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
                <AvgCadenceChart endDate={selectedWeek} />
              </div>
            )}
          </>
        )}

        {activeTab === 'detailed' && (
          <DetailedMetricsTable endDate={selectedWeek} unit={unit} />
        )}

        {activeTab === 'pace' && (
          <PaceAnalysisChart endDate={selectedWeek} unit={unit} />
        )}
      </div>
    </div>
  );
}
