import { useState, useEffect } from 'react';
import { DetailedStravaActivity } from '../types/strava';

interface CachedActivitiesWithZones {
  activities: DetailedStravaActivity[];
  lastFetched: number;
  startDate: string;
  endDate: string;
}

const CACHE_KEY = 'strava_activities_zones_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export function useActivitiesWithZones(startDate: Date, endDate: Date) {
  const [activities, setActivities] = useState<DetailedStravaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);

        const startDateStr = startDate.toISOString();
        const endDateStr = endDate.toISOString();

        // Check cache first
        const cached = getCachedActivitiesWithZones();
        if (cached && isCacheValid(cached, startDateStr, endDateStr)) {
          console.log('✓ Using cached activities with zones');
          setActivities(cached.activities);
          setLoading(false);
          return;
        }

        console.log('⟳ Fetching activities with zones from API');
        const params = new URLSearchParams({
          startDate: startDateStr,
          endDate: endDateStr,
        });

        const response = await fetch(`/api/v1/strava/activities/zones?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch activities with heart rate zones');
        }

        const data = await response.json();
        const fetchedActivities = data.activities || [];

        // Update cache
        const cacheData: CachedActivitiesWithZones = {
          activities: fetchedActivities,
          lastFetched: Date.now(),
          startDate: startDateStr,
          endDate: endDateStr,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        console.log('💾 Activities with zones cache updated');

        setActivities(fetchedActivities);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate.getTime(), endDate.getTime()]);

  return { activities, loading, error };
}

function getCachedActivitiesWithZones(): CachedActivitiesWithZones | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached) as CachedActivitiesWithZones;
  } catch {
    return null;
  }
}

function isCacheValid(
  cached: CachedActivitiesWithZones,
  requestedStart: string,
  requestedEnd: string
): boolean {
  const now = Date.now();
  const cacheAge = now - cached.lastFetched;

  // Check if cache is not expired
  if (cacheAge > CACHE_DURATION) {
    return false;
  }

  // Check if cached range covers requested range
  return cached.startDate === requestedStart && cached.endDate === requestedEnd;
}
