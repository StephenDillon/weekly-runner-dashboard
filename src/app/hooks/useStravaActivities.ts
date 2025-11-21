import { useState, useEffect } from 'react';
import { StravaActivity } from '../types/strava';
import { useStravaAuth } from '../context/StravaAuthContext';
import { useActivityType } from '../context/ActivityTypeContext';

interface CachedActivities {
  version: string;
  activities: StravaActivity[];
  lastFetched: number;
  startDate: string;
  endDate: string;
}

const CACHE_VERSION = 'v2';
const CACHE_KEY = `strava_activities_cache_${CACHE_VERSION}`;
const RECENT_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for recent activities
const OLD_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 week for older activities

export function useStravaActivities(startDate: Date, endDate: Date) {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
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
        if (cached && isCacheValid(cached, startDateStr, endDateStr)) {
          console.log('✓ Using cached activities', {
            totalCached: cached.activities.length,
            dateRange: `${cached.startDate} to ${cached.endDate}`,
            cacheAge: `${Math.round((Date.now() - cached.lastFetched) / 60000)}min`,
            activityType
          });
          const filtered = filterActivitiesByDateRange(cached.activities, startDate, endDate);
          const typeFiltered = filterByActivityType(filtered, activityType);
          if (isMounted) {
            setActivities(typeFiltered);
            setLoading(false);
          }
          return;
        }

        // Determine what dates we need to fetch
        const { fetchStartDate, fetchEndDate } = determineFetchRange(
          cached,
          startDateStr,
          endDateStr
        );

        console.log('⟳ Fetching fresh activities from API', {
          reason: cached ? 'cache miss or expired' : 'no cache',
          requestedRange: `${startDateStr} to ${endDateStr}`,
          fetchingRange: `${fetchStartDate} to ${fetchEndDate}`,
          activityType
        });

        // Fetch from API
        const response = await fetch(
          `/api/v1/strava/activities?startDate=${fetchStartDate}&endDate=${fetchEndDate}`
        );

        if (!response.ok) {
          if (response.status === 401 || response.status === 403 || response.status === 500) {
            // Authentication failed - clear auth state and prompt user to login again
            localStorage.removeItem('strava_authenticated');
            setIsAuthenticated(false);
            throw new Error('Your Strava session has expired. Please connect with Strava again.');
          }
          throw new Error('Failed to fetch activities from Strava');
        }

        const data = await response.json();
        const newActivities: StravaActivity[] = data.activities || [];

        // Merge with cached activities if needed
        let allActivities = newActivities;
        if (cached && cached.activities.length > 0) {
          allActivities = mergeActivities(cached.activities, newActivities);
        }

        // Update cache with expanded date range
        const cacheData: CachedActivities = {
          version: CACHE_VERSION,
          activities: allActivities,
          lastFetched: Date.now(),
          startDate: fetchStartDate,
          endDate: fetchEndDate,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        console.log('💾 Cache updated', {
          totalActivities: allActivities.length,
          dateRange: `${fetchStartDate} to ${fetchEndDate}`
        });

        // Filter to requested range and activity type
        const filtered = filterActivitiesByDateRange(allActivities, startDate, endDate);
        const typeFiltered = filterByActivityType(filtered, activityType);
        if (isMounted) {
          setActivities(typeFiltered);
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
  }, [startDate.getTime(), endDate.getTime(), activityType]);

  return { activities, loading, error };
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
  cached: StravaActivity[],
  newActivities: StravaActivity[]
): StravaActivity[] {
  const activityMap = new Map<number, StravaActivity>();

  // Add cached activities
  cached.forEach((activity) => {
    activityMap.set(activity.id, activity);
  });

  // Add/override with new activities
  newActivities.forEach((activity) => {
    activityMap.set(activity.id, activity);
  });

  return Array.from(activityMap.values()).sort(
    (a, b) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );
}

function filterActivitiesByDateRange(
  activities: StravaActivity[],
  startDate: Date,
  endDate: Date
): StravaActivity[] {
  return activities.filter((activity) => {
    const activityDate = new Date(activity.start_date);
    return activityDate >= startDate && activityDate <= endDate;
  });
}

function filterByActivityType(
  activities: StravaActivity[],
  activityType: 'running' | 'cycling'
): StravaActivity[] {
  let filtered: StravaActivity[];
  if (activityType === 'running') {
    filtered = activities.filter((activity) => activity.type === 'Run');
  } else {
    // Cycling can have multiple types: Ride, VirtualRide, EBikeRide, etc.
    const cyclingTypes = ['Ride', 'VirtualRide', 'EBikeRide', 'Handcycle', 'GravelRide'];
    filtered = activities.filter((activity) => cyclingTypes.includes(activity.type));
  }
  
  return filtered;
}
