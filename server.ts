import dotenv from 'dotenv';
dotenv.config({ override: true });
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import {
  initDatabase,
  getPublicWebApps,
  getServerLaunchUrl,
  getServerLaunchInfo,
  toggleServerStatus,
  getAdminStats,
  getAdminWebApps,
  getAdminWebAppById,
  createWebApp,
  updateWebApp,
  deleteWebApp,
  getUserByEmail,
  getSiteSettings,
  updateSiteSettings,
  getPublicAchievements,
  getAdminAchievements,
  getAchievementById,
  createAchievement,
  updateAchievement,
  toggleAchievementPin,
  deleteAchievement,
  getAchievementMessage,
  updateAchievementMessage,
} from './server/db.ts';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-admin-token-link-manager-key-2026';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Authentication middleware
function requireAdminAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
  }
}

// URL validator
function isValidUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

// Image URL or Base64 Data URL validator
function isValidImageUrl(urlOrData: string): boolean {
  if (!urlOrData || typeof urlOrData !== 'string') return false;
  const trimmed = urlOrData.trim();
  if (trimmed.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

async function startServer() {
  // Initialize SQLite database
  await initDatabase();

  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // ==========================================
  // PUBLIC ROUTES
  // ==========================================

  // Public Home Page: Returns Web Apps without exposing IDs or server URLs
  app.get('/api/webapps', (req, res) => {
    try {
      const apps = getPublicWebApps();
      res.json(apps);
    } catch (err: any) {
      console.error('Error fetching public webapps:', err);
      res.status(500).json({ error: 'Failed to retrieve web apps' });
    }
  });

  // Public Site Settings (Telegram, WhatsApp, About Us, Stay Happy, Message)
  app.get('/api/settings', (req, res) => {
    try {
      const settings = getSiteSettings();
      res.json(settings);
    } catch (err: any) {
      console.error('Error fetching site settings:', err);
      res.status(500).json({ error: 'Failed to retrieve site settings' });
    }
  });

  // Public Message / Notice endpoint
  app.get('/api/message', (req, res) => {
    try {
      const settings = getSiteSettings();
      res.json({
        messageTitle: settings.messageTitle || 'Message',
        messageContent: settings.messageContent || '',
      });
    } catch (err: any) {
      console.error('Error fetching message:', err);
      res.status(500).json({ error: 'Failed to retrieve message' });
    }
  });

  // Public User's Achievement Message endpoint
  app.get('/api/achievements/message', (req, res) => {
    try {
      const message = getAchievementMessage();
      res.json(message);
    } catch (err: any) {
      console.error('Error fetching achievement message:', err);
      res.status(500).json({ error: 'Failed to retrieve achievement message' });
    }
  });

  // Public User's Achievement endpoint
  app.get('/api/achievements', (req, res) => {
    try {
      const achievements = getPublicAchievements();
      res.json(achievements);
    } catch (err: any) {
      console.error('Error fetching achievements:', err);
      res.status(500).json({ error: 'Failed to retrieve achievements' });
    }
  });

  // Launch server endpoint: Fetches destination URL only when user clicks a server (verifies isActive)
  app.get('/api/webapps/:webAppId/servers/:serverId/launch', (req, res) => {
    try {
      const { webAppId, serverId } = req.params;
      const info = getServerLaunchInfo(webAppId, serverId);
      if (!info) {
        return res.status(404).json({ error: 'Server link not found' });
      }
      if (!info.isActive) {
        return res.status(403).json({ error: 'This server is currently inactive and cannot be launched.' });
      }
      res.json({ url: info.url });
    } catch (err: any) {
      console.error('Error launching server:', err);
      res.status(500).json({ error: 'Failed to launch server' });
    }
  });

  // Alias for launching
  app.get('/api/servers/:serverId/launch', (req, res) => {
    try {
      const { serverId } = req.params;
      // Search in all web apps
      const apps = getAdminWebApps();
      for (const appItem of apps) {
        const found = appItem.servers.find(s => s.id === serverId);
        if (found) {
          if (!found.isActive) {
            return res.status(403).json({ error: 'This server is currently inactive and cannot be launched.' });
          }
          return res.json({ url: found.url });
        }
      }
      res.status(404).json({ error: 'Server link not found' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to launch server' });
    }
  });

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================

  // Admin Login
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, username, password } = req.body;
      const loginId = (email || username || '').trim();
      if (!loginId || !password) {
        return res.status(400).json({ error: 'Email/Username and password are required' });
      }

      // Check environment variables credentials first (.env support)
      const envAdminId = (process.env.ADMIN_ID || process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
      const envEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
      const envPass = process.env.ADMIN_PASSWORD;

      const inputId = loginId.toLowerCase();
      const matchesEnv = Boolean(
        envPass &&
        password === envPass &&
        (inputId === envAdminId || (envEmail && inputId === envEmail) || (inputId === 'admin' && envAdminId === 'admin'))
      );

      // Check user by provided identifier in database
      let user = getUserByEmail(loginId);
      if (!user && loginId.toLowerCase() === 'admin') {
        user = getUserByEmail('admin@example.com');
      }

      if (matchesEnv) {
        // Authenticated via environment variables (.env)
        const effectiveId = user ? user.id : 'env-admin';
        const effectiveEmail = user ? user.email : (envAdminId || envEmail || 'admin');
        const token = jwt.sign(
          { id: effectiveId, email: effectiveEmail, role: 'admin' },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        return res.json({
          token,
          user: {
            id: effectiveId,
            email: effectiveEmail,
            role: 'admin',
          },
        });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isMatch = bcrypt.compareSync(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  });

  // Verify auth session
  app.get('/api/auth/me', requireAdminAuth, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // ==========================================
  // PROTECTED ADMIN ROUTES
  // ==========================================

  // Admin Stats
  app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
    try {
      const stats = getAdminStats();
      res.json(stats);
    } catch (err: any) {
      console.error('Stats error:', err);
      res.status(500).json({ error: 'Failed to retrieve stats' });
    }
  });

  // Admin WebApps list
  app.get('/api/admin/webapps', requireAdminAuth, (req, res) => {
    try {
      const apps = getAdminWebApps();
      res.json(apps);
    } catch (err: any) {
      console.error('Error fetching admin webapps:', err);
      res.status(500).json({ error: 'Failed to retrieve web apps' });
    }
  });

  // Admin single WebApp
  app.get('/api/admin/webapps/:id', requireAdminAuth, (req, res) => {
    try {
      const appItem = getAdminWebAppById(req.params.id);
      if (!appItem) {
        return res.status(404).json({ error: 'Web App not found' });
      }
      res.json(appItem);
    } catch (err: any) {
      console.error('Error fetching webapp:', err);
      res.status(500).json({ error: 'Failed to retrieve web app' });
    }
  });

  // Helper validation for creating/updating web app
  function validateWebAppPayload(body: any): { valid: boolean; message?: string } {
    const { name, icon, servers } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return { valid: false, message: 'Web App name is required' };
    }
    if (!icon || !isValidImageUrl(icon)) {
      return { valid: false, message: 'A valid image URL or uploaded image is required' };
    }
    if (!Array.isArray(servers) || servers.length === 0) {
      return { valid: false, message: 'At least one server link is required' };
    }

    const validCategories = ['Working', 'Error', 'Some Error', 'Unfilter', 'Testing'];
    for (let i = 0; i < servers.length; i++) {
      const s = servers[i];
      if (!s.url || !isValidUrl(s.url.trim())) {
        return { valid: false, message: `Server ${i + 1}: Please enter a valid URL (starting with http:// or https://)` };
      }
      if (!s.category || !validCategories.includes(s.category)) {
        return { valid: false, message: `Server ${i + 1}: Invalid category (${s.category}). Must be Working, Error, Some Error, Unfilter, or Testing` };
      }
    }

    return { valid: true };
  }

  // Create WebApp (supports both /api/admin/webapps and /api/webapps with auth)
  const handleCreateWebApp = (req: Request, res: Response) => {
    try {
      const validation = validateWebAppPayload(req.body);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
      }

      const { name, icon, servers } = req.body;
      const cleanServers = servers.map((s: any) => ({
        url: s.url.trim(),
        category: s.category,
        isActive: s.isActive !== false,
      }));

      const newApp = createWebApp(name.trim(), icon.trim(), cleanServers);
      res.status(201).json(newApp);
    } catch (err: any) {
      console.error('Error creating web app:', err);
      res.status(500).json({ error: 'Failed to create web app' });
    }
  };

  app.post('/api/admin/webapps', requireAdminAuth, handleCreateWebApp);
  app.post('/api/webapps', requireAdminAuth, handleCreateWebApp);

  // Update WebApp (supports both /api/admin/webapps/:id and /api/webapps/:id with auth)
  const handleUpdateWebApp = (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = getAdminWebAppById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Web App not found' });
      }

      const validation = validateWebAppPayload(req.body);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
      }

      const { name, icon, servers } = req.body;
      const cleanServers = servers.map((s: any) => ({
        id: s.id,
        url: s.url.trim(),
        category: s.category,
        isActive: s.isActive !== false,
      }));

      const updated = updateWebApp(id, name.trim(), icon.trim(), cleanServers);
      res.json(updated);
    } catch (err: any) {
      console.error('Error updating web app:', err);
      res.status(500).json({ error: 'Failed to update web app' });
    }
  };

  app.put('/api/admin/webapps/:id', requireAdminAuth, handleUpdateWebApp);
  app.put('/api/webapps/:id', requireAdminAuth, handleUpdateWebApp);

  // Toggle server isActive status independently
  const handleToggleServer = (req: Request, res: Response) => {
    try {
      const { serverId } = req.params;
      const { isActive } = req.body || {};
      const result = toggleServerStatus(
        serverId,
        typeof isActive === 'boolean' ? isActive : undefined
      );
      if (!result) {
        return res.status(404).json({ error: 'Server not found' });
      }
      res.json(result);
    } catch (err: any) {
      console.error('Error updating server status:', err);
      res.status(500).json({ error: 'Failed to update server status' });
    }
  };

  app.patch('/api/admin/servers/:serverId/status', requireAdminAuth, handleToggleServer);
  app.post('/api/admin/servers/:serverId/toggle', requireAdminAuth, handleToggleServer);

  // Delete WebApp (supports both /api/admin/webapps/:id and /api/webapps/:id with auth)
  const handleDeleteWebApp = (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = getAdminWebAppById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Web App not found' });
      }

      deleteWebApp(id);
      res.json({ success: true, message: 'Web App and associated servers deleted' });
    } catch (err: any) {
      console.error('Error deleting web app:', err);
      res.status(500).json({ error: 'Failed to delete web app' });
    }
  };

  app.delete('/api/admin/webapps/:id', requireAdminAuth, handleDeleteWebApp);
  app.delete('/api/webapps/:id', requireAdminAuth, handleDeleteWebApp);

  // Admin Site Settings routes
  app.get('/api/admin/settings', requireAdminAuth, (req, res) => {
    try {
      const settings = getSiteSettings();
      res.json(settings);
    } catch (err: any) {
      console.error('Error fetching admin settings:', err);
      res.status(500).json({ error: 'Failed to retrieve site settings' });
    }
  });

  app.put('/api/admin/settings', requireAdminAuth, (req, res) => {
    try {
      const {
        telegramUrl,
        whatsappUrl,
        aboutTitle,
        aboutDescription,
        happyTitle,
        happyMessage,
        happyIcon,
        messageTitle,
        messageContent,
      } = req.body;

      const updated = updateSiteSettings({
        telegramUrl: telegramUrl !== undefined ? String(telegramUrl) : undefined,
        whatsappUrl: whatsappUrl !== undefined ? String(whatsappUrl) : undefined,
        aboutTitle: aboutTitle !== undefined ? String(aboutTitle) : undefined,
        aboutDescription: aboutDescription !== undefined ? String(aboutDescription) : undefined,
        happyTitle: happyTitle !== undefined ? String(happyTitle) : undefined,
        happyMessage: happyMessage !== undefined ? String(happyMessage) : undefined,
        happyIcon: happyIcon !== undefined ? String(happyIcon) : undefined,
        messageTitle: messageTitle !== undefined ? String(messageTitle) : undefined,
        messageContent: messageContent !== undefined ? String(messageContent) : undefined,
      });

      res.json(updated);
    } catch (err: any) {
      console.error('Error saving site settings:', err);
      res.status(500).json({ error: 'Failed to save site settings' });
    }
  });

  // Dedicated admin endpoint for updating Message / Notice
  app.put('/api/admin/message', requireAdminAuth, (req, res) => {
    try {
      const { messageTitle, messageContent } = req.body;
      const updated = updateSiteSettings({
        messageTitle: messageTitle !== undefined ? String(messageTitle) : undefined,
        messageContent: messageContent !== undefined ? String(messageContent) : undefined,
      });

      res.json({
        messageTitle: updated.messageTitle,
        messageContent: updated.messageContent,
        updatedAt: updated.updatedAt,
      });
    } catch (err: any) {
      console.error('Error updating admin message:', err);
      res.status(500).json({ error: 'Failed to update message' });
    }
  });

  // ==========================================
  // ADMIN ACHIEVEMENTS ROUTES
  // ==========================================

  // Admin User's Achievement Message endpoints
  app.get('/api/admin/achievements/message', requireAdminAuth, (req, res) => {
    try {
      const msg = getAchievementMessage();
      res.json(msg);
    } catch (err: any) {
      console.error('Error fetching admin achievement message:', err);
      res.status(500).json({ error: 'Failed to retrieve achievement message' });
    }
  });

  app.put('/api/admin/achievements/message', requireAdminAuth, (req, res) => {
    try {
      const { title, content } = req.body;
      const updated = updateAchievementMessage(
        title !== undefined ? String(title) : undefined,
        content !== undefined ? String(content) : undefined
      );
      res.json(updated);
    } catch (err: any) {
      console.error('Error updating achievement message:', err);
      res.status(500).json({ error: 'Failed to update achievement message' });
    }
  });

  app.get('/api/admin/achievements', requireAdminAuth, (req, res) => {
    try {
      const achievements = getAdminAchievements();
      res.json(achievements);
    } catch (err: any) {
      console.error('Error fetching admin achievements:', err);
      res.status(500).json({ error: 'Failed to retrieve achievements' });
    }
  });

  app.get('/api/admin/achievements/:id', requireAdminAuth, (req, res) => {
    try {
      const item = getAchievementById(req.params.id);
      if (!item) {
        return res.status(404).json({ error: 'Achievement not found' });
      }
      res.json(item);
    } catch (err: any) {
      console.error('Error fetching achievement:', err);
      res.status(500).json({ error: 'Failed to retrieve achievement' });
    }
  });

  app.post('/api/admin/achievements', requireAdminAuth, (req, res) => {
    try {
      const { imageUrl, comment, isPinned } = req.body;
      if (!imageUrl || !isValidImageUrl(imageUrl)) {
        return res.status(400).json({ error: 'Valid achievement image is required (upload or URL)' });
      }
      if (!comment || typeof comment !== 'string' || !comment.trim()) {
        return res.status(400).json({ error: 'Admin comment is required' });
      }

      const created = createAchievement(imageUrl.trim(), comment.trim(), Boolean(isPinned));
      res.status(201).json(created);
    } catch (err: any) {
      console.error('Error creating achievement:', err);
      res.status(500).json({ error: 'Failed to create achievement' });
    }
  });

  app.put('/api/admin/achievements/:id', requireAdminAuth, (req, res) => {
    try {
      const { id } = req.params;
      const { imageUrl, comment, isPinned } = req.body;
      if (!imageUrl || !isValidImageUrl(imageUrl)) {
        return res.status(400).json({ error: 'Valid achievement image is required (upload or URL)' });
      }
      if (!comment || typeof comment !== 'string' || !comment.trim()) {
        return res.status(400).json({ error: 'Admin comment is required' });
      }

      const updated = updateAchievement(
        id,
        imageUrl.trim(),
        comment.trim(),
        isPinned !== undefined ? Boolean(isPinned) : undefined
      );
      if (!updated) {
        return res.status(404).json({ error: 'Achievement not found' });
      }
      res.json(updated);
    } catch (err: any) {
      console.error('Error updating achievement:', err);
      res.status(500).json({ error: 'Failed to update achievement' });
    }
  });

  // Pin / Unpin achievement
  const handleToggleAchievementPin = (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isPinned } = req.body;
      const updated = toggleAchievementPin(
        id,
        typeof isPinned === 'boolean' ? isPinned : undefined
      );
      if (!updated) {
        return res.status(404).json({ error: 'Achievement not found' });
      }
      res.json(updated);
    } catch (err: any) {
      console.error('Error toggling pin on achievement:', err);
      res.status(500).json({ error: 'Failed to update pin status' });
    }
  };

  app.patch('/api/admin/achievements/:id/pin', requireAdminAuth, handleToggleAchievementPin);
  app.post('/api/admin/achievements/:id/pin', requireAdminAuth, handleToggleAchievementPin);

  app.delete('/api/admin/achievements/:id', requireAdminAuth, (req, res) => {
    try {
      const { id } = req.params;
      deleteAchievement(id);
      res.json({ success: true, message: 'Achievement deleted successfully' });
    } catch (err: any) {
      console.error('Error deleting achievement:', err);
      res.status(500).json({ error: 'Failed to delete achievement' });
    }
  });

  // Server management endpoints
  app.post('/api/webapps/:id/servers', requireAdminAuth, (req, res) => {
    try {
      const { id } = req.params;
      const appItem = getAdminWebAppById(id);
      if (!appItem) {
        return res.status(404).json({ error: 'Web App not found' });
      }
      const { url, category } = req.body;
      if (!url || !isValidUrl(url.trim())) {
        return res.status(400).json({ error: 'Valid URL is required' });
      }
      const validCategories = ['Working', 'Error', 'Some Error', 'Unfilter', 'Testing'];
      if (!category || !validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      const existingServers: Array<{ id?: string; url: string; category: string }> = appItem.servers.map(s => ({
        id: s.id,
        url: s.url,
        category: s.category,
      }));
      existingServers.push({ url: url.trim(), category });

      const updated = updateWebApp(id, appItem.name, appItem.icon, existingServers);
      res.status(201).json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add server' });
    }
  });

  // ==========================================
  // VITE DEV / PRODUCTION MIDDLEWARE
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
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

startServer().catch(err => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
