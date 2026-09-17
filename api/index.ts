process.env.IS_SERVERLESS = '1';
import app, { ensureDbReady } from '../server.ts';

/**
 * Vercel Serverless Function entrypoint.
 * Handles all /api/* requests directed through Vercel.
 */
export default async function handler(req: any, res: any) {
  try {
    await ensureDbReady();
  } catch (err: any) {
    console.error('[Vercel API] Failed to initialize database:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Database initialization failed: ' + (err?.message || 'Internal Server Error') }));
      return;
    }
  }

  // Handle URL normalization:
  // Vercel Serverless may receive req.url as /auth/login or /api/auth/login
  const forwardedUrl = req.headers['x-forwarded-url'] as string;
  if (forwardedUrl && forwardedUrl.startsWith('/api/')) {
    req.url = forwardedUrl;
  } else if (req.url && !req.url.startsWith('/api/')) {
    const apiPrefixes = ['/health', '/auth', '/webapps', '/settings', '/message', '/achievements', '/team', '/admin', '/servers'];
    if (apiPrefixes.some((p: string) => req.url.startsWith(p))) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
  }

  return app(req, res);
}

