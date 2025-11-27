"use client";

import React, { useState, useEffect } from 'react';
import { useHeartRateZones } from '../context/HeartRateZonesContext';
import { useStravaActivities } from '../hooks/useStravaActivities';
import { getWeeksBack } from '../utils/dateUtils';
import { useWeekStart } from '../context/WeekStartContext';

export default function HeartRateZonesConfig() {
  const { 
    enabled, 
    setEnabled, 
    maxHeartRate, 
    setMaxHeartRate, 
    zones, 
    setZones,
    isMaxHRUserSet,
    setIsMaxHRUserSet
  } = useHeartRateZones();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [tempMaxHR, setTempMaxHR] = useState(maxHeartRate.toString());
  const { weeksToDisplay } = useWeekStart();

  // Get activities to find max HR
  const endDate = new Date();
  const weeks = getWeeksBack(weeksToDisplay, endDate);
  const startDate = new Date(weeks[0]);
  startDate.setHours(0, 0, 0, 0);
  const apiEndDate = new Date(endDate);
  apiEndDate.setDate(apiEndDate.getDate() + 7);
  apiEndDate.setHours(23, 59, 59, 999);
  const { activities } = useStravaActivities(startDate, apiEndDate);

  // Update max HR from activities if not user-set
  useEffect(() => {
    if (!isMaxHRUserSet && activities.length > 0) {
      const maxHRFromActivities = Math.max(
        ...activities.map(a => a.max_heartrate || 0).filter(hr => hr > 0)
      );
      if (maxHRFromActivities > 0) {
        setMaxHeartRate(maxHRFromActivities);
        setTempMaxHR(maxHRFromActivities.toString());
      }
    }
  }, [activities, isMaxHRUserSet, setMaxHeartRate]);

  const handleMaxHRChange = (value: string) => {
    setTempMaxHR(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 250) {
      setMaxHeartRate(numValue);
      setIsMaxHRUserSet(true);
    }
  };

  const handleZoneChange = (zoneIndex: number, field: 'minPercent' | 'maxPercent', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      const newZones = [...zones];
      newZones[zoneIndex] = { ...newZones[zoneIndex], [field]: numValue };
      setZones(newZones);
    }
  };

  const calculateHRRange = (minPercent: number, maxPercent: number) => {
    const minHR = Math.round((minPercent / 100) * maxHeartRate);
    const maxHR = Math.round((maxPercent / 100) * maxHeartRate);
    return `${minHR} - ${maxHR}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
          />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
            Heart Rate Zones
          </h2>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <svg
            className={`w-6 h-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Max Heart Rate Input */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Max Heart Rate (bpm):
            </label>
            <input
              type="number"
              value={tempMaxHR}
              onChange={(e) => handleMaxHRChange(e.target.value)}
              min="100"
              max="250"
              className="px-3 py-1.5 w-24 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {!isMaxHRUserSet && (
              <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                (Auto-detected from activities)
              </span>
            )}
          </div>

          {/* Zones Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Zone
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    HR Range (bpm)
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    % Min
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    % Max
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Purpose
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {zones.map((zone, index) => (
                  <tr key={zone.zone}>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-300">
                      {zone.zone}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                      {zone.name}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-300">
                      {calculateHRRange(zone.minPercent, zone.maxPercent)}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={zone.minPercent}
                        onChange={(e) => handleZoneChange(index, 'minPercent', e.target.value)}
                        min="0"
                        max="100"
                        step="1"
                        className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={zone.maxPercent}
                        onChange={(e) => handleZoneChange(index, 'maxPercent', e.target.value)}
                        min="0"
                        max="100"
                        step="1"
                        className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                      {zone.purpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
