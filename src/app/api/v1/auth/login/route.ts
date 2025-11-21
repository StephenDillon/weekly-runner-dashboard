import { NextResponse } from 'next/server';
import { stravaService } from '@/app/services/stravaService';

export async function GET() {
  try {
    const searchParams = new URL(stravaService.getAuthorizationUrl()).searchParams;
    const authUrl = stravaService.getAuthorizationUrl();
    
    return NextResponse.json({ authUrl });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
