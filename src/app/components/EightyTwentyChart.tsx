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
  zone1Time: number;
  zone2Time: number;
  zone3Time: number;
  zone4Time: number;
  zone5Time: number;
}

interface EightyTwentyChartProps {
  endDate: Date;
  unit: 'miles' | 'kilometers';
}

const milesToKm = (miles: number) => miles * 1.60934;

function formatTimeReadable(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return '0 sec';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (mins > 0) parts.push(`${mins} min`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} sec`);

  return parts.join(', ');
}

export default function EightyTwentyChart({ endDate, unit }: EightyTwentyChartProps) {
  const { weekStartDay, weeksToDisplay } = useWeekStart();
  const { disabledActivities } = useDisabledActivities();
  const { maxHeartRate, zones } = useHeartRateZones();
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

  const { activities, loading, error } = useStravaActivities(startDate, apiEndDate, true);

  // Extract heart rate zones from the most recent activity with zone data
  const stravaZones = useMemo(() => {
    // Find the most recent activity with heart rate zone data
    const activitiesWithZones = activities
      .filter(a => !disabledActivities.has(a.id))
      .filter(a => {
        const hrZone = a.zones?.find((z: any) => z.type === "heartrate");
        return hrZone && hrZone.distribution_buckets && hrZone.distribution_buckets.length > 0;
      })
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

    if (activitiesWithZones.length > 0) {
      const mostRecent = activitiesWithZones[0];
      const hrZone = mostRecent.zones?.find((z: any) => z.type === "heartrate");
      return hrZone?.distribution_buckets || [];
    }
    return [];
  }, [activities, disabledActivities]);

  // Find the actual max heart rate from all activities
  const actualMaxHR = useMemo(() => {
    const maxFromActivities = activities
      .filter(a => !disabledActivities.has(a.id))
      .filter(a => a.max_heartrate && a.max_heartrate > 0)
      .reduce((max, activity) => Math.max(max, activity.max_heartrate || 0), 0);

    // If we have zones from Strava, use the max from the highest zone, otherwise use the max from activities
    if (stravaZones.length > 0) {
      const zoneMax = stravaZones[stravaZones.length - 1].max;
      return Math.max(maxFromActivities, zoneMax);
    }

    return maxFromActivities > 0 ? maxFromActivities : maxHeartRate;
  }, [activities, disabledActivities, stravaZones, maxHeartRate]);

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
      let zone1Time = 0;
      let zone2Time = 0;
      let zone3Time = 0;
      let zone4Time = 0;
      let zone5Time = 0;

      // Calculate easy (zones 1-2) vs hard (zones 3-5) miles based on actual zone distribution
      enabledActivities.forEach((activity) => {
        const distanceMiles = metersToMiles(activity.distance);

        // Get heart rate zone distribution from Strava
        const hrZoneData = activity.zones?.find((z: any) => z.type === "heartrate")?.distribution_buckets || [];

        if (hrZoneData.length === 0 || activity.moving_time === 0) {
          // No zone data available, skip this activity
          return;
        }

        // Accumulate time in each zone
        zone1Time += hrZoneData[0]?.time || 0;
        zone2Time += hrZoneData[1]?.time || 0;
        zone3Time += hrZoneData[2]?.time || 0;
        zone4Time += hrZoneData[3]?.time || 0;
        zone5Time += hrZoneData[4]?.time || 0;

        // Calculate time spent in easy zones (1-2) vs hard zones (3-5)
        const easyTime = (hrZoneData[0]?.time || 0) + (hrZoneData[1]?.time || 0);
        const hardTime = (hrZoneData[2]?.time || 0) + (hrZoneData[3]?.time || 0) + (hrZoneData[4]?.time || 0);
        const totalTime = activity.moving_time;

        // Distribute distance proportionally based on time in each category
        if (totalTime > 0) {
          easyMiles += distanceMiles * (easyTime / totalTime);
          hardMiles += distanceMiles * (hardTime / totalTime);
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
        zone1Time,
        zone2Time,
        zone3Time,
        zone4Time,
        zone5Time,
      };
    });
  }, [activities, endDate, disabledActivities, weeksToDisplay]);

  const convertedData = useMemo(() => {
    const data = weeks.map((date, index) => ({
      week: formatWeekLabel(date),
      weekTooltip: formatWeekTooltip(date, weekStartDay),
      weekStartDate: new Date(date),
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
      zone1Time: weeklyData[index]?.zone1Time || 0,
      zone2Time: weeklyData[index]?.zone2Time || 0,
      zone3Time: weeklyData[index]?.zone3Time || 0,
      zone4Time: weeklyData[index]?.zone4Time || 0,
      zone5Time: weeklyData[index]?.zone5Time || 0,
    }));
    // Reverse to show newest first
    return data.reverse();
  }, [weeks, weeklyData, unit, weekStartDay]);

  const maxDistance = Math.max(...convertedData.map(d => d.totalMiles), 1);
  const unitLabel = unit === 'kilometers' ? 'km' : 'mi';

  // Calculate overall stats
  const totalEasy = convertedData.reduce((sum, d) => sum + d.easyMiles, 0);
  const totalHard = convertedData.reduce((sum, d) => sum + d.hardMiles, 0);
  const total = totalEasy + totalHard;

  // Calculate total time in each zone across all weeks
  const totalZone1Time = convertedData.reduce((sum, d) => sum + d.zone1Time, 0);
  const totalZone2Time = convertedData.reduce((sum, d) => sum + d.zone2Time, 0);
  const totalZone3Time = convertedData.reduce((sum, d) => sum + d.zone3Time, 0);
  const totalZone4Time = convertedData.reduce((sum, d) => sum + d.zone4Time, 0);
  const totalZone5Time = convertedData.reduce((sum, d) => sum + d.zone5Time, 0);

  const totalEasyTime = totalZone1Time + totalZone2Time;
  const totalHardTime = totalZone3Time + totalZone4Time + totalZone5Time;
  const totalTime = totalEasyTime + totalHardTime;

  // Calculate percentages based on TIME (not distance) to match the displayed totals
  const overallEasyPercent = totalTime > 0 ? (totalEasyTime / totalTime) * 100 : 0;
  const overallHardPercent = totalTime > 0 ? (totalHardTime / totalTime) * 100 : 0;

  const easyTooltip = `Zone 1: ${formatTimeReadable(totalZone1Time)}\nZone 2: ${formatTimeReadable(totalZone2Time)}`;
  const hardTooltip = `Zone 3: ${formatTimeReadable(totalZone3Time)}\nZone 4: ${formatTimeReadable(totalZone4Time)}\nZone 5: ${formatTimeReadable(totalZone5Time)}`;

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
        <p className="text-xs text-gray-600 dark:text-gray-400 italic">
          Based on actual time spent in each heart rate zone from Strava. Distance is distributed proportionally based on time in easy zones (1-2) vs hard zones (3-5). Activities without zone data are excluded.
        </p>
      </div>
      <div className="space-y-2 sm:space-y-3 flex-1" style={{ minHeight: '250px' }}>
        {convertedData.map((data, index) => {
          const isHovered = hoveredWeek === index;

          // Check if current date is within this week
          const now = new Date();
          const weekEnd = new Date(data.weekStartDate);
          weekEnd.setDate(weekEnd.getDate() + 7);
          const isCurrentWeek = now >= data.weekStartDate && now < weekEnd;

          // Build tooltip with zone times
          const zoneTooltip = `Zone 1: ${formatTimeReadable(data.zone1Time)}\nZone 2: ${formatTimeReadable(data.zone2Time)}\nZone 3: ${formatTimeReadable(data.zone3Time)}\nZone 4: ${formatTimeReadable(data.zone4Time)}\nZone 5: ${formatTimeReadable(data.zone5Time)}`;

          return (
            <div key={index} className="flex items-center gap-2 sm:gap-3 relative">
              <div className={`w-12 sm:w-20 text-[10px] sm:text-sm font-medium text-gray-600 dark:text-gray-300 cursor-help ${isCurrentWeek ? 'font-bold' : ''}`} title={data.weekTooltip}>
                {isCurrentWeek ? 'Current Week' : data.week}
              </div>
              <div
                className="flex-1 relative h-6 sm:h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700"
                onMouseEnter={() => setHoveredWeek(index)}
                onMouseLeave={() => setHoveredWeek(null)}
                title={zoneTooltip}
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
            <span className="flex flex-col cursor-help" title={easyTooltip}>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <strong className="text-gray-800 dark:text-white">Easy: {overallEasyPercent.toFixed(1)}%</strong>
              </span>
              <span className="text-[10px] ml-5 text-gray-500 dark:text-gray-500">
                {formatTimeReadable(totalEasyTime)}
              </span>
            </span>
            <span className="flex flex-col cursor-help" title={hardTooltip}>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <strong className="text-gray-800 dark:text-white">Hard: {overallHardPercent.toFixed(1)}%</strong>
              </span>
              <span className="text-[10px] ml-5 text-gray-500 dark:text-gray-500">
                {formatTimeReadable(totalHardTime)}
              </span>
            </span>
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
              {stravaZones.length > 0 ? (
                stravaZones.map((zone, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="font-medium text-gray-700 dark:text-gray-300">Zone {index + 1}</div>
                    <div className="text-gray-500 dark:text-gray-500">
                      {index === stravaZones.length - 1 ? `> ${zone.min}` : `${zone.min}-${zone.max}`}
                    </div>
                  </div>
                ))
              ) : (
                zones.map((zone) => {
                  const minHR = Math.round((zone.minPercent / 100) * maxHeartRate);
                  const maxHR = Math.round((zone.maxPercent / 100) * maxHeartRate);
                  return (
                    <div key={zone.zone} className="flex flex-col items-center">
                      <div className="font-medium text-gray-700 dark:text-gray-300">Zone {zone.zone}</div>
                      <div className="text-gray-500 dark:text-gray-500">
                        {zone.zone === 5 ? `> ${minHR}` : `${minHR}-${maxHR}`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
            <div className="flex flex-col items-center text-xs">
              <div className="font-medium text-gray-700 dark:text-gray-300">Max HR</div>
              <div className="text-gray-500 dark:text-gray-500">{actualMaxHR} bpm</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
