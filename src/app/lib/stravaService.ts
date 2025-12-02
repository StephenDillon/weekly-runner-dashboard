import { StravaActivity, DetailedStravaActivity, HeartRateZones, StravaAthlete } from '../types/strava';
import { StravaClient } from './stravaClient';

export class StravaService {
  private client: StravaClient;

  constructor(client: StravaClient) {
    this.client = client;
  }

  /**
   * Get athlete activities
   */
  async getActivities(
    before?: number,
    after?: number,
    page: number = 1,
    perPage: number = 30
  ): Promise<StravaActivity[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (before) params.append('before', before.toString());
    if (after) params.append('after', after.toString());

    return await this.client.fetchFromStrava<StravaActivity[]>(
      '/athlete/activities',
      params
    );
  }

  /**
   * Get heart rate zones for a specific activity
   */
  async getActivityZones(activityId: number): Promise<HeartRateZones[]> {
    return await this.client.fetchFromStrava<HeartRateZones[]>(
      `/activities/${activityId}/zones`
    );
  }

  /**
   * Get activities within a date range
   */
  async getActivitiesInDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<StravaActivity[]> {
    const after = Math.floor(startDate.getTime() / 1000);
    const before = Math.floor(endDate.getTime() / 1000);

    const activities: StravaActivity[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.getActivities(before, after, page, 200);
      activities.push(...batch);

      if (batch.length < 200) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // Return all activities - filtering will be done on the client side
    return activities;
  }

  /**
   * Get activities with heart rate zones for a date range
   */
  async getActivitiesWithZones(
    startDate: Date,
    endDate: Date
  ): Promise<DetailedStravaActivity[]> {
    // Get the list of activities
    const activities = await this.getActivitiesInDateRange(startDate, endDate);

    // Fetch zones for each activity with HR data
    const activitiesWithZones = await Promise.all(
      activities
        .filter(a => a.has_heartrate)
        .map(async (activity) => {
          const zones = await this.getActivityZones(activity.id);

          return {
            ...activity,
            zones
          };
        })
    );

    return activitiesWithZones;
  }
  /**
   * Get current athlete profile
   */
  async getAthlete(): Promise<StravaAthlete> {
    return await this.client.fetchFromStrava<StravaAthlete>('/athlete');
  }
}
