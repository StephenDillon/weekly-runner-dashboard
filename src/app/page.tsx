"use client";

import { useState, useEffect } from "react";
import WeekSelector from "./components/WeekSelector";
import WeeklyMileageChart from "./components/WeeklyMileageChart";
import LongestDistanceChart from "./components/LongestDistanceChart";
import DetailedMetricsTable from "./components/DetailedMetricsTable";
import ConnectStrava from "./components/ConnectStrava";
import EightyTwentyChart from "./components/EightyTwentyChart";

import RacesTab from "./components/RacesTab";
import ChartsTab from "./components/ChartsTab";
import RaceCountdownCard from "./components/RaceCountdownCard";
import { getLastFullWeek } from "./utils/dateUtils";
import { useUnit } from "./context/UnitContext";
import { useStravaAuth } from "./context/StravaAuthContext";
import { useWeekStart } from "./context/WeekStartContext";
import { useHeartRateZones } from "./context/HeartRateZonesContext";
import { useRaces } from "./hooks/useRaces";

type TabType = 'dashboard' | 'detailed' | 'charts' | 'races';

export default function Home() {
  const { weekStartDay } = useWeekStart();
  const [selectedWeek, setSelectedWeek] = useState<Date>(getLastFullWeek(weekStartDay));
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const { unit } = useUnit();
  const { isAuthenticated, setIsAuthenticated } = useStravaAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { enabled: hrZonesEnabled } = useHeartRateZones();
  const { races, addRace, removeRace } = useRaces();

  // Check for auth success in URL on mount
  useEffect(() => {
    const checkAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const authSuccess = params.get('auth');

      if (authSuccess === 'success') {
        // Clean up URL
        window.history.replaceState({}, '', '/');
      }

      // Always check auth status from server (cookies)
      try {
        const response = await fetch('/api/v1/auth/status');
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
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
          <nav className="-mb-px flex space-x-8 min-w-max text-sm sm:text-base overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`py-4 px-1 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'detailed'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              Activities
            </button>
            <button
              onClick={() => setActiveTab('charts')}
              className={`py-4 px-1 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'charts'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              Charts
            </button>
            <button
              onClick={() => setActiveTab('races')}
              className={`py-4 px-1 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'races'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              Races
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            {races.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
                {races.map((race) => (
                  <RaceCountdownCard key={race.id} race={race} />
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
              <WeeklyMileageChart endDate={selectedWeek} unit={unit} />
              <LongestDistanceChart endDate={selectedWeek} unit={unit} />
            </div>
            {hrZonesEnabled && (
              <div className="mb-4 sm:mb-6 md:mb-8">
                <EightyTwentyChart endDate={selectedWeek} unit={unit} />
              </div>
            )}
          </>
        )}

        {activeTab === 'detailed' && (
          <DetailedMetricsTable endDate={selectedWeek} unit={unit} />
        )}

        {activeTab === 'charts' && (
          <ChartsTab endDate={selectedWeek} unit={unit} />
        )}

        {activeTab === 'races' && (
          <RacesTab races={races} onAddRace={addRace} onRemoveRace={removeRace} />
        )}
      </div>
    </div>
  );
}
