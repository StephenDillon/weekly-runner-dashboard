import { NextResponse } from 'next/server';
import { stravaClient } from '@/app/lib/stravaClient';

export async function GET() {
  try {
    const searchParams = new URL(stravaClient.getAuthorizationUrl()).searchParams;
    const authUrl = stravaClient.getAuthorizationUrl();
    
    return NextResponse.json({ authUrl });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
