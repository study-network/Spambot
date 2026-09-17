import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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
  getTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  reorderTeamMembers,
  getMessages,
  getPublishedMessages,
  getMessageById,
  createMessage,
  updateMessage,
  deleteMessage,
  publishMessage,
  reorderMessages,
  getAllOtherAdmins,
  getOtherAdminById,
  getOtherAdminByUsername,
  createOtherAdmin,
  updateOtherAdmin,
  toggleOtherAdminStatus,
  deleteOtherAdmin,
} from './server/db.ts';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-admin-token-link-manager-key-2026';

export type AdminRole = 'MAIN_ADMIN' | 'OTHER_ADMIN';

export type AdminPermission =
  // Web Apps
  | 'VIEW_WEBAPPS'
  | 'ADD_WEBAPP'
  | 'EDIT_WEBAPP'
  | 'DELETE_WEBAPP'
  // Servers
  | 'VIEW_SERVERS'
  | 'ADD_SERVER'
  | 'EDIT_SERVER'
  | 'DELETE_SERVER'
  | 'CHANGE_SERVER_CATEGORY'
  // Site Settings
  | 'EDIT_TELEGRAM'
  | 'EDIT_WHATSAPP'
  | 'EDIT_STAY_HAPPY'
  // About Us & Team (Granular)
  | 'VIEW_ABOUT_US_TEAM'
  | 'EDIT_ABOUT_US'
  | 'EDIT_DEVELOPER'
  | 'ADD_TEAM_MEMBER'
  | 'EDIT_TEAM_MEMBER'
  | 'DELETE_TEAM_MEMBER'
  | 'MANAGE_TEAM_SOCIAL_LINKS'
  | 'REORDER_TEAM_MEMBERS'
  // Message / Notice (Granular)
  | 'VIEW_MESSAGES'
  | 'ADD_MESSAGE'
  | 'EDIT_MESSAGE'
  | 'DELETE_MESSAGE'
  | 'PUBLISH_MESSAGE'
  | 'REORDER_MESSAGES'
  | 'MANAGE_MESSAGE_LINKS'
  // Dashboard
  | 'VIEW_DASHBOARD';

export const ALL_PERMISSIONS: AdminPermission[] = [
  'VIEW_WEBAPPS',
  'ADD_WEBAPP',
  'EDIT_WEBAPP',
  'DELETE_WEBAPP',
  'VIEW_SERVERS',
  'ADD_SERVER',
  'EDIT_SERVER',
  'DELETE_SERVER',
  'CHANGE_SERVER_CATEGORY',
  'EDIT_TELEGRAM',
  'EDIT_WHATSAPP',
  'EDIT_STAY_HAPPY',
  'VIEW_ABOUT_US_TEAM',
  'EDIT_ABOUT_US',
  'EDIT_DEVELOPER',
  'ADD_TEAM_MEMBER',
  'EDIT_TEAM_MEMBER',
  'DELETE_TEAM_MEMBER',
  'MANAGE_TEAM_SOCIAL_LINKS',
  'REORDER_TEAM_MEMBERS',
  'VIEW_MESSAGES',
  'ADD_MESSAGE',
  'EDIT_MESSAGE',
  'DELETE_MESSAGE',
  'PUBLISH_MESSAGE',
  'REORDER_MESSAGES',
  'MANAGE_MESSAGE_LINKS',
  'VIEW_DASHBOARD',
];

interface AuthUser {
  id: string;
  username: string;
  email?: string;
  role: AdminRole;
  isActive: boolean;
  permissions: AdminPermission[];
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

// Retrieves Main Admin credentials exclusively from server environment variables
function getMainAdminCredentials() {
  const id = (
    process.env.MAIN_ADMIN_ID ||
    process.env.ADMIN_ID ||
    process.env.ADMIN_USERNAME ||
    'admin'
  ).trim();
  const password = (
    process.env.MAIN_ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    'admin'
  ).trim();
  return { id, password };
}

// Authentication middleware supporting MAIN_ADMIN and OTHER_ADMIN
function requireAdminAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      username?: string;
      email?: string;
      role: string;
    };

    if (decoded.role === 'MAIN_ADMIN' || decoded.role === 'admin') {
      const mainAdmin = getMainAdminCredentials();
      req.user = {
        id: 'main-admin',
        username: mainAdmin.id,
        email: mainAdmin.id,
        role: 'MAIN_ADMIN',
        isActive: true,
        permissions: [...ALL_PERMISSIONS],
      };
      return next();
    }

    if (decoded.role === 'OTHER_ADMIN') {
      const admin = getOtherAdminById(decoded.id);
      if (!admin) {
        return res.status(401).json({ error: 'Administrator account not found or was removed' });
      }
      if (!admin.isActive) {
        return res.status(403).json({ error: 'This administrator account is disabled. Please contact the Main Admin.' });
      }
      req.user = {
        id: admin.id,
        username: admin.username,
        email: admin.username,
        role: 'OTHER_ADMIN',
        isActive: admin.isActive,
        permissions: admin.permissions as AdminPermission[],
      };
      return next();
    }

    return res.status(401).json({ error: 'Unauthorized: Unrecognized admin role' });
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Token has expired or is invalid' });
  }
}

