"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { getWeeksBack, formatWeekLabel, formatWeekTooltip, getMonthsBack } from '../utils/dateUtils';
import { useStravaActivities } from '../hooks/useStravaActivities';
import { aggregateActivitiesByWeek, generateWeekStarts, metersToMiles } from '../utils/activityAggregation';
import { useWeekStart } from '../context/WeekStartContext';
import { useDisabledActivities } from '../context/DisabledActivitiesContext';
import { useActivityType } from '../context/ActivityTypeContext';
import { StravaActivity, DetailedStravaActivity } from '../types/strava';

type SortField = 'date' | 'name' | 'distance' | 'time' | 'pace' | 'effort' | 'ae' | 'avgHR' | 'maxHR' | 'cadence' | 'zone1' | 'zone2' | 'zone3' | 'zone4' | 'zone5';
type SortDirection = 'asc' | 'desc';
type ColumnId = 'disabled' | 'name' | 'date' | 'distance' | 'time' | 'pace' | 'effort' | 'ae' | 'avgHR' | 'maxHR' | 'cadence' | 'zone1' | 'zone2' | 'zone3' | 'zone4' | 'zone5';

const ALL_COLUMNS: ColumnId[] = ['disabled', 'name', 'date', 'distance', 'time', 'pace', 'effort', 'ae', 'avgHR', 'maxHR', 'cadence', 'zone1', 'zone2', 'zone3', 'zone4', 'zone5'];
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
  cadence: 'Cadence',
  zone1: 'Zone 1',
  zone2: 'Zone 2',
  zone3: 'Zone 3',
  zone4: 'Zone 4',
  zone5: 'Zone 5'
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

function formatPercentage(zoneTime: number, totalTime: number): string {
  if (totalTime === 0 || !isFinite(totalTime)) return '0.0%';
  const percentage = (zoneTime / totalTime) * 100;
  return `${percentage.toFixed(1)}%`;
}

