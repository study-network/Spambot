process.env.IS_SERVERLESS = '1';
import baseHandler from './vercel.ts';

/**
 * Dedicated entrypoint for /api/auth/login on Vercel
 */
export default async function handler(req: any, res: any) {
  req.url = '/api/auth/login';
  return baseHandler(req, res);
}
