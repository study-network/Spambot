import type { IncomingMessage, ServerResponse } from 'http';
import app, { ensureDbReady } from '../server.ts';

/**
 * Vercel Serverless Function entrypoint.
 * Handles all /api/* requests directed through Vercel rewrites or direct execution.
 */
export default async function handler(req: any, res: any) {
  try {
    await ensureDbReady();
  } catch (err) {
    console.error('[Vercel API] Failed to initialize database:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Database initialization failed. Please check server logs.' }));
      return;
    }
  }

  // Handle URL normalization:
  // Vercel rewrites may pass raw path without /api prefix or set x-forwarded-url / x-matched-path
  const forwardedUrl = (req.headers['x-forwarded-url'] as string) || (req.headers['x-matched-path'] as string);
  if (forwardedUrl && forwardedUrl.startsWith('/api')) {
    req.url = forwardedUrl;
  } else if (req.url && !req.url.startsWith('/api')) {
    const apiPrefixes = ['/health', '/auth', '/webapps', '/settings', '/message', '/achievements', '/team', '/admin', '/servers'];
    if (apiPrefixes.some((p: string) => req.url.startsWith(p))) {
      req.url = '/api' + req.url;
    }
  }

  return app(req, res);
}
