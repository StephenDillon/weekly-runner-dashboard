"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { getWeeksBack, formatWeekLabel, formatWeekTooltip } from '../utils/dateUtils';
import { useStravaActivities } from '../hooks/useStravaActivities';
import { aggregateActivitiesByWeek, generateWeekStarts, metersToMiles } from '../utils/activityAggregation';
import { useWeekStart } from '../context/WeekStartContext';
import { useDisabledActivities } from '../context/DisabledActivitiesContext';
import { useActivityType } from '../context/ActivityTypeContext';
import { StravaActivity } from '../types/strava';

type SortField = 'date' | 'name' | 'distance' | 'time' | 'pace' | 'effort' | 'ae' | 'avgHR' | 'maxHR' | 'cadence';
type SortDirection = 'asc' | 'desc';
type ColumnId = 'disabled' | 'name' | 'date' | 'distance' | 'time' | 'pace' | 'effort' | 'ae' | 'avgHR' | 'maxHR' | 'cadence';

const ALL_COLUMNS: ColumnId[] = ['disabled', 'name', 'date', 'distance', 'time', 'pace', 'effort', 'ae', 'avgHR', 'maxHR', 'cadence'];
const COLUMN_LABELS: Record<ColumnId, string> = {
  disabled: 'Disabled',
  name: 'Name',
  date: 'Date',
  distance: 'Distance',
  time: 'Time',
  pace: 'Pace',
  effort: 'Effort',
  ae: 'AE',
  avgHR: 'Avg HR',
  maxHR: 'Max HR',
  cadence: 'Cadence'
};

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

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [nameFilter, setNameFilter] = useState('');
  const [showDisabled, setShowDisabled] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(new Set(ALL_COLUMNS));
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  // Load visible columns from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('activitiesTableColumns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setVisibleColumns(new Set(parsed as ColumnId[]));
        }
      } catch (e) {
        console.error('Failed to parse visible columns', e);
      }
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleColumn = (column: ColumnId) => {
    const newSet = new Set(visibleColumns);
    if (newSet.has(column)) {
      newSet.delete(column);
    } else {
      newSet.add(column);
    }
    setVisibleColumns(newSet);
    localStorage.setItem('activitiesTableColumns', JSON.stringify(Array.from(newSet)));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-400">↕</span>;
    }
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

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
    let filtered = [...activities];

    // Apply name filter
    if (nameFilter.trim()) {
      const filterLower = nameFilter.toLowerCase();
      filtered = filtered.filter(a => a.name.toLowerCase().includes(filterLower));
    }

    // Apply disabled filter
    if (!showDisabled) {
      filtered = filtered.filter(a => !isActivityDisabled(a.id));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'distance':
          comparison = a.distance - b.distance;
          break;
        case 'time':
          comparison = a.moving_time - b.moving_time;
          break;
        case 'pace':
          comparison = a.average_speed - b.average_speed;
          break;
        case 'effort':
          comparison = (a.suffer_score || 0) - (b.suffer_score || 0);
          break;
        case 'ae':
          const aeA = calculateAerobicEfficiency(a, unit);
          const aeB = calculateAerobicEfficiency(b, unit);
          comparison = aeA - aeB;
          break;
        case 'avgHR':
          comparison = (a.average_heartrate || 0) - (b.average_heartrate || 0);
          break;
        case 'maxHR':
          comparison = (a.max_heartrate || 0) - (b.max_heartrate || 0);
          break;
        case 'cadence':
          comparison = (a.average_cadence || 0) - (b.average_cadence || 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [activities, sortField, sortDirection, nameFilter, showDisabled, isActivityDisabled, unit]);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Activities</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Filter by name..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showDisabled}
              onChange={(e) => setShowDisabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
            />
            Show disabled
          </label>

          {/* Column Toggle Dropdown */}
          <div className="relative" ref={columnMenuRef}>
            <button
              onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Columns ▼
            </button>

            {isColumnMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-700 py-1 max-h-96 overflow-y-auto">
                {ALL_COLUMNS.map((col) => (
                  <label key={col} className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col)}
                      onChange={() => toggleColumn(col)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">{COLUMN_LABELS[col]}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {visibleColumns.has('disabled') && (
                  <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Disabled
                  </th>
                )}
                {visibleColumns.has('name') && (
                  <th
                    className="sticky left-12 z-10 bg-gray-50 dark:bg-gray-900 px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('name')}
                  >
                    Name<SortIcon field="name" />
                  </th>
                )}
                {visibleColumns.has('date') && (
                  <th
                    className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('date')}
                  >
                    Date<SortIcon field="date" />
                  </th>
                )}
                {visibleColumns.has('distance') && (
                  <th
                    className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('distance')}
                  >
                    Distance<SortIcon field="distance" />
                  </th>
                )}
                {visibleColumns.has('time') && (
                  <th
                    className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('time')}
                  >
                    Time<SortIcon field="time" />
                  </th>
                )}
                {visibleColumns.has('pace') && (
                  <th
                    className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('pace')}
                  >
                    Pace<SortIcon field="pace" />
                  </th>
                )}
                {visibleColumns.has('effort') && (
                  <th
                    className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('effort')}
                    title="Relative Effort: Strava's calculated effort score based on heart rate data"
                  >
                    Effort<SortIcon field="effort" />
                  </th>
                )}
                {visibleColumns.has('ae') && (
                  <th
                    className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('ae')}
                    title="Aerobic Efficiency: Speed per heartbeat(AVG Speed / AVG Heart Rate) × 100. Higher values indicate better aerobic fitness and efficiency."
                  >
                    AE<SortIcon field="ae" />
                  </th>
                )}
                {visibleColumns.has('avgHR') && (
                  <th
                    className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('avgHR')}
                  >
                    Avg HR<SortIcon field="avgHR" />
                  </th>
                )}
                {visibleColumns.has('maxHR') && (
                  <th
                    className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('maxHR')}
                  >
                    Max HR<SortIcon field="maxHR" />
                  </th>
                )}
                {visibleColumns.has('cadence') && (
                  <th
                    className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('cadence')}
                  >
                    Cadence<SortIcon field="cadence" />
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedActivities.map((activity) => {
                const distance = metersToMiles(activity.distance);
                const convertedDistance = unit === 'kilometers' ? milesToKm(distance) : distance;
                const aerobicEfficiency = calculateAerobicEfficiency(activity, unit);
                const isDisabled = isActivityDisabled(activity.id);

                return (
                  <tr key={activity.id}>
                    {visibleColumns.has('disabled') && (
                      <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 sm:px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isDisabled}
                          onChange={() => toggleActivity(activity.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                        />
                      </td>
                    )}
                    {visibleColumns.has('name') && (
                      <td className={`sticky left-12 z-10 bg-white dark:bg-gray-800 px-3 sm:px-6 py-4 text-sm font-medium max-w-xs truncate ${isDisabled ? 'line-through' : ''}`}>
                        <a
                          href={`https://www.strava.com/activities/${activity.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                        >
                          {activity.name}
                        </a>
                      </td>
                    )}
                    {visibleColumns.has('date') && (
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                        {formatDate(activity.start_date)}
                      </td>
                    )}
                    {visibleColumns.has('distance') && (
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                        {convertedDistance.toFixed(2)} {unitLabel}
                      </td>
                    )}
                    {visibleColumns.has('time') && (
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                        {formatTime(activity.moving_time)}
                      </td>
                    )}
                    {visibleColumns.has('pace') && (
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                        {formatPace(activity.average_speed, unit)} {paceLabel}
                      </td>
                    )}
                    {visibleColumns.has('effort') && (
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                        {activity.suffer_score || '-'}
                      </td>
                    )}
                    {visibleColumns.has('ae') && (
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                        {aerobicEfficiency > 0 ? aerobicEfficiency.toFixed(2) : '-'}
                      </td>
                    )}
                    {visibleColumns.has('avgHR') && (
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                        {activity.average_heartrate ? Math.round(activity.average_heartrate) : '-'}
                      </td>
                    )}
                    {visibleColumns.has('maxHR') && (
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                        {activity.max_heartrate ? Math.round(activity.max_heartrate) : '-'}
                      </td>
                    )}
                    {visibleColumns.has('cadence') && (
                      <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                        {activity.average_cadence ? Math.round(activity.average_cadence * 2) : '-'}
                      </td>
                    )}
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
