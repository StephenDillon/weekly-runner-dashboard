"use client";

import React, { useMemo, useState, useRef } from 'react';
import { getWeeksBack, formatWeekLabel, getMonthsBack, formatMonthLabel } from '../utils/dateUtils';
import { useStravaActivities } from '../hooks/useStravaActivities';
import { useWeekStart } from '../context/WeekStartContext';
import { useDisabledActivities } from '../context/DisabledActivitiesContext';
import SingleActivityTooltip from './SingleActivityTooltip';

interface AvgCadenceChartProps {
  endDate: Date;
  unit?: 'miles' | 'kilometers';
}

export default function AvgCadenceChart({ endDate, unit = 'miles' }: AvgCadenceChartProps) {
  const { weeksToDisplay, viewMode, monthsToDisplay } = useWeekStart();
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
      .filter(activity => (activity.average_cadence || 0) > 0 && !isActivityDisabled(activity.id))
      .sort((a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
  }, [activities, isActivityDisabled]);

  const cadenceData = useMemo(() => {
    return sortedActivities.map(activity => ({
      name: activity.name,
      date: formatWeekLabel(new Date(activity.start_date)),
      cadence: (activity.average_cadence || 0) * 2, // Convert to SPM (steps per minute)
      id: activity.id,
      timestamp: new Date(activity.start_date).getTime()
    }));
  }, [sortedActivities]);

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
    const pos = ((timestamp - minTime) / timeRange) * 90 + 5;
    return Math.max(0, Math.min(100, pos)); // Ensure within bounds
  };

  // Calculate min and max cadence for scaling
  const { minCadence, maxCadence } = useMemo(() => {
    if (cadenceData.length === 0) return { minCadence: 140, maxCadence: 200 };

    const cadences = cadenceData.map(d => d.cadence);
    const min = Math.min(...cadences);
    const max = Math.max(...cadences);

    // Add some padding to the range
    const padding = (max - min) * 0.1;
    return {
      minCadence: Math.max(0, min - padding),
      maxCadence: max + padding
    };
  }, [cadenceData]);

  // Calculate linear regression for trend line against time
  const trendLine = useMemo(() => {
    if (cadenceData.length < 2) return null;

    const n = cadenceData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    // Normalize time to days from start
    const normalizeTime = (t: number) => (t - minTime) / (24 * 60 * 60 * 1000);

    cadenceData.forEach((data) => {
      const x = normalizeTime(data.timestamp);
      sumX += x;
      sumY += data.cadence;
      sumXY += x * data.cadence;
      sumX2 += x * x;
    });

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    const startX = normalizeTime(minTime);
    const endX = normalizeTime(maxTime);

    const startY = slope * startX + intercept;
    const endY = slope * endX + intercept;

    return { slope, intercept, startY, endY };
  }, [cadenceData, minTime, maxTime]);

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
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800 dark:text-white">Cadence Chart</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading cadence data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800 dark:text-white">Cadence Chart</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">Error loading cadence data: {error}</div>
        </div>
      </div>
    );
  }

  if (cadenceData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800 dark:text-white">Cadence Chart</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">No activities with cadence data available</div>
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
            <div className="flex flex-col justify-between h-[350px] sm:h-[500px] text-xs text-gray-500 dark:text-gray-400 pr-2 py-2">
              {[1, 0.75, 0.5, 0.25, 0].map((percent, idx) => {
                const val = minCadence + (maxCadence - minCadence) * percent;
                return (
                  <div key={idx} className="text-right w-8 sm:w-16">
                    {Math.round(val)}
                  </div>
                );
              })}
            </div>

            {/* Chart area */}
            <div ref={chartRef} className="flex-1 relative h-[350px] sm:h-[500px] border-l border-b border-gray-300 dark:border-gray-600 pb-8 sm:pb-20">
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
                    y1={`${95 - (((trendLine.startY - minCadence) / (maxCadence - minCadence)) * 85)}%`}
                    x2="95%"
                    y2={`${95 - (((trendLine.endY - minCadence) / (maxCadence - minCadence)) * 85)}%`}
                    stroke={trendLine.slope > 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'} // Increasing cadence usually good
                    strokeWidth="2"
                    strokeDasharray="8 4"
                    className="opacity-60"
                  />
                )}

                {/* Connect dots with line */}
                <polyline
                  points={cadenceData.map((data) => {
                    const x = getXPosition(data.timestamp);
                    const y = 95 - (((data.cadence - minCadence) / (maxCadence - minCadence)) * 85);
                    return `${x}%,${y}%`;
                  }).join(' ')}
                  fill="none"
                  stroke="rgb(16, 185, 129)" // emerald-500
                  strokeWidth="3"
                  className="transition-all"
                />

                {/* Draw dots */}
                {cadenceData.map((data, index) => {
                  const xPercent = getXPosition(data.timestamp);
                  const yPercent = 95 - (((data.cadence - minCadence) / (maxCadence - minCadence)) * 85);

                  return (
                    <g key={index}>
                      <circle
                        ref={(el) => { dotRefs.current[index] = el; }}
                        cx={`${xPercent}%`}
                        cy={`${yPercent}%`}
                        r="6"
                        fill="rgb(16, 185, 129)" // emerald-500
                        className="cursor-pointer transition-all hover:r-8"
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
                    showCadence={true}
                  />
                </div>
              )}

              {/* X-axis labels */}
              <div className="absolute inset-x-0 bottom-0 overflow-hidden h-6 sm:h-8">
                {timeLabels.map((item, index) => {
                  const xPercent = getXPosition(item.timestamp);

                  return (
                    <div
                      key={index}
                      className="absolute text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 text-center whitespace-nowrap"
                      style={{
                        left: `${xPercent}%`,
                        bottom: '0',
                        transform: 'translateX(-50%)' // Center the label
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
            <div className="text-sm text-gray-500 dark:text-gray-400">Low Cadence</div>
            <div className="text-xl font-bold text-gray-600 dark:text-gray-300">
              {cadenceData.length > 0 ? Math.round(Math.min(...cadenceData.map(d => d.cadence))) : 'N/A'} spm
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">High Cadence</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {cadenceData.length > 0 ? Math.round(Math.max(...cadenceData.map(d => d.cadence))) : 'N/A'} spm
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Avg Cadence</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {cadenceData.length > 0 ? Math.round(cadenceData.reduce((sum, d) => sum + d.cadence, 0) / cadenceData.length) : 'N/A'} spm
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Cadence Trend</div>
            <div className={`text-xl font-bold ${trendLine && trendLine.slope > 0 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
              {trendLine ? (
                <>
                  {trendLine.slope > 0 ? '↑ Increasing' : '↓ Decreasing'}
                </>
              ) : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
