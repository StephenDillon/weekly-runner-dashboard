"use client";

import React, { useMemo, useState, useRef } from 'react';
import { getWeeksBack } from '../utils/dateUtils';
import { useStravaActivities } from '../hooks/useStravaActivities';
import { metersToMiles } from '../utils/activityAggregation';
import { useWeekStart } from '../context/WeekStartContext';
import { useActivityType } from '../context/ActivityTypeContext';
import SingleActivityTooltip from './SingleActivityTooltip';
import { useDisabledActivities } from '../context/DisabledActivitiesContext';

interface PaceAnalysisChartProps {
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

function formatPace(metersPerSecond: number, unit: 'miles' | 'kilometers'): string {
  if (metersPerSecond === 0 || !isFinite(metersPerSecond)) return 'N/A';
  
  const minutesPerUnit = unit === 'kilometers' 
    ? 16.6667 / metersPerSecond  // minutes per km
    : 26.8224 / metersPerSecond; // minutes per mile
    
  const mins = Math.floor(minutesPerUnit);
  const secs = Math.round((minutesPerUnit - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function PaceAnalysisChart({ endDate, unit }: PaceAnalysisChartProps) {
  const { weeksToDisplay } = useWeekStart();
  const { activityType } = useActivityType();
  const { isActivityDisabled, toggleActivity } = useDisabledActivities();
  const weeks = getWeeksBack(weeksToDisplay, endDate);
  const [clickedDot, setClickedDot] = useState<number | null>(null);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  
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
    return [...activities]
      .filter(activity => activity.average_speed > 0)
      .sort((a, b) => 
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      );
  }, [activities]);

  const paceData = useMemo(() => {
    return sortedActivities.map(activity => {
      const minutesPerUnit = unit === 'kilometers' 
        ? 16.6667 / activity.average_speed
        : 26.8224 / activity.average_speed;
      
      const distance = metersToMiles(activity.distance);
      const convertedDistance = unit === 'kilometers' ? milesToKm(distance) : distance;
      
      return {
        name: activity.name,
        date: formatDate(activity.start_date),
        pace: minutesPerUnit,
        paceDisplay: formatPace(activity.average_speed, unit),
        distance: convertedDistance
      };
    });
  }, [sortedActivities, unit]);

  // Calculate min and max pace for scaling
  const { minPace, maxPace } = useMemo(() => {
    if (paceData.length === 0) return { minPace: 0, maxPace: 20 };
    
    const paces = paceData.map(d => d.pace);
    const min = Math.min(...paces);
    const max = Math.max(...paces);
    
    // Add some padding to the range
    const padding = (max - min) * 0.1;
    return {
      minPace: Math.max(0, min - padding),
      maxPace: max + padding
    };
  }, [paceData]);

  const unitLabel = unit === 'kilometers' ? 'km' : 'mi';
  const paceLabel = unit === 'kilometers' ? 'min/km' : 'min/mi';

  const handleDotClick = (index: number) => {
    setClickedDot(clickedDot === index ? null : index);
  };

  const handleCloseTooltip = () => {
    setClickedDot(null);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Pace Analysis</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading pace data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Pace Analysis</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">Error loading pace data: {error}</div>
        </div>
      </div>
    );
  }

  if (paceData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Pace Analysis</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">No activities with pace data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Pace Analysis
      </h2>
      
      <div className="space-y-6">
        {/* Chart */}
        <div className="relative">
          <div className="flex">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between h-96 text-xs text-gray-500 dark:text-gray-400 pr-2 py-2">
              {[0, 0.25, 0.5, 0.75, 1].map((percent, idx) => {
                const pace = maxPace - (maxPace - minPace) * percent;
                const mins = Math.floor(pace);
                const secs = Math.round((pace - mins) * 60);
                return (
                  <div key={idx} className="text-right w-12">
                    {mins}:{secs.toString().padStart(2, '0')}
                  </div>
                );
              })}
            </div>
            
            {/* Chart area */}
            <div className="flex-1 relative h-96 border-l border-b border-gray-300 dark:border-gray-600 pb-20">
              <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                {/* Connect dots with line */}
                <polyline
                  points={paceData.map((data, index) => {
                    const x = ((index / Math.max(paceData.length - 1, 1)) * 90) + 5;
                    const y = 95 - (((data.pace - minPace) / (maxPace - minPace)) * 85);
                    return `${x}%,${y}%`;
                  }).join(' ')}
                  fill="none"
                  stroke="rgb(168, 85, 247)"
                  strokeWidth="2"
                  className="transition-all"
                />
                
                {/* Draw dots */}
                {paceData.map((data, index) => {
                  const xPercent = ((index / Math.max(paceData.length - 1, 1)) * 90) + 5;
                  const yPercent = 95 - (((data.pace - minPace) / (maxPace - minPace)) * 85);
                  
                  return (
                    <g key={index}>
                      <circle
                        ref={(el) => { dotRefs.current[index] = el; }}
                        cx={`${xPercent}%`}
                        cy={`${yPercent}%`}
                        r="6"
                        fill="rgb(168, 85, 247)"
                        className="cursor-pointer transition-all"
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                        onClick={() => handleDotClick(index)}
                      />
                      {/* Invisible larger circle for better hover target */}
                      <circle
                        cx={`${xPercent}%`}
                        cy={`${yPercent}%`}
                        r="15"
                        fill="transparent"
                        className="cursor-pointer"
                        onClick={() => handleDotClick(index)}
                      />
                      
                      {/* Tooltip */}
                      {clickedDot === index && sortedActivities[index] && (
                        <foreignObject
                          x={`${xPercent}%`}
                          y={`${yPercent}%`}
                          width="1"
                          height="1"
                          style={{ overflow: 'visible' }}
                        >
                          <div style={{ position: 'relative' }}>
                            <SingleActivityTooltip
                              activity={sortedActivities[index]}
                              onClose={handleCloseTooltip}
                              isActivityDisabled={isActivityDisabled}
                              onToggleActivity={toggleActivity}
                              unit={unit}
                              showCadence={activityType === 'running'}
                            />
                          </div>
                        </foreignObject>
                      )}
                    </g>
                  );
                })}
              </svg>
              {/* X-axis labels */}
              <div className="absolute inset-x-0 bottom-0 h-20">
                {paceData.map((data, index) => {
                  const xPercent = ((index / Math.max(paceData.length - 1, 1)) * 90) + 5;
                  
                  return (
                    <div 
                      key={index}
                      className="absolute text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap"
                      style={{ 
                        left: `${xPercent}%`,
                        bottom: '0',
                        transform: 'translateX(-50%) rotate(-45deg)',
                        transformOrigin: 'top center'
                      }}
                    >
                      {data.date}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Fastest Pace</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatPace(sortedActivities[0]?.average_speed || 0, unit)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Slowest Pace</div>
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {formatPace(sortedActivities[sortedActivities.length - 1]?.average_speed || 0, unit)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Avg Pace</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {(() => {
                const avgSpeed = sortedActivities.reduce((sum, a) => sum + a.average_speed, 0) / sortedActivities.length;
                return formatPace(avgSpeed, unit);
              })()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Activities</div>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {sortedActivities.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