// Strictly requires MAIN_ADMIN role
function requireMainAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'MAIN_ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Main Admin access required' });
  }
  next();
}

// Requires a specific permission (MAIN_ADMIN bypasses all permission checks)
function requirePermission(permission: AdminPermission) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'MAIN_ADMIN') {
      return next();
    }
    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }
    return res.status(403).json({
      error: `Forbidden: Missing required permission (${permission})`,
    });
  };
}

// Requires at least one of the provided permissions
function requireAnyPermission(permissions: AdminPermission[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'MAIN_ADMIN') {
      return next();
    }
    const hasPerm = permissions.some((p) => req.user?.permissions?.includes(p));
    if (hasPerm) {
      return next();
    }
    return res.status(403).json({
      error: `Forbidden: Missing required permission for this section (${permissions.join(', ')})`,
    });
  };
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

export const app = express();

let dbInitialized = false;
let dbInitPromise: Promise<any> | null = null;

export async function ensureDbReady() {
  if (dbInitialized) return;
  if (!dbInitPromise) {
    dbInitPromise = initDatabase().then(() => {
      dbInitialized = true;
    });
  }
  await dbInitPromise;
}

// Ensure database is initialized before handling requests
app.use(async (req, res, next) => {
  try {
    await ensureDbReady();
    next();
  } catch (err) {
    console.error('[Server] Database initialization failed:', err);
    res.status(500).json({ error: 'Database initialization failed' });
  }
});

// Avoid hanging stream if request body was already parsed by Vercel serverless runtime
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    return next();
  }
  express.json({ limit: '15mb' })(req, res, (err) => {
    if (err) return next(err);
    express.urlencoded({ extended: true, limit: '15mb' })(req, res, next);
  });
});

// URL normalization for Vercel edge / serverless rewrites
app.use((req, res, next) => {
  const forwardedUrl = req.headers['x-forwarded-url'] as string;
  if (forwardedUrl && forwardedUrl.startsWith('/api/') && forwardedUrl !== req.url) {
    req.url = forwardedUrl;
  } else if (req.url && !req.url.startsWith('/api/')) {
    const apiPrefixes = ['/health', '/auth', '/webapps', '/settings', '/message', '/achievements', '/team', '/admin', '/servers'];
    if (apiPrefixes.some((p) => req.url.startsWith(p))) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
  }
  next();
});

