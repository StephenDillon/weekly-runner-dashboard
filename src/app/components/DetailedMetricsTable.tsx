"use client";

import React, { useMemo } from 'react';
import { getWeeksBack, formatWeekLabel, formatWeekTooltip } from '../utils/dateUtils';
import { useStravaActivities } from '../hooks/useStravaActivities';
import { aggregateActivitiesByWeek, generateWeekStarts, metersToMiles } from '../utils/activityAggregation';
import { useWeekStart } from '../context/WeekStartContext';
import { useDisabledActivities } from '../context/DisabledActivitiesContext';
import { useActivityType } from '../context/ActivityTypeContext';
import { StravaActivity } from '../types/strava';

interface DetailedMetricsTableProps {
  endDate: Date;
  unit: 'miles' | 'kilometers';
}

const milesToKm = (miles: number) => miles * 1.60934;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const day = date.getDate().toString().padStart(2, '0');
  return `${month} ${day}`;
}

function formatTime(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  // Use non-breaking spaces to preserve alignment
  return `\u00A0\u00A0\u00A0${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatPace(metersPerSecond: number, unit: 'miles' | 'kilometers'): string {
  if (metersPerSecond === 0 || !isFinite(metersPerSecond)) return 'N/A';
  
  const minutesPerUnit = unit === 'kilometers' 
    ? 16.6667 / metersPerSecond  // minutes per km
    : 26.8224 / metersPerSecond; // minutes per mile
    
  const mins = Math.floor(minutesPerUnit);
  const secs = Math.round((minutesPerUnit - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function calculateAerobicEfficiency(activity: StravaActivity, unit: 'miles' | 'kilometers'): number {
  // Aerobic Efficiency (AE) = Normalized Graded Pace (NGP) / Average Heart Rate
  // For simplicity, we'll use pace instead of NGP since we don't have elevation-adjusted data
  // Higher values indicate better aerobic efficiency
  
  if (!activity.average_heartrate || activity.average_heartrate === 0) return 0;
  if (!activity.average_speed || activity.average_speed === 0) return 0;
  
  const paceMinutes = unit === 'kilometers'
    ? 16.6667 / activity.average_speed  // minutes per km
    : 26.8224 / activity.average_speed; // minutes per mile
  
  // AE = (60 / pace) / HR * 100
  // This gives us speed per heartbeat, normalized to a percentage
  const efficiency = (60 / paceMinutes) / activity.average_heartrate * 100;
  
  return efficiency;
}

interface WeekMetrics {
  totalDistance: number;
  longestRun: number;
  minHeartRate: number;
  maxHeartRate: number;
  avgHeartRate: number;
  heartRateCount: number;
}

export default function DetailedMetricsTable({ endDate, unit }: DetailedMetricsTableProps) {
  const { weekStartDay, weeksToDisplay } = useWeekStart();
  const { isActivityDisabled, toggleActivity } = useDisabledActivities();
  const { activityType } = useActivityType();
  const weeks = getWeeksBack(weeksToDisplay, endDate);
  
  const startDate = useMemo(() => {
    const start = new Date(weeks[0]);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [weeks]);

  const apiEndDate = useMemo(() => {
    const end = new Date(endDate);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [endDate]);

  const { activities, loading, error } = useStravaActivities(startDate, apiEndDate);

  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => 
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  }, [activities]);

  const unitLabel = unit === 'kilometers' ? 'km' : 'mi';
  const paceLabel = unit === 'kilometers' ? '/km' : '/mi';

  // Use Consolas or fallback monospace fonts with normal zero (no slash or dot)
  const monoFont = 'Consolas, "Courier New", Courier, monospace';

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Activities</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading activities...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Activities</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">Error loading activities: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 overflow-hidden">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800 dark:text-white">Activities</h2>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Enable
                </th>
                <th className="sticky left-12 z-10 bg-gray-50 dark:bg-gray-900 px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Date
                </th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Distance
                </th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Time
                </th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Pace
                </th>
                <th 
                  className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-help"
                  title="Aerobic Efficiency: Speed per heartbeat(AVG Speed / AVG Heart Rate) × 100. Higher values indicate better aerobic fitness and efficiency."
                >
                  AE
                </th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Avg HR
                </th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Max HR
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedActivities.map((activity) => {
                const distance = metersToMiles(activity.distance);
                const convertedDistance = unit === 'kilometers' ? milesToKm(distance) : distance;
                const aerobicEfficiency = calculateAerobicEfficiency(activity, unit);
                const isDisabled = isActivityDisabled(activity.id);
                
                return (
                  <tr key={activity.id} className={isDisabled ? 'opacity-50' : ''}>
                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 sm:px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={!isDisabled}
                        onChange={() => toggleActivity(activity.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                      />
                    </td>
                    <td className="sticky left-12 z-10 bg-white dark:bg-gray-800 px-3 sm:px-6 py-4 text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate">
                      {activity.name}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }}>
                      {formatDate(activity.start_date)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }}>
                      {convertedDistance.toFixed(2)} {unitLabel}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }}>
                      {formatTime(activity.moving_time)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }}>
                      {formatPace(activity.average_speed, unit)} {paceLabel}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }}>
                      {aerobicEfficiency > 0 ? aerobicEfficiency.toFixed(2) : '-'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }}>
                      {activity.average_heartrate ? Math.round(activity.average_heartrate) : '-'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }}>
                      {activity.max_heartrate ? Math.round(activity.max_heartrate) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
