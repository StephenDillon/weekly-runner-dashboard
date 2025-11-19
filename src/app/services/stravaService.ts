import { StravaActivity, StravaTokenResponse } from '../types/strava';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_AUTH_BASE = 'https://www.strava.com/oauth';

export class StravaService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number | null = null;

  constructor() {
    if (typeof window === 'undefined') {
      // Server-side: load from environment variables
      this.accessToken = process.env.STRAVA_ACCESS_TOKEN || null;
      this.refreshToken = process.env.STRAVA_REFRESH_TOKEN || null;
    }
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(): string {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;
    const scope = 'read,activity:read_all,profile:read_all';

    return `${STRAVA_AUTH_BASE}/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeToken(code: string): Promise<StravaTokenResponse> {
    const response = await fetch(`${STRAVA_AUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange token');
    }

    const data: StravaTokenResponse = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.expiresAt = data.expires_at;

    return data;
  }

  /**
   * Refresh the access token
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${STRAVA_AUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.expiresAt = data.expires_at;

    return this.accessToken!;
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<string> {
    if (!this.accessToken) {
      throw new Error('No access token available. Please authenticate first.');
    }

    // Check if token is expired (with 5 minute buffer)
    if (this.expiresAt && Date.now() / 1000 > this.expiresAt - 300) {
      return await this.refreshAccessToken();
    }

    return this.accessToken!;
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
    const token = await this.ensureValidToken();

    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (before) params.append('before', before.toString());
    if (after) params.append('after', after.toString());

    const response = await fetch(
      `${STRAVA_API_BASE}/athlete/activities?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch activities:', response.status, errorText);
      throw new Error('Failed to fetch activities');
    }

    return await response.json();
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

    return activities.filter((a) => a.type === 'Run');
  }

  /**
   * Get athlete stats
   */
  async getAthleteStats(athleteId: number) {
    const token = await this.ensureValidToken();

    const response = await fetch(
      `${STRAVA_API_BASE}/athletes/${athleteId}/stats`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch athlete stats');
    }

    return await response.json();
  }
}

export const stravaService = new StravaService();
