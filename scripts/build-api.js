import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const targets = [
  { entry: 'server/vercel.ts', out: 'api/index.js' },
  { entry: 'server/vercel.ts', out: 'api/[...all].js' },
  { entry: 'server/vercel-login.ts', out: 'api/auth/login.js' },
  { entry: 'server/vercel-me.ts', out: 'api/auth/me.js' },
  { entry: 'server/vercel.ts', out: 'api/auth/[...all].js' },
  { entry: 'server/vercel.ts', out: 'api/admin/[...all].js' },
  { entry: 'server/vercel.ts', out: 'api/webapps/[...all].js' },
  { entry: 'server/vercel.ts', out: 'api/achievements/[...all].js' },
  { entry: 'server/vercel.ts', out: 'api/servers/[...all].js' },
  { entry: 'server/vercel.ts', out: 'api/team-members/[...all].js' },
  { entry: 'server/vercel.ts', out: 'api/messages/[...all].js' },
];

async function buildAll() {
  console.log('[build-api] Bundling self-contained Vercel serverless handlers...');
  const start = Date.now();

  for (const t of targets) {
    const outDir = path.dirname(t.out);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    await esbuild.build({
      entryPoints: [t.entry],
      bundle: true,
      platform: 'node',
      format: 'esm',
      packages: 'external',
      outfile: t.out,
      minify: false,
      sourcemap: false,
    });
    console.log(`  ✓ ${t.out}`);
  }

  console.log(`[build-api] Successfully bundled ${targets.length} endpoints in ${Date.now() - start}ms`);
}

buildAll().catch((err) => {
  console.error('[build-api] Build failed:', err);
  process.exit(1);
});
