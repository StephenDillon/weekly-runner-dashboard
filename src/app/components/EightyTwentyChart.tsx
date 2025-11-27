"use client";

import React, { useMemo, useState, useRef } from 'react';
import { getWeeksBack, formatWeekLabel, formatWeekTooltip } from '../utils/dateUtils';
import { useStravaActivities } from '../hooks/useStravaActivities';
import { generateWeekStarts, metersToMiles } from '../utils/activityAggregation';
import { useWeekStart } from '../context/WeekStartContext';
import { useDisabledActivities } from '../context/DisabledActivitiesContext';
import { useHeartRateZones } from '../context/HeartRateZonesContext';

interface WeekData {
  week: string;
  weekTooltip: string;
  easyMiles: number;
  hardMiles: number;
  totalMiles: number;
  easyPercent: number;
  hardPercent: number;
}

interface EightyTwentyChartProps {
  endDate: Date;
  unit: 'miles' | 'kilometers';
}

const milesToKm = (miles: number) => miles * 1.60934;

export default function EightyTwentyChart({ endDate, unit }: EightyTwentyChartProps) {
  const { weekStartDay, weeksToDisplay } = useWeekStart();
  const { disabledActivities } = useDisabledActivities();
  const { zones, maxHeartRate } = useHeartRateZones();
  const weeks = getWeeksBack(weeksToDisplay, endDate);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);
  
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

  const weeklyData = useMemo(() => {
    const weekStarts = generateWeekStarts(endDate, weeksToDisplay);
    
    return weekStarts.map((weekStart) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekActivities = activities.filter((activity) => {
        const activityDate = new Date(activity.start_date);
        return activityDate >= weekStart && activityDate < weekEnd;
      });

      const enabledActivities = weekActivities.filter(
        (activity) => !disabledActivities.has(activity.id)
      );

      let easyMiles = 0;
      let hardMiles = 0;

      // Calculate easy (zones 1-2) vs hard (zones 3-5) miles
      enabledActivities.forEach((activity) => {
        if (!activity.average_heartrate || activity.average_heartrate <= 0) {
          return; // Skip activities without HR data
        }

        const distanceMiles = metersToMiles(activity.distance);
        const avgHR = activity.average_heartrate;

        // Determine which zone this activity falls into based on avg HR
        let activityZone = 1; // default to zone 1
        for (const zone of zones) {
          const minHR = (zone.minPercent / 100) * maxHeartRate;
          const maxHR = (zone.maxPercent / 100) * maxHeartRate;
          if (avgHR >= minHR && avgHR <= maxHR) {
            activityZone = zone.zone;
            break;
          }
        }

        // Zones 1-2 are "easy" (80%), zones 3-5 are "hard" (20%)
        if (activityZone <= 2) {
          easyMiles += distanceMiles;
        } else {
          hardMiles += distanceMiles;
        }
      });

      const totalMiles = easyMiles + hardMiles;
      const easyPercent = totalMiles > 0 ? (easyMiles / totalMiles) * 100 : 0;
      const hardPercent = totalMiles > 0 ? (hardMiles / totalMiles) * 100 : 0;

      return {
        weekStart,
        easyMiles,
        hardMiles,
        totalMiles,
        easyPercent,
        hardPercent,
      };
    });
  }, [activities, endDate, disabledActivities, weeksToDisplay, zones, maxHeartRate]);

  const convertedData = useMemo(() => {
    return weeks.map((date, index) => ({
      week: formatWeekLabel(date),
      weekTooltip: formatWeekTooltip(date, weekStartDay),
      easyMiles: unit === 'kilometers' 
        ? milesToKm(weeklyData[index]?.easyMiles || 0)
        : (weeklyData[index]?.easyMiles || 0),
      hardMiles: unit === 'kilometers'
        ? milesToKm(weeklyData[index]?.hardMiles || 0)
        : (weeklyData[index]?.hardMiles || 0),
      totalMiles: unit === 'kilometers'
        ? milesToKm(weeklyData[index]?.totalMiles || 0)
        : (weeklyData[index]?.totalMiles || 0),
      easyPercent: weeklyData[index]?.easyPercent || 0,
      hardPercent: weeklyData[index]?.hardPercent || 0,
    }));
  }, [weeks, weeklyData, unit, weekStartDay]);
  
  const maxDistance = Math.max(...convertedData.map(d => d.totalMiles), 1);
  const unitLabel = unit === 'kilometers' ? 'km' : 'mi';

  // Calculate overall stats
  const totalEasy = convertedData.reduce((sum, d) => sum + d.easyMiles, 0);
  const totalHard = convertedData.reduce((sum, d) => sum + d.hardMiles, 0);
  const total = totalEasy + totalHard;
  const overallEasyPercent = total > 0 ? (totalEasy / total) * 100 : 0;
  const overallHardPercent = total > 0 ? (totalHard / total) * 100 : 0;
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col h-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white h-8">80/20 Training Distribution</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Loading activities...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col h-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white h-8">80/20 Training Distribution</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500 dark:text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 flex flex-col h-full">
      <div className="mb-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2">80/20 Training Distribution</h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          The 80/20 rule suggests that 80% of your training volume should be at low intensity (Easy - Zones 1-2) and 20% at moderate to high intensity (Hard - Zones 3-5). This approach helps build aerobic base, prevents overtraining, and allows for proper recovery while still incorporating necessary high-intensity work for performance gains.
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-1">
          Based on average heart rate for each activity. Zones 1-2 (Easy) should be ~80%, Zones 3-5 (Hard) should be ~20%. 
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-1">
            Using average HR per workout may not be fully accurate for workouts with varied intensities. Planned improvements will be to analyze HR data points within each activity.
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 italic">
          Zones are set by default using the max heart rate found in your activities and can be adjusted in the config section (gear icon). This chart can be disabled by unchecking Heart Rate Zones in config.
        </p>
      </div>
      <div className="space-y-2 sm:space-y-3 flex-1" style={{ minHeight: '250px' }}>
        {convertedData.map((data, index) => {
          const isHovered = hoveredWeek === index;
          
          return (
            <div key={index} className="flex items-center gap-2 sm:gap-3 relative">
              <div className="w-12 sm:w-20 text-[10px] sm:text-sm font-medium text-gray-600 dark:text-gray-300 cursor-help" title={data.weekTooltip}>
                {data.week}
              </div>
              <div 
                className="flex-1 relative h-6 sm:h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700"
                onMouseEnter={() => setHoveredWeek(index)}
                onMouseLeave={() => setHoveredWeek(null)}
              >
                {data.totalMiles > 0 ? (
                  <div className="h-full flex relative">
                    {/* Easy miles (green) */}
                    <div
                      className="bg-linear-to-r from-green-500 to-green-600 h-full flex items-center justify-center transition-all duration-300"
                      style={{ width: `${data.easyPercent}%` }}
                    >
                      {data.easyPercent > 15 && (
                        <span className="text-white text-[10px] sm:text-xs font-semibold">
                          {data.easyPercent.toFixed(0)}%
                        </span>
                      )}
                    </div>
                    {/* Hard miles (red) */}
                    <div
                      className="bg-linear-to-r from-red-500 to-red-600 h-full flex items-center justify-center transition-all duration-300"
                      style={{ width: `${data.hardPercent}%` }}
                    >
                      {data.hardPercent > 15 && (
                        <span className="text-white text-[10px] sm:text-xs font-semibold">
                          {data.hardPercent.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500 text-xs">No HR data</span>
                  </div>
                )}
                
                {/* Tooltip */}
                {isHovered && data.totalMiles > 0 && (
                  <div className="absolute left-0 top-10 z-50 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-3 min-w-[200px]">
                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        {data.weekTooltip}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Easy: {data.easyMiles.toFixed(1)} {unitLabel} ({data.easyPercent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Hard: {data.hardMiles.toFixed(1)} {unitLabel} ({data.hardPercent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="pt-1 mt-1 border-t border-gray-200 dark:border-gray-600">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          Total: {data.totalMiles.toFixed(1)} {unitLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 min-h-12 sm:min-h-14">
        <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <strong className="text-gray-800 dark:text-white">Easy: {overallEasyPercent.toFixed(1)}%</strong>
            </span>
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <strong className="text-gray-800 dark:text-white">Hard: {overallHardPercent.toFixed(1)}%</strong>
            </span>
          </div>
          <span>
            Target: <strong className="text-gray-800 dark:text-white">80% Easy / 20% Hard</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
