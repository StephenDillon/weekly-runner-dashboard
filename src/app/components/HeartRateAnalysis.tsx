"use client";

import React, { useMemo, useState } from 'react';
import { getWeeksBack } from '../utils/dateUtils';
import { useActivitiesWithZones } from '../hooks/useActivitiesWithZones';
import { metersToMiles } from '../utils/activityAggregation';
import { useWeekStart } from '../context/WeekStartContext';
import { useDisabledActivities } from '../context/DisabledActivitiesContext';

type SortField = 'date' | 'name' | 'distance' | 'time' | 'pace' | 'effort' | 'zone1' | 'zone2' | 'zone3' | 'zone4' | 'zone5';
type SortDirection = 'asc' | 'desc';

interface HeartRateAnalysisProps {
  endDate: Date;
  unit: 'miles' | 'kilometers';
}

const milesToKm = (miles: number) => miles * 1.60934;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

function formatTime(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return '0';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
  if (totalTime === 0 || !isFinite(totalTime)) return '0.00%';
  const percentage = (zoneTime / totalTime) * 100;
  return `${percentage.toFixed(2)}%`;
}

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

export default function HeartRateAnalysis({ endDate, unit }: HeartRateAnalysisProps) {
  const { weeksToDisplay } = useWeekStart();
  const { isActivityDisabled } = useDisabledActivities();
  const weeks = getWeeksBack(weeksToDisplay, endDate);
  
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [nameFilter, setNameFilter] = useState('');
  const [showDisabled, setShowDisabled] = useState(true);
  
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

  const { activities, loading, error } = useActivitiesWithZones(startDate, apiEndDate);

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
    
    // Calculate zone times for sorting
    const activitiesWithZones = filtered.map(activity => {
      // Find the heartrate zone object and get distribution_buckets
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
    activitiesWithZones.sort((a, b) => {
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
    
    return activitiesWithZones;
  }, [activities, sortField, sortDirection, nameFilter, showDisabled, isActivityDisabled]);

  const unitLabel = unit === 'kilometers' ? 'km' : 'mi';
  const paceLabel = unit === 'kilometers' ? '/km' : '/mi';

  const monoFont = 'Consolas, "Courier New", Courier, monospace';

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Heart Rate Analysis</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading heart rate data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Heart Rate Analysis</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">Error loading heart rate data: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Heart Rate Analysis</h2>
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
        </div>
      </div>
      
      {sortedActivities.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">No activities with heart rate data found</div>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th 
                    className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('name')}
                  >
                    Activity<SortIcon field="name" />
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('date')}
                  >
                    Date<SortIcon field="date" />
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('distance')}
                  >
                    Distance<SortIcon field="distance" />
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('time')}
                  >
                    Time<SortIcon field="time" />
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('pace')}
                  >
                    Pace<SortIcon field="pace" />
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('effort')}
                    title="Relative Effort: Strava's calculated effort score based on heart rate data"
                  >
                    Effort<SortIcon field="effort" />
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('zone1')}
                  >
                    Z1<SortIcon field="zone1" />
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('zone2')}
                  >
                    Z2<SortIcon field="zone2" />
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('zone3')}
                  >
                    Z3<SortIcon field="zone3" />
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('zone4')}
                  >
                    Z4<SortIcon field="zone4" />
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('zone5')}
                  >
                    Z5<SortIcon field="zone5" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedActivities.map((activity) => {
                  const distance = metersToMiles(activity.distance);
                  const convertedDistance = unit === 'kilometers' ? milesToKm(distance) : distance;
                  const isDisabled = isActivityDisabled(activity.id);
                  // Find the heartrate zone object and get distribution_buckets
                  const hrZone = activity.zones?.find((z: any) => z.type === 'heartrate');
                  const buckets = hrZone?.distribution_buckets || [];
                  
                  return (
                    <tr key={activity.id} className={isDisabled ? 'opacity-50' : ''}>
                      <td className="px-3 sm:px-4 py-3 text-sm font-medium max-w-xs truncate">
                        <a
                          href={`https://www.strava.com/activities/${activity.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                        >
                          {activity.name}
                        </a>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }}>
                        {formatDate(activity.start_date)}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }}>
                        {convertedDistance.toFixed(2)} {unitLabel}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }}>
                        {formatTime(activity.moving_time)}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }}>
                        {formatPace(activity.average_speed, unit)} {paceLabel}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }}>
                        {activity.suffer_score || '-'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }} title={buckets[0] ? formatTimeReadable(buckets[0].time) : '0 sec'}>
                        {buckets[0] ? formatPercentage(buckets[0].time, activity.moving_time) : '0.00%'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }} title={buckets[1] ? formatTimeReadable(buckets[1].time) : '0 sec'}>
                        {buckets[1] ? formatPercentage(buckets[1].time, activity.moving_time) : '0.00%'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }} title={buckets[2] ? formatTimeReadable(buckets[2].time) : '0 sec'}>
                        {buckets[2] ? formatPercentage(buckets[2].time, activity.moving_time) : '0.00%'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }} title={buckets[3] ? formatTimeReadable(buckets[3].time) : '0 sec'}>
                        {buckets[3] ? formatPercentage(buckets[3].time, activity.moving_time) : '0.00%'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right" style={{ fontFamily: monoFont }} title={buckets[4] ? formatTimeReadable(buckets[4].time) : '0 sec'}>
                        {buckets[4] ? formatPercentage(buckets[4].time, activity.moving_time) : '0.00%'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
