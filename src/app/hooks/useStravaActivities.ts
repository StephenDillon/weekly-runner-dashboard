import { useState, useEffect } from 'react';
import { StravaActivity, DetailedStravaActivity } from '../types/strava';
import { useStravaAuth } from '../context/StravaAuthContext';
import { useActivityType } from '../context/ActivityTypeContext';
import { getClientSideStravaClient } from '../lib/stravaClient';
import { StravaService } from '../lib/stravaService';

interface CachedActivities {
  version: string;
  activities: DetailedStravaActivity[];
  lastFetched: number;
  startDate: string;
  endDate: string;
}

const CACHE_VERSION = 'v3'; // Incremented for zone support
const CACHE_KEY = `strava_activities_cache_${CACHE_VERSION}`;
const RECENT_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for recent activities
const OLD_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 week for older activities

export function useStravaActivities(startDate: Date, endDate: Date, includeZones: boolean = false) {
  const [activities, setActivities] = useState<DetailedStravaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setIsAuthenticated } = useStravaAuth();
  const { activityType } = useActivityType();

  useEffect(() => {
    let isMounted = true;

    async function fetchActivities() {
      if (!isMounted) return;

      setLoading(true);
      setError(null);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      try {
        // Check cache first
        const cached = getCachedActivities();
        let currentActivities: DetailedStravaActivity[] = [];
        let needsFetch = true;

        if (cached && isCacheValid(cached, startDateStr, endDateStr)) {
          console.log('✓ Using cached activities', {
            totalCached: cached.activities.length,
            dateRange: `${cached.startDate} to ${cached.endDate}`,
            cacheAge: `${Math.round((Date.now() - cached.lastFetched) / 60000)}min`,
            activityType
          });
          currentActivities = cached.activities;
          needsFetch = false;
        }

        if (needsFetch) {
          // Determine what dates we need to fetch
          const { fetchStartDate, fetchEndDate } = determineFetchRange(
            cached,
            startDateStr,
            endDateStr
          );

          console.log('⟳ Fetching fresh activities from Strava API', {
            reason: cached ? 'cache miss or expired' : 'no cache',
            requestedRange: `${startDateStr} to ${endDateStr}`,
            fetchingRange: `${fetchStartDate} to ${fetchEndDate}`,
            activityType
          });

          // Get Strava client and call API directly
          const client = await getClientSideStravaClient();
          if (!client) {
            setIsAuthenticated(false);
            throw new Error('Your Strava session has expired. Please connect with Strava again.');
          }

          const stravaService = new StravaService(client);
          const newActivities = await stravaService.getActivitiesInDateRange(
            new Date(fetchStartDate),
            new Date(fetchEndDate)
          );

          // Merge with cached activities if needed
          if (cached && cached.activities.length > 0) {
            currentActivities = mergeActivities(cached.activities, newActivities);
          } else {
            currentActivities = newActivities;
          }

          // Update cache with expanded date range (zones might be missing still)
          updateCache(currentActivities, fetchStartDate, fetchEndDate);
        }

        // Filter to requested range and activity type for display
        const filteredByDate = filterActivitiesByDateRange(currentActivities, startDate, endDate);
        const filteredByType = filterByActivityType(filteredByDate, activityType);

        // If zones are requested, check if we need to fetch them for the *displayed* activities
        if (includeZones) {
          const activitiesNeedingZones = filteredByType.filter(a => a.has_heartrate && !a.zones);

          if (activitiesNeedingZones.length > 0) {
            console.log(`⟳ Fetching zones for ${activitiesNeedingZones.length} activities`);

            const client = await getClientSideStravaClient();
            if (!client) {
              setIsAuthenticated(false);
              throw new Error('Your Strava session has expired. Please connect with Strava again.');
            }
            const stravaService = new StravaService(client);

            // Fetch zones in parallel
            const activitiesWithZones = await Promise.all(
              activitiesNeedingZones.map(async (activity) => {
                try {
                  const zones = await stravaService.getActivityZones(activity.id);
                  return { ...activity, zones };
                } catch (e) {
                  console.warn(`Failed to fetch zones for activity ${activity.id}`, e);
                  return activity;
                }
              })
            );

            // Update currentActivities with the new zone data
            const zonesMap = new Map(activitiesWithZones.map(a => [a.id, a]));
            currentActivities = currentActivities.map(a => zonesMap.get(a.id) || a);

            // Update cache again with the zone data
            // We use the cached start/end dates if available, otherwise the requested ones
            const cacheStart = cached?.startDate || startDateStr;
            const cacheEnd = cached?.endDate || endDateStr;
            updateCache(currentActivities, cacheStart, cacheEnd);

            // Re-filter to ensure we have the latest objects
            const updatedFilteredByDate = filterActivitiesByDateRange(currentActivities, startDate, endDate);
            const updatedFilteredByType = filterByActivityType(updatedFilteredByDate, activityType);

            if (isMounted) {
              setActivities(updatedFilteredByType);
              setLoading(false);
            }
            return;
          }
        }

        if (isMounted) {
          setActivities(filteredByType);
          setLoading(false);
        }

      } catch (err) {
        console.error('Error fetching activities:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchActivities();

    return () => {
      isMounted = false;
    };
  }, [startDate.getTime(), endDate.getTime(), activityType, includeZones]);

  return { activities, loading, error };
}

function updateCache(activities: DetailedStravaActivity[], startDate: string, endDate: string) {
  const cacheData: CachedActivities = {
    version: CACHE_VERSION,
    activities,
    lastFetched: Date.now(),
    startDate,
    endDate,
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
}

function getCachedActivities(): CachedActivities | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as CachedActivities;

    // Validate cache version
    if (parsed.version !== CACHE_VERSION) {
      console.log('⚠ Cache version mismatch, clearing old cache', {
        cachedVersion: parsed.version,
        currentVersion: CACHE_VERSION
      });
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function isCacheValid(
  cached: CachedActivities,
  requestedStart: string,
  requestedEnd: string
): boolean {
  const now = Date.now();
  const cacheAge = now - cached.lastFetched;

  // Determine if we're requesting recent data (within last week)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];

  // If requested range includes recent activities, use shorter cache duration
  const isRequestingRecentData = requestedEnd >= oneWeekAgoStr;
  const cacheDuration = isRequestingRecentData ? RECENT_CACHE_DURATION : OLD_CACHE_DURATION;

  // Check if cache is not expired
  if (cacheAge > cacheDuration) {
    console.log(`Cache expired (age: ${Math.round(cacheAge / 60000)} minutes, max: ${Math.round(cacheDuration / 60000)} minutes)`);
    return false;
  }

  // Check if cached range covers requested range
  const cacheCoversRange =
    cached.startDate <= requestedStart && cached.endDate >= requestedEnd;

  if (!cacheCoversRange) {
    console.log('Cache does not cover requested date range');
  }

  return cacheCoversRange;
}

function determineFetchRange(
  cached: CachedActivities | null,
  requestedStart: string,
  requestedEnd: string
): { fetchStartDate: string; fetchEndDate: string } {
  if (!cached) {
    // No cache, fetch exactly what's requested
    return { fetchStartDate: requestedStart, fetchEndDate: requestedEnd };
  }

  // Expand the range to include both cached and requested
  const fetchStartDate =
    requestedStart < cached.startDate ? requestedStart : cached.startDate;
  const fetchEndDate =
    requestedEnd > cached.endDate ? requestedEnd : cached.endDate;

  return { fetchStartDate, fetchEndDate };
}

function mergeActivities(
  cached: DetailedStravaActivity[],
  newActivities: DetailedStravaActivity[]
): DetailedStravaActivity[] {
  const activityMap = new Map<number, DetailedStravaActivity>();

  // Add cached activities
  cached.forEach((activity) => {
    activityMap.set(activity.id, activity);
  });

  // Add/override with new activities
  // Preserve zones if existing activity has them and new one doesn't (though usually new one is fresher)
  newActivities.forEach((activity) => {
    const existing = activityMap.get(activity.id);
    if (existing?.zones && !activity.zones) {
      activityMap.set(activity.id, { ...activity, zones: existing.zones });
    } else {
      activityMap.set(activity.id, activity);
    }
  });

  return Array.from(activityMap.values()).sort(
    (a, b) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );
}

function filterActivitiesByDateRange(
  activities: DetailedStravaActivity[],
  startDate: Date,
  endDate: Date
): DetailedStravaActivity[] {
  return activities.filter((activity) => {
    const activityDate = new Date(activity.start_date);
    return activityDate >= startDate && activityDate <= endDate;
  });
}

function filterByActivityType(
  activities: DetailedStravaActivity[],
  activityType: 'running' | 'cycling'
): DetailedStravaActivity[] {
  let filtered: DetailedStravaActivity[];
  if (activityType === 'running') {
    filtered = activities.filter((activity) => activity.type === 'Run');
  } else {
    // Cycling can have multiple types: Ride, VirtualRide, EBikeRide, etc.
    const cyclingTypes = ['Ride', 'VirtualRide', 'EBikeRide', 'Handcycle', 'GravelRide'];
    filtered = activities.filter((activity) => cyclingTypes.includes(activity.type));
  }

  return filtered;
}
