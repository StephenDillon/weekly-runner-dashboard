"use client";

import React, { useState, useMemo, useRef } from 'react';
import { getWeeksBack, formatWeekLabel, getMonthsBack, formatMonthLabel } from '../utils/dateUtils';
import { useStravaActivities } from '../hooks/useStravaActivities';
import { metersToMiles } from '../utils/activityAggregation';
import { useWeekStart } from '../context/WeekStartContext';
import { useDisabledActivities } from '../context/DisabledActivitiesContext';
import { useActivityType } from '../context/ActivityTypeContext';
import SingleActivityTooltip from './SingleActivityTooltip';

interface DistanceAnalysisChartProps {
  endDate: Date;
  unit: 'miles' | 'kilometers';
}

const milesToKm = (miles: number) => miles * 1.60934;

export default function DistanceAnalysisChart({ endDate, unit }: DistanceAnalysisChartProps) {
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
      .filter(activity => !isActivityDisabled(activity.id))
      .sort((a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
  }, [activities, isActivityDisabled]);

  const distanceData = useMemo(() => {
    return sortedActivities.map(activity => {
      const distance = metersToMiles(activity.distance);
      const convertedDistance = unit === 'kilometers' ? milesToKm(distance) : distance;

      return {
        name: activity.name,
        distance: convertedDistance,
        activityDate: new Date(activity.start_date),
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

  // Calculate min and max distance for scaling
  const { minDistance, maxDistance } = useMemo(() => {
    if (distanceData.length === 0) return { minDistance: 0, maxDistance: 10 };

    const distances = distanceData.map(d => d.distance);
    const min = Math.min(...distances);
    const max = Math.max(...distances);

    // Add 10% padding
    const padding = (max - min) * 0.1;
    return {
      minDistance: Math.max(0, min - padding),
      maxDistance: max + padding
    };
  }, [distanceData]);

  // Calculate trend line using temporal linear regression
  const trendLine = useMemo(() => {
    if (distanceData.length < 2) return null;

    const n = distanceData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    // Normalize time to days from start for numerical stability
    const normalizeTime = (t: number) => (t - minTime) / (24 * 60 * 60 * 1000);

    distanceData.forEach((data) => {
      const x = normalizeTime(data.timestamp);
      sumX += x;
      sumY += data.distance;
      sumXY += x * data.distance;
      sumX2 += x * x;
    });

    const denominator = (n * sumX2 - sumX * sumX);
    if (denominator === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Calculate start and end distances for the full range
    const startX = normalizeTime(minTime);
    const endX = normalizeTime(maxTime);

    const startY = slope * startX + intercept;
    const endY = slope * endX + intercept;

    return { slope, intercept, startY, endY };
  }, [distanceData, minTime, maxTime]);

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
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Distance Chart</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading distance data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Distance Chart</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">Error loading distance data: {error}</div>
        </div>
      </div>
    );
  }

  const unitLabel = unit === 'kilometers' ? 'km' : 'mi';

  if (distanceData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Distance Chart</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">No activities with distance data available</div>
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
                const distance = maxDistance - (maxDistance - minDistance) * percent;
                return (
                  <div key={idx} className="text-right w-16">
                    {distance.toFixed(1)}
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
                    y1={`${95 - (((trendLine.startY - minDistance) / (maxDistance - minDistance)) * 85)}%`}
                    x2="95%"
                    y2={`${95 - (((trendLine.endY - minDistance) / (maxDistance - minDistance)) * 85)}%`}
                    stroke={trendLine.slope > 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                    strokeWidth="2"
                    strokeDasharray="8 4"
                    opacity="0.6"
                  />
                )}

                {/* Line connecting all data points */}
                <polyline
                  points={distanceData.map((data) => {
                    const xPercent = getXPosition(data.timestamp);
                    const yPercent = 95 - (((data.distance - minDistance) / (maxDistance - minDistance)) * 85);
                    return `${xPercent}%,${yPercent}%`;
                  }).join(' ')}
                  fill="none"
                  stroke="rgb(168, 85, 247)"
                  strokeWidth="3"
                />

                {/* Data points */}
                {distanceData.map((data, index) => {
                  const xPercent = getXPosition(data.timestamp);
                  const yPercent = 95 - (((data.distance - minDistance) / (maxDistance - minDistance)) * 85);

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

              {/* X-axis labels - Show labels from time domain */}
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
            <div className="text-sm text-gray-500 dark:text-gray-400">Longest Run</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {maxDistance.toFixed(2)} {unitLabel}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Shortest Run</div>
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {minDistance.toFixed(2)} {unitLabel}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Avg Distance</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {(distanceData.reduce((sum, d) => sum + d.distance, 0) / distanceData.length).toFixed(2)} {unitLabel}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Distance Trend</div>
            <div className={`text-xl font-bold ${trendLine && trendLine.slope > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {trendLine ? (
                <>
                  {trendLine.slope > 0 ? '↑ Increasing' : '↓ Decreasing'}
                  <div className="text-sm font-normal mt-1">
                    {trendLine.startY.toFixed(2)} → {trendLine.endY.toFixed(2)} {unitLabel}
                  </div>
                </>
              ) : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
