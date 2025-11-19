import { StravaActivity } from '../types/strava';

export interface WeeklyMetrics {
  weekStartDate: Date;
  totalDistance: number; // in miles
  averageCadence: number | null;
  averageHeartRate: number | null;
  activityCount: number;
  activities: StravaActivity[]; // Activities for this week
}

/**
 * Aggregates Strava activities into weekly metrics
 * @param activities - Array of Strava activities
 * @param weeks - Array of week start dates (Sundays)
 * @returns Array of weekly metrics aligned with the weeks array
 */
export function aggregateActivitiesByWeek(
  activities: StravaActivity[],
  weeks: Date[]
): WeeklyMetrics[] {
  return weeks.map((weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7); // Next Sunday

    // Filter activities for this week
    const weekActivities = activities.filter((activity) => {
      const activityDate = new Date(activity.start_date);
      return activityDate >= weekStart && activityDate < weekEnd;
    });

    // Calculate total distance (convert from meters to miles)
    const totalDistance = weekActivities.reduce(
      (sum, activity) => sum + metersToMiles(activity.distance),
      0
    );

    // Calculate average cadence (only for activities that have cadence data)
    // Note: Strava returns cadence as "strides per minute" for runs, multiply by 2 for steps per minute
    const activitiesWithCadence = weekActivities.filter(
      (a) => a.average_cadence !== undefined && a.average_cadence !== null && a.average_cadence > 0
    );
    const averageCadence =
      activitiesWithCadence.length > 0
        ? (activitiesWithCadence.reduce((sum, a) => sum + (a.average_cadence || 0), 0) /
          activitiesWithCadence.length) * 2 // Convert strides/min to steps/min
        : null;

    // Calculate average heart rate (only for activities that have HR data)
    const activitiesWithHR = weekActivities.filter(
      (a) => a.average_heartrate !== undefined && a.average_heartrate !== null
    );
    const averageHeartRate =
      activitiesWithHR.length > 0
        ? activitiesWithHR.reduce((sum, a) => sum + (a.average_heartrate || 0), 0) /
          activitiesWithHR.length
        : null;

    return {
      weekStartDate: weekStart,
      totalDistance,
      averageCadence,
      averageHeartRate,
      activityCount: weekActivities.length,
      activities: weekActivities,
    };
  });
}

/**
 * Convert meters to miles
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

/**
 * Convert miles to kilometers
 */
export function milesToKilometers(miles: number): number {
  return miles * 1.60934;
}

/**
 * Generate array of week start dates (Sundays) going back from endDate
 * @param endDate - The ending date (typically the selected week)
 * @param numWeeks - Number of weeks to generate (default 8)
 * @returns Array of Date objects representing week start dates
 */
export function generateWeekStarts(endDate: Date, numWeeks: number = 8): Date[] {
  const weeks: Date[] = [];
  
  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekStart = new Date(endDate);
    weekStart.setDate(weekStart.getDate() - i * 7);
    // Set to start of day
    weekStart.setHours(0, 0, 0, 0);
    weeks.push(weekStart);
  }
  
  return weeks;
}
