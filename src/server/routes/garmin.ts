import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

const GARMIN_CLIENT_ID = process.env.GARMIN_CLIENT_ID || '';
const GARMIN_CLIENT_SECRET = process.env.GARMIN_CLIENT_SECRET || '';

// 1. Initiate Garmin OAuth Flow
router.get('/garmin/oauth/authorize', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const baseUrl = process.env.APP_BASE_URL || `${protocol}://${host}`;
  const redirectUri = `${baseUrl}/api/v1/garmin/oauth/callback`;
  
  const authUrl = `https://connect.garmin.com/oauth2Confirm?client_id=${encodeURIComponent(
    GARMIN_CLIENT_ID
  )}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read_activities`;

  res.redirect(authUrl);
});

// 2. Handle OAuth Callback & Token Exchange
router.get('/garmin/oauth/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`/settings?error=garmin_denied&message=${encodeURIComponent(String(error))}`);
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code from Garmin' });
  }

  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = process.env.APP_BASE_URL || `${protocol}://${host}`;
    const redirectUri = `${baseUrl}/api/v1/garmin/oauth/callback`;

    const tokenResponse = await fetch('https://connect.garmin.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: GARMIN_CLIENT_ID,
        client_secret: GARMIN_CLIENT_SECRET,
        code: String(code),
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = (await tokenResponse.json()) as any;

    if (!tokenResponse.ok) {
      throw new Error(tokenData.message || 'Failed to exchange code for Garmin tokens');
    }

    res.redirect('/settings?success=garmin_connected');
  } catch (err: any) {
    console.error('Garmin OAuth token exchange error:', err);
    res.redirect(`/settings?error=token_exchange_failed&message=${encodeURIComponent(err.message)}`);
  }
});

export default router;