function formatTimeReadable(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return '0s';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
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
  const { weekStartDay, weeksToDisplay, viewMode, monthsToDisplay } = useWeekStart();
  const { isActivityDisabled, toggleActivity } = useDisabledActivities();
  const { activityType } = useActivityType();
  const weeks = useMemo(() => {
    if (viewMode === 'monthly') {
      return getMonthsBack(monthsToDisplay, endDate);
    }
    return getWeeksBack(weeksToDisplay, endDate);
  }, [viewMode, monthsToDisplay, weeksToDisplay, endDate]);

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [nameFilter, setNameFilter] = useState('');
  const [showDisabled, setShowDisabled] = useState(true);

  // Default visible columns (exclude zones by default)
  const defaultVisible = new Set(ALL_COLUMNS.filter(c => !c.startsWith('zone')));
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(defaultVisible);
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(ALL_COLUMNS);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<ColumnId | null>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  // Load visible columns and order from localStorage
  useEffect(() => {
    const savedVisible = localStorage.getItem('activitiesTableColumns');
    if (savedVisible) {
      try {
        const parsed = JSON.parse(savedVisible);
        if (Array.isArray(parsed)) {
          setVisibleColumns(new Set(parsed as ColumnId[]));
        }
      } catch (e) {
        console.error('Failed to parse visible columns', e);
      }
    }

    const savedOrder = localStorage.getItem('activitiesTableColumnOrder');
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        if (Array.isArray(parsed)) {
          // Ensure all columns are present (in case of updates)
          const savedSet = new Set(parsed);
          const missing = ALL_COLUMNS.filter(c => !savedSet.has(c));
          setColumnOrder([...(parsed as ColumnId[]), ...missing]);
        }
      } catch (e) {
        console.error('Failed to parse column order', e);
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

  const handleDragStart = (e: React.DragEvent, col: ColumnId) => {
    setDraggedColumn(col);
    e.dataTransfer.effectAllowed = 'move';
    // Optional: set a transparent drag image or custom styling
  };

  const handleDragOver = (e: React.DragEvent, col: ColumnId) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetCol: ColumnId) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetCol) return;

    const newOrder = [...columnOrder];
    const draggedIdx = newOrder.indexOf(draggedColumn);
    const targetIdx = newOrder.indexOf(targetCol);

    if (draggedIdx === -1 || targetIdx === -1) return;

    // Remove dragged item
    newOrder.splice(draggedIdx, 1);
    // Insert at new position
    newOrder.splice(targetIdx, 0, draggedColumn);

    setColumnOrder(newOrder);
    localStorage.setItem('activitiesTableColumnOrder', JSON.stringify(newOrder));
    setDraggedColumn(null);
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
    if (viewMode === 'monthly') {
      end.setHours(23, 59, 59, 999);
    } else {
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);
    }
    return end;
  }, [endDate, viewMode]);

  // Request zones if any zone column is visible
  const includeZones = useMemo(() => {
    return Array.from(visibleColumns).some(col => col.startsWith('zone'));
  }, [visibleColumns]);

  const { activities, loading, error } = useStravaActivities(startDate, apiEndDate, includeZones);

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

    // Pre-calculate zone times for sorting if needed
    const activitiesWithZoneTimes = filtered.map(activity => {
      const hrZone = activity.zones?.find((z: any) => z.type === 'heartrate');
      const buckets = hrZone?.distribution_buckets || [];
      return {
        ...activity,
        zone1Time: buckets[0]?.time || 0,
        zone2Time: buckets[1]?.time || 0,
        zone3Time: buckets[2]?.time || 0,
        zone4Time: buckets[3]?.time || 0,
        zone5Time: buckets[4]?.time || 0,
      };
    });

    // Apply sorting
    activitiesWithZoneTimes.sort((a, b) => {
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
        case 'zone1':
          comparison = a.zone1Time - b.zone1Time;
          break;
        case 'zone2':
          comparison = a.zone2Time - b.zone2Time;
          break;
        case 'zone3':
          comparison = a.zone3Time - b.zone3Time;
          break;
        case 'zone4':
          comparison = a.zone4Time - b.zone4Time;
          break;
        case 'zone5':
          comparison = a.zone5Time - b.zone5Time;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return activitiesWithZoneTimes;
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
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-700 py-1 max-h-96 overflow-y-auto">
                {columnOrder.map((col, index) => (
                  <div
                    key={col}
                    draggable
                    onDragStart={(e) => handleDragStart(e, col)}
                    onDragOver={(e) => handleDragOver(e, col)}
                    onDrop={(e) => handleDrop(e, col)}
                    className={`flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-move ${draggedColumn === col ? 'opacity-50 bg-gray-50 dark:bg-gray-800' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 cursor-move select-none" title="Drag to reorder">⋮⋮</span>
                      <span className="text-sm text-gray-700 dark:text-gray-200 select-none">{COLUMN_LABELS[col]}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col)}
                      onChange={() => toggleColumn(col)}
                      className="ml-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
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
                {columnOrder.map(colId => {
                  if (!visibleColumns.has(colId)) return null;

                  if (colId === 'disabled') {
                    return (
                      <th key={colId} className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Disabled
                      </th>
                    );
                  }

                  if (colId === 'name') {
                    return (
                      <th
                        key={colId}
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                        onClick={() => handleSort('name')}
                      >
                        Name<SortIcon field="name" />
                      </th>
                    );
                  }

                  return (
                    <th
                      key={colId}
                      className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => handleSort(colId as SortField)}
                      title={colId === 'effort' ? "Relative Effort: Strava's calculated effort score based on heart rate data" : colId === 'ae' ? "Aerobic Efficiency: Speed per heartbeat(AVG Speed / AVG Heart Rate) × 100. Higher values indicate better aerobic fitness and efficiency." : undefined}
                    >
                      {COLUMN_LABELS[colId]}<SortIcon field={colId as SortField} />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedActivities.map((activity) => {
                const distance = metersToMiles(activity.distance);
                const convertedDistance = unit === 'kilometers' ? milesToKm(distance) : distance;
                const aerobicEfficiency = calculateAerobicEfficiency(activity, unit);
                const isDisabled = isActivityDisabled(activity.id);

                // Get zone data
                const hrZone = activity.zones?.find((z: any) => z.type === 'heartrate');
                const buckets = hrZone?.distribution_buckets || [];

                return (
                  <tr key={activity.id}>
                    {columnOrder.map(colId => {
                      if (!visibleColumns.has(colId)) return null;

                      switch (colId) {
                        case 'disabled':
                          return (
                            <td key={colId} className="px-3 sm:px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={isDisabled}
                                onChange={() => toggleActivity(activity.id)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                              />
                            </td>
                          );
                        case 'name':
                          return (
                            <td key={colId} className={`px-3 sm:px-6 py-4 text-sm font-medium max-w-xs truncate ${isDisabled ? 'line-through' : ''}`}>
                              <a
                                href={`https://www.strava.com/activities/${activity.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                              >
                                {activity.name}
                              </a>
                            </td>
                          );
                        case 'date':
                          return (
                            <td key={colId} className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                              {formatDate(activity.start_date)}
                            </td>
                          );
                        case 'distance':
                          return (
                            <td key={colId} className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                              {convertedDistance.toFixed(2)} {unitLabel}
                            </td>
                          );
                        case 'time':
                          return (
                            <td key={colId} className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                              {formatTime(activity.moving_time)}
                            </td>
                          );
                        case 'pace':
                          return (
                            <td key={colId} className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                              {formatPace(activity.average_speed, unit)} {paceLabel}
                            </td>
                          );
                        case 'effort':
                          return (
                            <td key={colId} className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                              {activity.suffer_score || '-'}
                            </td>
                          );
                        case 'ae':
                          return (
                            <td key={colId} className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                              {aerobicEfficiency > 0 ? aerobicEfficiency.toFixed(2) : '-'}
                            </td>
                          );
                        case 'avgHR':
                          return (
                            <td key={colId} className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                              {activity.average_heartrate ? Math.round(activity.average_heartrate) : '-'}
                            </td>
                          );
                        case 'maxHR':
                          return (
                            <td key={colId} className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                              {activity.max_heartrate ? Math.round(activity.max_heartrate) : '-'}
                            </td>
                          );
                        case 'cadence':
                          return (
                            <td key={colId} className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }}>
                              {activity.average_cadence ? Math.round(activity.average_cadence * 2) : '-'}
                            </td>
                          );
                        case 'zone1':
                          return (
                            <td key={colId} className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }} title={buckets[0] ? formatTimeReadable(buckets[0].time) : '0s'}>
                              {buckets[0] ? formatPercentage(buckets[0].time, activity.moving_time) : '-'}
                            </td>
                          );
                        case 'zone2':
                          return (
                            <td key={colId} className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }} title={buckets[1] ? formatTimeReadable(buckets[1].time) : '0s'}>
                              {buckets[1] ? formatPercentage(buckets[1].time, activity.moving_time) : '-'}
                            </td>
                          );
                        case 'zone3':
                          return (
                            <td key={colId} className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }} title={buckets[2] ? formatTimeReadable(buckets[2].time) : '0s'}>
                              {buckets[2] ? formatPercentage(buckets[2].time, activity.moving_time) : '-'}
                            </td>
                          );
                        case 'zone4':
                          return (
                            <td key={colId} className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }} title={buckets[3] ? formatTimeReadable(buckets[3].time) : '0s'}>
                              {buckets[3] ? formatPercentage(buckets[3].time, activity.moving_time) : '-'}
                            </td>
                          );
                        case 'zone5':
                          return (
                            <td key={colId} className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right ${isDisabled ? 'line-through' : ''}`} style={{ fontFamily: monoFont }} title={buckets[4] ? formatTimeReadable(buckets[4].time) : '0s'}>
                              {buckets[4] ? formatPercentage(buckets[4].time, activity.moving_time) : '-'}
                            </td>
                          );
                        default:
                          return null;
                      }
                    })}
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
