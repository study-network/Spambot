process.env.IS_SERVERLESS = '1';
import app, { ensureDbReady } from './app.ts';

/**
 * Universal Vercel Serverless Function entrypoint.
 * Bundled into api/index.js and api/[...all].js by esbuild at build-time.
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

  return app(req, res);
}
