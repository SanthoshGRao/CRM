import { ConfigService } from '@nestjs/config';
import { FastifyReply } from 'fastify';

export const REFRESH_COOKIE_NAME = 'refresh_token';

/**
 * Scoped to the one endpoint that consumes it, so the token is never attached
 * to ordinary API traffic.
 */
export const REFRESH_COOKIE_PATH = '/api/v1/auth/refresh';

export const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days, in seconds

interface RefreshCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  domain?: string;
  path: string;
  maxAge?: number;
}

/**
 * Single definition of the refresh cookie's attributes.
 *
 * Login, refresh, staff impersonation and logout must all agree on these — a
 * cookie written with one `path`/`sameSite` and cleared or read with another is
 * silently dropped by the browser, which shows up as "I get logged out every
 * time I reload".
 */
export function refreshCookieOptions(
  config: ConfigService,
  maxAge: number = REFRESH_COOKIE_MAX_AGE,
): RefreshCookieOptions {
  const sameSite = config.get<'lax' | 'strict' | 'none'>('app.cookie.sameSite') ?? 'lax';

  return {
    httpOnly: true,
    // Browsers reject SameSite=None unless the cookie is also Secure.
    secure: sameSite === 'none' || config.get<string>('app.nodeEnv') === 'production',
    sameSite,
    domain: config.get<string>('app.cookie.domain') || undefined,
    path: REFRESH_COOKIE_PATH,
    maxAge,
  };
}

export function setRefreshCookie(
  res: FastifyReply,
  config: ConfigService,
  token: string,
  maxAge?: number,
): void {
  res.setCookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions(config, maxAge) as any);
}

export function clearRefreshCookie(res: FastifyReply, config: ConfigService): void {
  const { maxAge: _ignored, ...options } = refreshCookieOptions(config);
  res.clearCookie(REFRESH_COOKIE_NAME, options as any);
}
