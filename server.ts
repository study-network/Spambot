import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import path from 'path';
import app, { ensureDbReady } from './server/app.ts';

const PORT = 3000;

async function startServer() {
  await ensureDbReady();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Web App Link Manager listening on http://0.0.0.0:${PORT}`);
  });
}

// Only auto-start the standalone server when run directly (not when imported as a module or in serverless)
const isServerless = process.env.IS_SERVERLESS === '1' || process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const isMainModule = Boolean(
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') ||
   process.argv[1].endsWith('server.cjs') ||
   process.argv[1].endsWith('server.js'))
);

if (isMainModule && !isServerless) {
  startServer().catch(err => {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  });
}

export { app, ensureDbReady };
export default app;
