"use client";

import React, { useMemo, useState, useRef } from 'react';
import { getWeeksBack, formatWeekLabel, getMonthsBack, formatMonthLabel } from '../utils/dateUtils';
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
  const { weeksToDisplay, viewMode, monthsToDisplay } = useWeekStart();
  const { activityType } = useActivityType();
  const { isActivityDisabled, toggleActivity } = useDisabledActivities();
  const weeks = useMemo(() => {
    if (viewMode === 'monthly') {
      return getMonthsBack(monthsToDisplay, endDate);
    }
    return getWeeksBack(weeksToDisplay, endDate);
  }, [viewMode, monthsToDisplay, weeksToDisplay, endDate]);
  const [hoveredDot, setHoveredDot] = useState<number | null>(null);
  const [clickedDot, setClickedDot] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

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

  const { activities, loading, error } = useStravaActivities(startDate, apiEndDate);

  const sortedActivities = useMemo(() => {
    return [...activities]
      .filter(activity => activity.average_speed > 0 && !isActivityDisabled(activity.id))
      .sort((a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
  }, [activities, isActivityDisabled]);

  const paceData = useMemo(() => {
    return sortedActivities.map(activity => {
      const minutesPerUnit = unit === 'kilometers'
        ? 16.6667 / activity.average_speed
        : 26.8224 / activity.average_speed;

      const distance = metersToMiles(activity.distance);
      const convertedDistance = unit === 'kilometers' ? milesToKm(distance) : distance;

      return {
        name: activity.name,
        date: formatWeekLabel(new Date(activity.start_date)), // Still useful for tooltip
        pace: minutesPerUnit,
        paceDisplay: formatPace(activity.average_speed, unit),
        distance: convertedDistance,
        timestamp: new Date(activity.start_date).getTime()
      };
    });
  }, [sortedActivities, unit]);

  // Generate labels specifically for time-based axis
  const timeLabels = useMemo(() => {
    return weeks.map(date => ({
      date: date,
      label: viewMode === 'monthly' ? formatMonthLabel(date) : formatWeekLabel(date),
      timestamp: date.getTime()
    }));
  }, [weeks, viewMode]);

  // Calculate scaled X position based on time
  const minTime = startDate.getTime();
  const maxTime = apiEndDate.getTime();
  const timeRange = maxTime - minTime;

  const getXPosition = (timestamp: number) => {
    return ((timestamp - minTime) / timeRange) * 90 + 5;
  };

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

  // Calculate trends
  const trendLine = useMemo(() => {
    if (paceData.length < 2) return null;

    const n = paceData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    const normalizeTime = (t: number) => (t - minTime) / (24 * 60 * 60 * 1000);

    paceData.forEach((data) => {
      const x = normalizeTime(data.timestamp);
      sumX += x;
      sumY += data.pace;
      sumXY += x * data.pace;
      sumX2 += x * x;
    });

    const denominator = (n * sumX2 - sumX * sumX);
    if (denominator === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    const startX = normalizeTime(minTime);
    const endX = normalizeTime(maxTime);

    const startY = slope * startX + intercept;
    const endY = slope * endX + intercept;

    return { slope, intercept, startY, endY };
  }, [paceData, minTime, maxTime]);

  const updateTooltipPosition = (index: number, event: React.MouseEvent<SVGCircleElement>) => {
    if (chartRef.current) {
      const svgElement = event.currentTarget.ownerSVGElement;
      if (svgElement) {
        const svgRect = svgElement.getBoundingClientRect();
        const circle = event.currentTarget;
        const cx = parseFloat(circle.getAttribute('cx') || '0');
        const cy = parseFloat(circle.getAttribute('cy') || '0');

        // Convert percentage to pixels
        const xPos = (cx / 100) * svgRect.width;
        const yPos = (cy / 100) * svgRect.height;

        setTooltipPosition({
          x: xPos,
          y: yPos
        });
      }
    }
  };

  const handleDotHover = (index: number, event: React.MouseEvent<SVGCircleElement>) => {
    if (clickedDot === null) {
      setHoveredDot(index);
      updateTooltipPosition(index, event);
    }
  };

  const handleDotClick = (index: number, event: React.MouseEvent<SVGCircleElement>) => {
    event.stopPropagation();
    if (clickedDot === index) {
      setClickedDot(null);
      setTooltipPosition(null);
    } else {
      setClickedDot(index);
      setHoveredDot(null);
      updateTooltipPosition(index, event);
    }
  };

  const handleDotLeave = () => {
    if (clickedDot === null) {
      setHoveredDot(null);
      setTooltipPosition(null);
    }
  };

  const handleCloseTooltip = () => {
    setClickedDot(null);
    setHoveredDot(null);
    setTooltipPosition(null);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Pace Chart</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading pace data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Pace Chart</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">Error loading pace data: {error}</div>
        </div>
      </div>
    );
  }

  if (paceData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Pace Chart</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">No activities with pace data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
      <div className="space-y-6">
        {/* Chart */}
        <div className="relative">
          <div className="flex">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between h-[500px] text-xs text-gray-500 dark:text-gray-400 pr-2 py-2">
              {[0, 0.25, 0.5, 0.75, 1].map((percent, idx) => {
                const pace = maxPace - (maxPace - minPace) * percent;
                const mins = Math.floor(pace);
                const secs = Math.round((pace - mins) * 60);
                return (
                  <div key={idx} className="text-right w-16">
                    {mins}:{secs.toString().padStart(2, '0')}
                  </div>
                );
              })}
            </div>

            {/* Chart area */}
            <div ref={chartRef} className="flex-1 relative h-[500px] border-l border-b border-gray-300 dark:border-gray-600 pb-20">
              <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((percent, idx) => (
                  <line
                    key={idx}
                    x1="0%"
                    y1={`${percent * 100}%`}
                    x2="100%"
                    y2={`${percent * 100}%`}
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-gray-200 dark:text-gray-700"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Trend line */}
                {trendLine && (
                  <line
                    x1="5%"
                    y1={`${95 - (((trendLine.startY - minPace) / (maxPace - minPace)) * 85)}%`}
                    x2="95%"
                    y2={`${95 - (((trendLine.endY - minPace) / (maxPace - minPace)) * 85)}%`}
                    stroke={trendLine.slope < 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'} // Lower pace is better (faster)
                    strokeWidth="2"
                    strokeDasharray="8 4"
                    className="opacity-60"
                  />
                )}

                {/* Connect dots with line */}
                <polyline
                  points={paceData.map((data) => {
                    const x = getXPosition(data.timestamp);
                    const y = 95 - (((data.pace - minPace) / (maxPace - minPace)) * 85);
                    return `${x}%,${y}%`;
                  }).join(' ')}
                  fill="none"
                  stroke="rgb(168, 85, 247)"
                  strokeWidth="3"
                  className="transition-all"
                />

                {/* Draw dots */}
                {paceData.map((data, index) => {
                  const xPercent = getXPosition(data.timestamp);
                  const yPercent = 95 - (((data.pace - minPace) / (maxPace - minPace)) * 85);

                  return (
                    <g key={index}>
                      <circle
                        ref={(el) => { dotRefs.current[index] = el; }}
                        cx={`${xPercent}%`}
                        cy={`${yPercent}%`}
                        r="7"
                        fill="rgb(168, 85, 247)"
                        className="cursor-pointer transition-all"
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                        onClick={(e) => handleDotClick(index, e)}
                        onMouseEnter={(e) => handleDotHover(index, e)}
                        onMouseLeave={handleDotLeave}
                      />
                      {/* Invisible larger circle for better hover target */}
                      <circle
                        cx={`${xPercent}%`}
                        cy={`${yPercent}%`}
                        r="15"
                        fill="transparent"
                        className="cursor-pointer"
                        onClick={(e) => handleDotClick(index, e)}
                        onMouseEnter={(e) => handleDotHover(index, e)}
                        onMouseLeave={handleDotLeave}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip */}
              {(clickedDot !== null || hoveredDot !== null) && tooltipPosition && sortedActivities[clickedDot ?? hoveredDot ?? 0] && (
                <div
                  className="absolute z-50 pointer-events-auto"
                  style={{
                    left: `${tooltipPosition.x}px`,
                    top: `${tooltipPosition.y}px`,
                    transform: 'translate(-50%, -100%) translateY(-10px)'
                  }}
                >
                  <SingleActivityTooltip
                    activity={sortedActivities[clickedDot ?? hoveredDot ?? 0]}
                    onClose={handleCloseTooltip}
                    isActivityDisabled={isActivityDisabled}
                    onToggleActivity={toggleActivity}
                    unit={unit}
                    showCadence={activityType === 'running'}
                  />
                </div>
              )}

              {/* X-axis labels */}
              <div className="absolute inset-x-0 bottom-0">
                {timeLabels.map((item, index) => {
                  const xPercent = getXPosition(item.timestamp);

                  return (
                    <div
                      key={index}
                      className="absolute text-xs text-gray-600 dark:text-gray-400 text-center"
                      style={{
                        left: `${xPercent}%`,
                        bottom: '0',
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {item.label}
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
              {paceData.length > 0 ? formatPace(Math.max(...sortedActivities.map(a => a.average_speed)), unit) : 'N/A'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Slowest Pace</div>
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {paceData.length > 0 ? formatPace(Math.min(...sortedActivities.map(a => a.average_speed)), unit) : 'N/A'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Avg Pace</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {paceData.length > 0 ? (() => {
                const avgSpeed = sortedActivities.reduce((sum, a) => sum + a.average_speed, 0) / sortedActivities.length;
                return formatPace(avgSpeed, unit);
              })() : 'N/A'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Pace Trend</div>
            <div className={`text-xl font-bold ${trendLine && trendLine.slope < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {trendLine ? (
                <>
                  {trendLine.slope < 0 ? '↓ Improving' : '↑ Slowing'}
                </>
              ) : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
