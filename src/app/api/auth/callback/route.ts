import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromCode } from '@/lib/gmail';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(new URL('/settings?error=no_code', request.url));
    }

    const tokens = await getTokenFromCode(code);

    // Store refresh token indicator (actual token should be in env)
    await query(
      "INSERT INTO settings (`key`, value) VALUES ('gmail_connected', 'true') ON DUPLICATE KEY UPDATE value = 'true'"
    );

    // Log the refresh token for manual setup
    console.log('Gmail refresh token (add to .env.local as GMAIL_REFRESH_TOKEN):');
    console.log(tokens.refresh_token);

    return NextResponse.redirect(new URL('/settings?success=gmail_connected', request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/settings?error=auth_failed', request.url));
  }
}
