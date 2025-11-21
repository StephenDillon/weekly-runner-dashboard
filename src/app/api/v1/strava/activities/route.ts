import { NextRequest, NextResponse } from 'next/server';
import { stravaService } from '@/app/services/stravaService';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'startDate and endDate are required' },
      { status: 400 }
    );
  }

  try {
    const activities = await stravaService.getActivitiesInDateRange(
      new Date(startDate),
      new Date(endDate)
    );

    // Return all activities - filtering will be done on the client side
    const response = NextResponse.json({ activities });
    
    // Cache for 15 minutes, allow stale data for 1 day while revalidating in background
    // This provides instant responses while keeping data relatively fresh
    response.headers.set('Cache-Control', 'public, max-age=900, stale-while-revalidate=86400');
    
    return response;
  } catch (error) {
    console.error('Error fetching activities:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to fetch activities', details: errorMessage },
      { status: 500 }
    );
  }
}