// Health check
app.get(['/api/health', '/health'], (req, res) => {
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

  // Public Team Members endpoint
  app.get('/api/team-members', (req, res) => {
    try {
      const members = getTeamMembers();
      res.json(members);
    } catch (err: any) {
      console.error('Error fetching team members:', err);
      res.status(500).json({ error: 'Failed to retrieve team members' });
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
  // AUTHENTICATION ROUTES (TWO-LEVEL ADMIN SYSTEM)
  // ==========================================

  // Admin Login: Authenticates MAIN_ADMIN (via env vars) or OTHER_ADMIN (via database)
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, username, password } = req.body || {};
      const rawLoginId = (username || email || '').trim();
      if (!rawLoginId || !password) {
        return res.status(400).json({ error: 'Admin ID/Username and password are required' });
      }

      // Allow logging in with or without leading @ (e.g. '@admin' or 'admin')
      const loginId = rawLoginId.startsWith('@') ? rawLoginId.slice(1).trim() : rawLoginId;
      const mainAdmin = getMainAdminCredentials();
      const cleanMainAdminId = mainAdmin.id.startsWith('@') ? mainAdmin.id.slice(1).trim() : mainAdmin.id;

      // 1. Check if login credentials match MAIN_ADMIN in environment variables
      if (
        (rawLoginId.toLowerCase() === mainAdmin.id.toLowerCase() ||
         loginId.toLowerCase() === cleanMainAdminId.toLowerCase()) &&
        password === mainAdmin.password
      ) {
        const token = jwt.sign(
          { id: 'main-admin', username: mainAdmin.id, role: 'MAIN_ADMIN' },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        return res.json({
          token,
          user: {
            id: 'main-admin',
            username: mainAdmin.id,
            email: mainAdmin.id,
            role: 'MAIN_ADMIN',
            isActive: true,
            permissions: [...ALL_PERMISSIONS],
          },
        });
      }

      // 2. Check if login credentials match OTHER_ADMIN in database
      const otherAdmin = getOtherAdminByUsername(loginId) || getOtherAdminByUsername(rawLoginId);
      if (otherAdmin) {
        if (!otherAdmin.isActive) {
          return res.status(403).json({
            error: 'This administrator account has been disabled. Please contact the Main Admin.',
          });
        }

        const isMatch = bcrypt.compareSync(password, otherAdmin.passwordHash);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid ID/username or password' });
        }

        const token = jwt.sign(
          { id: otherAdmin.id, username: otherAdmin.username, role: 'OTHER_ADMIN' },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.json({
          token,
          user: {
            id: otherAdmin.id,
            username: otherAdmin.username,
            email: otherAdmin.username,
            role: 'OTHER_ADMIN',
            isActive: otherAdmin.isActive,
            permissions: otherAdmin.permissions,
          },
        });
      }

      // 3. Fallback compatibility with legacy users table if any exists
      const legacyUser = getUserByEmail(loginId) || getUserByEmail(rawLoginId);
      if (legacyUser) {
        const isMatch = bcrypt.compareSync(password, legacyUser.passwordHash);
        if (isMatch) {
          const token = jwt.sign(
            { id: 'main-admin', username: mainAdmin.id, role: 'MAIN_ADMIN' },
            JWT_SECRET,
            { expiresIn: '7d' }
          );
          return res.json({
            token,
            user: {
              id: 'main-admin',
              username: mainAdmin.id,
              email: mainAdmin.id,
              role: 'MAIN_ADMIN',
              isActive: true,
              permissions: [...ALL_PERMISSIONS],
            },
          });
        }
      }

      return res.status(401).json({ error: 'Invalid ID/username or password' });
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
  // MAIN ADMIN EXCLUSIVE ROUTES (OTHER ADMINS MANAGEMENT)
  // ==========================================

  // List all Other Admins
  app.get('/api/admin/other-admins', requireAdminAuth, requireMainAdmin, (req: AuthRequest, res) => {
    try {
      const admins = getAllOtherAdmins();
      res.json(admins);
    } catch (err: any) {
      console.error('Error fetching other admins:', err);
      res.status(500).json({ error: 'Failed to retrieve administrators' });
    }
  });

  // Create a new Other Admin
  app.post('/api/admin/other-admins', requireAdminAuth, requireMainAdmin, (req: AuthRequest, res) => {
    try {
      const { username, password, permissions, isActive } = req.body;
      if (!username || typeof username !== 'string' || username.trim().length < 3) {
        return res.status(400).json({ error: 'Admin ID / Username must be at least 3 characters long' });
      }
      if (!password || typeof password !== 'string' || password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters long' });
      }

      const mainAdmin = getMainAdminCredentials();
      if (username.trim().toLowerCase() === mainAdmin.id.toLowerCase()) {
        return res.status(400).json({ error: 'Cannot create an Other Admin using the Main Admin ID' });
      }

      const validPerms = Array.isArray(permissions)
        ? permissions.filter((p: any) => ALL_PERMISSIONS.includes(p))
        : [];

      const created = createOtherAdmin(
        username.trim(),
        password,
        validPerms,
        isActive !== false
      );
      res.status(201).json(created);
    } catch (err: any) {
      console.error('Error creating other admin:', err);
      res.status(400).json({ error: err.message || 'Failed to create administrator' });
    }
  });

  // Update an existing Other Admin (permissions, username, optional password reset, active state)
  app.put('/api/admin/other-admins/:id', requireAdminAuth, requireMainAdmin, (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { username, password, permissions, isActive } = req.body;

      if (username !== undefined) {
        if (!username || typeof username !== 'string' || username.trim().length < 3) {
          return res.status(400).json({ error: 'Admin ID / Username must be at least 3 characters long' });
        }
        const mainAdmin = getMainAdminCredentials();
        if (username.trim().toLowerCase() === mainAdmin.id.toLowerCase()) {
          return res.status(400).json({ error: 'Cannot use the Main Admin ID for an Other Admin' });
        }
      }

      if (password !== undefined && password !== '') {
        if (typeof password !== 'string' || password.length < 4) {
          return res.status(400).json({ error: 'Password must be at least 4 characters long' });
        }
      }

      const validPerms = Array.isArray(permissions)
        ? permissions.filter((p: any) => ALL_PERMISSIONS.includes(p))
        : undefined;

      const updated = updateOtherAdmin(id, {
        username: username !== undefined ? username.trim() : undefined,
        password: password && password.trim() ? password : undefined,
        permissions: validPerms,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
      });

      res.json(updated);
    } catch (err: any) {
      console.error('Error updating other admin:', err);
      res.status(400).json({ error: err.message || 'Failed to update administrator' });
    }
  });

  // Toggle Other Admin active status (Enable / Disable)
  app.patch('/api/admin/other-admins/:id/status', requireAdminAuth, requireMainAdmin, (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body || {};
      const updated = toggleOtherAdminStatus(id, typeof isActive === 'boolean' ? isActive : undefined);
      res.json(updated);
    } catch (err: any) {
      console.error('Error toggling admin status:', err);
      res.status(400).json({ error: err.message || 'Failed to update administrator status' });
    }
  });

  // Delete an Other Admin
  app.delete('/api/admin/other-admins/:id', requireAdminAuth, requireMainAdmin, (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const success = deleteOtherAdmin(id);
      if (!success) {
        return res.status(404).json({ error: 'Administrator not found' });
      }
      res.json({ success: true, message: 'Other Administrator deleted successfully' });
    } catch (err: any) {
      console.error('Error deleting other admin:', err);
      res.status(500).json({ error: 'Failed to delete administrator' });
    }
  });

  // Explicit route guards for aliases /api/admin/admins* and /api/admin/accounts*
  app.all(['/api/admin/admins', '/api/admin/admins/*', '/api/admin/accounts', '/api/admin/accounts/*'], requireAdminAuth, requireMainAdmin, (req, res) => {
    res.status(403).json({ error: 'Forbidden: Main Admin access required' });
  });

  // ==========================================
  // PROTECTED ADMIN ROUTES (PERMISSION GUARDED)
  // ==========================================

  // Admin Stats
  app.get('/api/admin/stats', requireAdminAuth, requirePermission('VIEW_DASHBOARD'), (req, res) => {
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
  const handleCreateWebApp = (req: AuthRequest, res: Response) => {
    try {
      if (req.user?.role !== 'MAIN_ADMIN' && !req.user?.permissions?.includes('ADD_WEBAPP')) {
        return res.status(403).json({ error: 'Forbidden: Missing permission (ADD_WEBAPP)' });
      }

      const validation = validateWebAppPayload(req.body);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
      }

      const { name, icon, servers } = req.body;
      if (Array.isArray(servers) && servers.length > 0) {
        if (req.user?.role !== 'MAIN_ADMIN' && !req.user?.permissions?.includes('ADD_SERVER')) {
          return res.status(403).json({ error: 'Forbidden: Missing permission (ADD_SERVER) to add servers' });
        }
      }

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

  app.post('/api/admin/webapps', requireAdminAuth, requirePermission('ADD_WEBAPP'), handleCreateWebApp);
  app.post('/api/webapps', requireAdminAuth, requirePermission('ADD_WEBAPP'), handleCreateWebApp);

  // Update WebApp (supports both /api/admin/webapps/:id and /api/webapps/:id with auth)
  const handleUpdateWebApp = (req: AuthRequest, res: Response) => {
    try {
      if (req.user?.role !== 'MAIN_ADMIN' && !req.user?.permissions?.includes('EDIT_WEBAPP')) {
        return res.status(403).json({ error: 'Forbidden: Missing permission (EDIT_WEBAPP)' });
      }

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

      // Check granular server permissions for Other Admin
      if (req.user?.role !== 'MAIN_ADMIN') {
        const perms = req.user?.permissions || [];
        const existingServerMap = new Map(existing.servers.map(s => [s.id, s]));
        const payloadServerIds = new Set(servers.filter((s: any) => s.id).map((s: any) => s.id));

        // 1. Check if new servers are added
        const hasNewServers = servers.some((s: any) => !s.id || !existingServerMap.has(s.id));
        if (hasNewServers && !perms.includes('ADD_SERVER')) {
          return res.status(403).json({ error: 'Forbidden: Missing permission (ADD_SERVER) to add new servers' });
        }

        // 2. Check if existing servers are removed
        const hasDeletedServers = existing.servers.some(s => !payloadServerIds.has(s.id));
        if (hasDeletedServers && !perms.includes('DELETE_SERVER')) {
          return res.status(403).json({ error: 'Forbidden: Missing permission (DELETE_SERVER) to delete servers' });
        }

        // 3. Check for modified existing servers
        for (const s of servers) {
          if (s.id && existingServerMap.has(s.id)) {
            const oldS = existingServerMap.get(s.id)!;
            if (oldS.category !== s.category && !perms.includes('CHANGE_SERVER_CATEGORY')) {
              return res.status(403).json({ error: 'Forbidden: Missing permission (CHANGE_SERVER_CATEGORY) to change server category' });
            }
            if (oldS.url !== s.url.trim() && !perms.includes('EDIT_SERVER')) {
              return res.status(403).json({ error: 'Forbidden: Missing permission (EDIT_SERVER) to edit server URL' });
            }
          }
        }
      }

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

  app.put('/api/admin/webapps/:id', requireAdminAuth, requirePermission('EDIT_WEBAPP'), handleUpdateWebApp);
  app.put('/api/webapps/:id', requireAdminAuth, requirePermission('EDIT_WEBAPP'), handleUpdateWebApp);

  // Toggle server isActive status independently
  const handleToggleServer = (req: AuthRequest, res: Response) => {
    try {
      if (req.user?.role !== 'MAIN_ADMIN' && !req.user?.permissions?.includes('EDIT_SERVER')) {
        return res.status(403).json({ error: 'Forbidden: Missing permission (EDIT_SERVER)' });
      }

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

  app.patch('/api/admin/servers/:serverId/status', requireAdminAuth, requirePermission('EDIT_SERVER'), handleToggleServer);
  app.post('/api/admin/servers/:serverId/toggle', requireAdminAuth, requirePermission('EDIT_SERVER'), handleToggleServer);

  // Delete WebApp (supports both /api/admin/webapps/:id and /api/webapps/:id with auth)
  const handleDeleteWebApp = (req: AuthRequest, res: Response) => {
    try {
      if (req.user?.role !== 'MAIN_ADMIN' && !req.user?.permissions?.includes('DELETE_WEBAPP')) {
        return res.status(403).json({ error: 'Forbidden: Missing permission (DELETE_WEBAPP)' });
      }

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

  app.delete('/api/admin/webapps/:id', requireAdminAuth, requirePermission('DELETE_WEBAPP'), handleDeleteWebApp);
  app.delete('/api/webapps/:id', requireAdminAuth, requirePermission('DELETE_WEBAPP'), handleDeleteWebApp);

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

  app.put('/api/admin/settings', requireAdminAuth, (req: AuthRequest, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'MAIN_ADMIN') {
        const perms = user?.permissions || [];
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
          brandName,
          brandTagline,
          brandLogo,
          aboutMessageTitle,
          aboutMessageSubtitle,
          aboutMessageIcon,
          developerName,
          developerRole,
          developerDescription,
          developerPhoto,
          developerTagline,
          developerSocialLinks,
          aboutFooterTitle,
          aboutFooterSubtitle,
          aboutFooterTagline,
        } = req.body;

        if (telegramUrl !== undefined && !perms.includes('EDIT_TELEGRAM')) {
          return res.status(403).json({ error: 'Forbidden: Missing permission (EDIT_TELEGRAM)' });
        }

        if (whatsappUrl !== undefined && !perms.includes('EDIT_WHATSAPP')) {
          return res.status(403).json({ error: 'Forbidden: Missing permission (EDIT_WHATSAPP)' });
        }

        const isEditingStayHappy = (
          happyTitle !== undefined ||
          happyMessage !== undefined ||
          happyIcon !== undefined
        );
        if (isEditingStayHappy && !perms.includes('EDIT_STAY_HAPPY')) {
          return res.status(403).json({ error: 'Forbidden: Missing permission (EDIT_STAY_HAPPY)' });
        }

        const isEditingAbout = (
          aboutTitle !== undefined ||
          aboutDescription !== undefined ||
          brandName !== undefined ||
          brandTagline !== undefined ||
          brandLogo !== undefined ||
          aboutMessageTitle !== undefined ||
          aboutMessageSubtitle !== undefined ||
          aboutMessageIcon !== undefined ||
          aboutFooterTitle !== undefined ||
          aboutFooterSubtitle !== undefined ||
          aboutFooterTagline !== undefined
        );
        if (isEditingAbout && !perms.includes('EDIT_ABOUT_US')) {
          return res.status(403).json({ error: 'Forbidden: Missing permission (EDIT_ABOUT_US)' });
        }

        const isEditingDeveloper = (
          developerName !== undefined ||
          developerRole !== undefined ||
          developerDescription !== undefined ||
          developerPhoto !== undefined ||
          developerTagline !== undefined ||
          developerSocialLinks !== undefined
        );
        if (isEditingDeveloper && !perms.includes('EDIT_DEVELOPER')) {
          return res.status(403).json({ error: 'Forbidden: Missing permission (EDIT_DEVELOPER)' });
        }

        const isEditingMessage = (
          messageTitle !== undefined ||
          messageContent !== undefined
        );
        if (isEditingMessage && !perms.includes('EDIT_MESSAGE')) {
          return res.status(403).json({ error: 'Forbidden: Missing permission (EDIT_MESSAGE)' });
        }
      }
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
        brandName,
        brandTagline,
        brandLogo,
        aboutMessageTitle,
        aboutMessageSubtitle,
        aboutMessageIcon,
        developerName,
        developerRole,
        developerDescription,
        developerPhoto,
        developerTagline,
        developerSocialLinks,
        aboutFooterTitle,
        aboutFooterSubtitle,
        aboutFooterTagline,
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
        brandName: brandName !== undefined ? String(brandName) : undefined,
        brandTagline: brandTagline !== undefined ? String(brandTagline) : undefined,
        brandLogo: brandLogo !== undefined ? String(brandLogo) : undefined,
        aboutMessageTitle: aboutMessageTitle !== undefined ? String(aboutMessageTitle) : undefined,
        aboutMessageSubtitle: aboutMessageSubtitle !== undefined ? String(aboutMessageSubtitle) : undefined,
        aboutMessageIcon: aboutMessageIcon !== undefined ? String(aboutMessageIcon) : undefined,
        developerName: developerName !== undefined ? String(developerName) : undefined,
        developerRole: developerRole !== undefined ? String(developerRole) : undefined,
        developerDescription: developerDescription !== undefined ? String(developerDescription) : undefined,
        developerPhoto: developerPhoto !== undefined ? String(developerPhoto) : undefined,
        developerTagline: developerTagline !== undefined ? String(developerTagline) : undefined,
        developerSocialLinks: developerSocialLinks !== undefined ? developerSocialLinks : undefined,
        aboutFooterTitle: aboutFooterTitle !== undefined ? String(aboutFooterTitle) : undefined,
        aboutFooterSubtitle: aboutFooterSubtitle !== undefined ? String(aboutFooterSubtitle) : undefined,
        aboutFooterTagline: aboutFooterTagline !== undefined ? String(aboutFooterTagline) : undefined,
      });

      res.json(updated);
    } catch (err: any) {
      console.error('Error saving site settings:', err);
      res.status(400).json({ error: err.message || 'Failed to save site settings' });
    }
  });

  // Dedicated About Us endpoint (supports both /api/admin/about-us and /api/about-us)
  const handleUpdateAboutUs = (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (user?.role !== 'MAIN_ADMIN') {
        const perms = user?.permissions || [];
        const {
          developerName,
          developerRole,
          developerDescription,
          developerPhoto,
          developerTagline,
          developerSocialLinks,
          aboutTitle,
          aboutDescription,
          brandName,
          brandTagline,
          brandLogo,
          aboutMessageTitle,
          aboutMessageSubtitle,
          aboutMessageIcon,
          aboutFooterTitle,
          aboutFooterSubtitle,
          aboutFooterTagline,
        } = req.body;

        const isDev = (
          developerName !== undefined ||
          developerRole !== undefined ||
          developerDescription !== undefined ||
          developerPhoto !== undefined ||
          developerTagline !== undefined ||
          developerSocialLinks !== undefined
        );
        if (isDev && !perms.includes('EDIT_DEVELOPER')) {
          return res.status(403).json({ error: 'Forbidden: Missing permission (EDIT_DEVELOPER)' });
        }

        const isAbout = (
          aboutTitle !== undefined ||
          aboutDescription !== undefined ||
          brandName !== undefined ||
          brandTagline !== undefined ||
          brandLogo !== undefined ||
          aboutMessageTitle !== undefined ||
          aboutMessageSubtitle !== undefined ||
          aboutMessageIcon !== undefined ||
          aboutFooterTitle !== undefined ||
          aboutFooterSubtitle !== undefined ||
          aboutFooterTagline !== undefined
        );
        if (isAbout && !perms.includes('EDIT_ABOUT_US')) {
          return res.status(403).json({ error: 'Forbidden: Missing permission (EDIT_ABOUT_US)' });
        }
      }

      const updated = updateSiteSettings(req.body);
      res.json(updated);
    } catch (err: any) {
      console.error('Error updating about us:', err);
      res.status(400).json({ error: err.message || 'Failed to update about us' });
    }
  };

  app.put('/api/admin/about-us', requireAdminAuth, requireAnyPermission(['EDIT_ABOUT_US', 'EDIT_DEVELOPER']), handleUpdateAboutUs);
  app.put('/api/about-us', requireAdminAuth, requireAnyPermission(['EDIT_ABOUT_US', 'EDIT_DEVELOPER']), handleUpdateAboutUs);

  // Dedicated admin endpoint for updating legacy Message / Notice
  app.put('/api/admin/message', requireAdminAuth, requirePermission('EDIT_MESSAGE'), (req: AuthRequest, res) => {
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
  // MESSAGE / NOTICE GRANULAR ROUTES
  // ==========================================

  // Public messages list
  app.get('/api/messages', (req, res) => {
    try {
      const messages = getPublishedMessages();
      res.json(messages);
    } catch (err: any) {
      console.error('Error fetching public messages:', err);
      res.status(500).json({ error: 'Failed to retrieve messages' });
    }
  });

  // Admin messages list (requires VIEW_MESSAGES)
  app.get('/api/admin/messages', requireAdminAuth, requireAnyPermission(['VIEW_MESSAGES', 'ADD_MESSAGE', 'EDIT_MESSAGE', 'DELETE_MESSAGE', 'PUBLISH_MESSAGE', 'REORDER_MESSAGES', 'MANAGE_MESSAGE_LINKS']), (req, res) => {
    try {
      const messages = getMessages();
      res.json(messages);
    } catch (err: any) {
      console.error('Error fetching admin messages:', err);
      res.status(500).json({ error: 'Failed to retrieve messages' });
    }
  });

  // Create Message (requires ADD_MESSAGE)
  const handleCreateMessage = (req: AuthRequest, res: Response) => {
    try {
      const { title, content, isPublished, linkUrl, linkLabel } = req.body;
      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Message title is required' });
      }
      if (!content || typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      // Check link permission if link provided
      if (req.user?.role !== 'MAIN_ADMIN' && (linkUrl || linkLabel)) {
        if (!req.user?.permissions?.includes('MANAGE_MESSAGE_LINKS')) {
          return res.status(403).json({ error: 'Forbidden: Missing permission (MANAGE_MESSAGE_LINKS)' });
        }
      }

      const created = createMessage({
        title: title.trim(),
        content: content.trim(),
        isPublished: typeof isPublished === 'boolean' ? isPublished : true,
        linkUrl: linkUrl ? String(linkUrl).trim() : '',
        linkLabel: linkLabel ? String(linkLabel).trim() : '',
      });

      // Keep site settings in sync if published
      if (created.isPublished) {
        updateSiteSettings({
          messageTitle: created.title,
          messageContent: created.content,
        });
      }

      res.status(201).json(created);
    } catch (err: any) {
      console.error('Error creating message:', err);
      res.status(400).json({ error: err.message || 'Failed to create message' });
    }
  };

  app.post('/api/admin/messages', requireAdminAuth, requirePermission('ADD_MESSAGE'), handleCreateMessage);
  app.post('/api/messages', requireAdminAuth, requirePermission('ADD_MESSAGE'), handleCreateMessage);

  // Update Message (requires EDIT_MESSAGE)
  const handleUpdateMessage = (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, content, isPublished, linkUrl, linkLabel, sortOrder } = req.body;

      if (title !== undefined && (!title || !String(title).trim())) {
        return res.status(400).json({ error: 'Message title cannot be empty' });
      }
      if (content !== undefined && (!content || !String(content).trim())) {
        return res.status(400).json({ error: 'Message content cannot be empty' });
      }

      // Check link permission if links touched
      if (req.user?.role !== 'MAIN_ADMIN' && (linkUrl !== undefined || linkLabel !== undefined)) {
        if (!req.user?.permissions?.includes('MANAGE_MESSAGE_LINKS')) {
          return res.status(403).json({ error: 'Forbidden: Missing permission (MANAGE_MESSAGE_LINKS)' });
        }
      }

      const updated = updateMessage(id, {
        title: title !== undefined ? String(title).trim() : undefined,
        content: content !== undefined ? String(content).trim() : undefined,
        isPublished: typeof isPublished === 'boolean' ? isPublished : undefined,
        linkUrl: linkUrl !== undefined ? String(linkUrl).trim() : undefined,
        linkLabel: linkLabel !== undefined ? String(linkLabel).trim() : undefined,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : undefined,
      });

      if (!updated) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Keep site settings in sync if published
      if (updated.isPublished) {
        updateSiteSettings({
          messageTitle: updated.title,
          messageContent: updated.content,
        });
      }

      res.json(updated);
    } catch (err: any) {
      console.error('Error updating message:', err);
      res.status(400).json({ error: err.message || 'Failed to update message' });
    }
  };

  app.put('/api/admin/messages/:id', requireAdminAuth, requirePermission('EDIT_MESSAGE'), handleUpdateMessage);
  app.put('/api/messages/:id', requireAdminAuth, requirePermission('EDIT_MESSAGE'), handleUpdateMessage);

  // Publish / Unpublish Message (requires PUBLISH_MESSAGE)
  const handlePublishMessage = (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { isPublished } = req.body;
      if (typeof isPublished !== 'boolean') {
        return res.status(400).json({ error: 'isPublished boolean is required' });
      }

      const updated = publishMessage(id, isPublished);
      if (!updated) {
        return res.status(404).json({ error: 'Message not found' });
      }

      if (updated.isPublished) {
        updateSiteSettings({
          messageTitle: updated.title,
          messageContent: updated.content,
        });
      }

      res.json(updated);
    } catch (err: any) {
      console.error('Error publishing message:', err);
      res.status(500).json({ error: 'Failed to update message publication status' });
    }
  };

  app.put('/api/admin/messages/:id/publish', requireAdminAuth, requirePermission('PUBLISH_MESSAGE'), handlePublishMessage);
  app.put('/api/messages/:id/publish', requireAdminAuth, requirePermission('PUBLISH_MESSAGE'), handlePublishMessage);

  // Delete Message (requires DELETE_MESSAGE)
  const handleDeleteMessage = (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const success = deleteMessage(id);
      if (!success) {
        return res.status(404).json({ error: 'Message not found' });
      }
      res.json({ success: true, message: 'Message deleted successfully' });
    } catch (err: any) {
      console.error('Error deleting message:', err);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  };

  app.delete('/api/admin/messages/:id', requireAdminAuth, requirePermission('DELETE_MESSAGE'), handleDeleteMessage);
  app.delete('/api/messages/:id', requireAdminAuth, requirePermission('DELETE_MESSAGE'), handleDeleteMessage);

  // Reorder Messages (requires REORDER_MESSAGES)
  const handleReorderMessages = (req: AuthRequest, res: Response) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ error: 'Invalid ids array for reordering' });
      }
      reorderMessages(ids);
      res.json({ success: true, messages: getMessages() });
    } catch (err: any) {
      console.error('Error reordering messages:', err);
      res.status(500).json({ error: 'Failed to reorder messages' });
    }
  };

  app.post('/api/admin/messages/reorder', requireAdminAuth, requirePermission('REORDER_MESSAGES'), handleReorderMessages);
  app.post('/api/messages/reorder', requireAdminAuth, requirePermission('REORDER_MESSAGES'), handleReorderMessages);

  // ==========================================
  // ADMIN TEAM MEMBERS ROUTES (GRANULAR)
  // ==========================================
  app.get('/api/admin/team-members', requireAdminAuth, requireAnyPermission(['VIEW_ABOUT_US_TEAM', 'EDIT_ABOUT_US', 'EDIT_DEVELOPER', 'ADD_TEAM_MEMBER', 'EDIT_TEAM_MEMBER', 'DELETE_TEAM_MEMBER', 'MANAGE_TEAM_SOCIAL_LINKS', 'REORDER_TEAM_MEMBERS']), (req, res) => {
    try {
      const members = getTeamMembers();
      res.json(members);
    } catch (err: any) {
      console.error('Error fetching admin team members:', err);
      res.status(500).json({ error: 'Failed to retrieve team members' });
    }
  });

  const handleCreateTeamMember = (req: AuthRequest, res: Response) => {
    try {
      const { name, role, description, photo, sortOrder, socialLinks } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Team member name is required' });
      }
      if (!role || typeof role !== 'string' || !role.trim()) {
        return res.status(400).json({ error: 'Team member role / designation is required' });
      }

      // Check social links permission
      if (req.user?.role !== 'MAIN_ADMIN' && Array.isArray(socialLinks) && socialLinks.length > 0) {
        if (!req.user?.permissions?.includes('MANAGE_TEAM_SOCIAL_LINKS')) {
          return res.status(403).json({ error: 'Forbidden: Missing permission (MANAGE_TEAM_SOCIAL_LINKS)' });
        }
      }

      const created = createTeamMember({
        name: name.trim(),
        role: role.trim(),
        description: description ? String(description) : '',
        photo: photo ? String(photo) : '',
        sortOrder: typeof sortOrder === 'number' ? sortOrder : undefined,
        socialLinks: Array.isArray(socialLinks) ? socialLinks : [],
      });
      res.status(201).json(created);
    } catch (err: any) {
      console.error('Error creating team member:', err);
      res.status(400).json({ error: err.message || 'Failed to create team member' });
    }
  };

  app.post('/api/admin/team-members', requireAdminAuth, requirePermission('ADD_TEAM_MEMBER'), handleCreateTeamMember);
  app.post('/api/team-members', requireAdminAuth, requirePermission('ADD_TEAM_MEMBER'), handleCreateTeamMember);

  const handleUpdateTeamMember = (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, role, description, photo, sortOrder, socialLinks } = req.body;
      if (name !== undefined && (!name || !String(name).trim())) {
        return res.status(400).json({ error: 'Team member name cannot be empty' });
      }
      if (role !== undefined && (!role || !String(role).trim())) {
        return res.status(400).json({ error: 'Team member role cannot be empty' });
      }

      // Check social links permission if modified
      if (req.user?.role !== 'MAIN_ADMIN' && socialLinks !== undefined) {
        if (!req.user?.permissions?.includes('MANAGE_TEAM_SOCIAL_LINKS')) {
          return res.status(403).json({ error: 'Forbidden: Missing permission (MANAGE_TEAM_SOCIAL_LINKS)' });
        }
      }

      const updated = updateTeamMember(id, {
        name: name !== undefined ? String(name).trim() : undefined,
        role: role !== undefined ? String(role).trim() : undefined,
        description: description !== undefined ? String(description) : undefined,
        photo: photo !== undefined ? String(photo) : undefined,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : undefined,
        socialLinks: socialLinks !== undefined ? socialLinks : undefined,
      });

      if (!updated) {
        return res.status(404).json({ error: 'Team member not found' });
      }
      res.json(updated);
    } catch (err: any) {
      console.error('Error updating team member:', err);
      res.status(400).json({ error: err.message || 'Failed to update team member' });
    }
  };

  app.put('/api/admin/team-members/:id', requireAdminAuth, requirePermission('EDIT_TEAM_MEMBER'), handleUpdateTeamMember);
  app.put('/api/team-members/:id', requireAdminAuth, requirePermission('EDIT_TEAM_MEMBER'), handleUpdateTeamMember);

  const handleDeleteTeamMember = (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const success = deleteTeamMember(id);
      if (!success) {
        return res.status(404).json({ error: 'Team member not found' });
      }
      res.json({ success: true, message: 'Team member deleted' });
    } catch (err: any) {
      console.error('Error deleting team member:', err);
      res.status(500).json({ error: 'Failed to delete team member' });
    }
  };

  app.delete('/api/admin/team-members/:id', requireAdminAuth, requirePermission('DELETE_TEAM_MEMBER'), handleDeleteTeamMember);
  app.delete('/api/team-members/:id', requireAdminAuth, requirePermission('DELETE_TEAM_MEMBER'), handleDeleteTeamMember);

  const handleReorderTeamMembers = (req: AuthRequest, res: Response) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ error: 'Invalid ids array for reordering' });
      }
      reorderTeamMembers(ids);
      res.json({ success: true, members: getTeamMembers() });
    } catch (err: any) {
      console.error('Error reordering team members:', err);
      res.status(500).json({ error: 'Failed to reorder team members' });
    }
  };

  app.post('/api/admin/team-members/reorder', requireAdminAuth, requirePermission('REORDER_TEAM_MEMBERS'), handleReorderTeamMembers);
  app.post('/api/team-members/reorder', requireAdminAuth, requirePermission('REORDER_TEAM_MEMBERS'), handleReorderTeamMembers);

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

  app.put('/api/admin/achievements/message', requireAdminAuth, requireAnyPermission(['VIEW_DASHBOARD', 'EDIT_ABOUT_US']), (req, res) => {
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

  app.post('/api/admin/achievements', requireAdminAuth, requireAnyPermission(['VIEW_DASHBOARD', 'EDIT_ABOUT_US']), (req, res) => {
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

  app.put('/api/admin/achievements/:id', requireAdminAuth, requireAnyPermission(['VIEW_DASHBOARD', 'EDIT_ABOUT_US']), (req, res) => {
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
  const handleToggleAchievementPin = (req: AuthRequest, res: Response) => {
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

  app.patch('/api/admin/achievements/:id/pin', requireAdminAuth, requireAnyPermission(['VIEW_DASHBOARD', 'EDIT_ABOUT_US']), handleToggleAchievementPin);
  app.post('/api/admin/achievements/:id/pin', requireAdminAuth, requireAnyPermission(['VIEW_DASHBOARD', 'EDIT_ABOUT_US']), handleToggleAchievementPin);

  app.delete('/api/admin/achievements/:id', requireAdminAuth, requireAnyPermission(['VIEW_DASHBOARD', 'EDIT_ABOUT_US']), (req, res) => {
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
  app.post('/api/webapps/:id/servers', requireAdminAuth, requirePermission('ADD_SERVER'), (req, res) => {
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

  // Explicit JSON 404 for unhandled API requests
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.path} not found` });
  });

  // ==========================================
  // VITE DEV / PRODUCTION STANDALONE SERVER
  // ==========================================
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

  // Only auto-start the standalone server when not in serverless mode (e.g. Vercel)
  const isServerless = process.env.IS_SERVERLESS === '1' || process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (!isServerless) {
    startServer().catch(err => {
      console.error('[Server] Fatal startup error:', err);
      process.exit(1);
    });
  }

  export default app;
