import { StravaTokenResponse } from '../types/strava';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_AUTH_BASE = 'https://www.strava.com/oauth';

export class StravaClient {
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
   * Centralized fetch method that handles token refresh on 401 errors
   */
  async fetchFromStrava<T>(
    endpoint: string,
    params?: URLSearchParams
  ): Promise<T> {
    const token = await this.ensureValidToken();

    const url = params 
      ? `${STRAVA_API_BASE}${endpoint}?${params.toString()}`
      : `${STRAVA_API_BASE}${endpoint}`;

    let response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Handle 401 - check if it's an invalid token error
    if (response.status === 401) {
      try {
        const errorData = await response.json();
        
        // Check if it matches the specific authorization error format
        if (
          errorData.message === "Authorization Error" &&
          errorData.errors?.[0]?.field === "access_token" &&
          errorData.errors?.[0]?.code === "invalid"
        ) {
          console.log('Access token invalid, refreshing...');
          
          // Refresh the token and retry
          await this.refreshAccessToken();
          const newToken = await this.ensureValidToken();
          
          response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${newToken}`,
            },
          });
          
          // Check if retry was successful
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to fetch ${endpoint} after token refresh:`, response.status, errorText);
            throw new Error(`Failed to fetch ${endpoint}`);
          }
          
          return await response.json();
        }
      } catch (parseError) {
        // If we can't parse the error, just throw a generic error
        console.error(`401 error on ${endpoint}, could not parse error response`);
        throw new Error(`Unauthorized: Failed to fetch ${endpoint}`);
      }
    }

    if (!response.ok) {
      let errorText = 'Unknown error';
      try {
        errorText = await response.text();
      } catch (e) {
        // ignore if we can't read the error text
      }
      console.error(`Failed to fetch ${endpoint}:`, response.status, errorText);
      throw new Error(`Failed to fetch ${endpoint}`);
    }

    return await response.json();
  }

}

export const stravaClient = new StravaClient();
