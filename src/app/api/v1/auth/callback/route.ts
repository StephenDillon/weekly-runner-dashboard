import { NextRequest, NextResponse } from 'next/server';
import { stravaClient } from '@/app/lib/stravaClient';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/?error=access_denied', request.url));
  }

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    const tokenData = await stravaClient.exchangeToken(code);

    // In a production app, you'd store these tokens securely (database, secure cookie, etc.)
    // For now, we'll return them to be stored client-side or in session
    console.log('Token data received:', {
      athlete: tokenData.athlete,
      expiresAt: new Date(tokenData.expires_at * 1000),
    });

    // Store tokens in environment or session
    // TODO: Implement secure token storage

    return NextResponse.redirect(
      new URL('/?auth=success', request.url)
    );
  } catch (error) {
    console.error('Error exchanging token:', error);
    return NextResponse.redirect(
      new URL('/?error=token_exchange_failed', request.url)
    );
  }
}
