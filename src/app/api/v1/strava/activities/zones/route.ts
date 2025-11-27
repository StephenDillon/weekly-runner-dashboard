import { NextRequest, NextResponse } from 'next/server';
import { stravaService } from '@/app/lib/stravaService';

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
    const activities = await stravaService.getActivitiesWithZones(
      new Date(startDate),
      new Date(endDate)
    );

    const response = NextResponse.json({ activities });
    
    // Cache for 30 minutes for detailed data
    response.headers.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=86400');
    
    return response;
  } catch (error) {
    console.error('Error fetching detailed activities:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to fetch detailed activities', details: errorMessage },
      { status: 500 }
    );
  }
}
