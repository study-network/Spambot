process.env.IS_SERVERLESS = '1';
import app, { ensureDbReady } from './app.ts';

/**
 * Universal Vercel Serverless Function entrypoint.
 * Bundled into api/index.js, api/[...all].js, api/auth/login.js, etc.
 */
export default async function handler(req: any, res: any) {
  // Check if Vercel passed the path via catch-all query parameters
  if (req.query) {
    const catchAll = req.query.all || req.query['...all'] || req.query.path;
    if (catchAll) {
      const slug = Array.isArray(catchAll) ? catchAll.join('/') : catchAll;
      if (slug && !req.url.includes(slug)) {
        req.url = `/api/${slug}`;
      }
    }
  }

  // Check forwarded headers
  const forwardedUrl = (req.headers?.['x-forwarded-url'] || req.headers?.['x-matched-path'] || req.headers?.['x-vercel-original-url']) as string;
  if (forwardedUrl && forwardedUrl.startsWith('/api/') && (!req.url || req.url === '/' || !req.url.startsWith('/api/'))) {
    req.url = forwardedUrl.split('?')[0];
  }

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

  return app(req, res);
}
