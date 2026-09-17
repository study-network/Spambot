import dotenv from 'dotenv';
dotenv.config({ override: true });
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore
import initSqlJsAsm from 'sql.js/dist/sql-asm.js';
import type { Database } from 'sql.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const REPO_DATA_DIR = path.resolve(process.cwd(), 'data');
const REPO_DB_FILE = path.join(REPO_DATA_DIR, 'app_links.sqlite');

// On Vercel, the runtime container filesystem is strictly read-only except in /tmp
const DATA_DIR = isVercel ? '/tmp' : REPO_DATA_DIR;
const DB_FILE = process.env.DATABASE_FILE 
  ? (path.isAbsolute(process.env.DATABASE_FILE) ? process.env.DATABASE_FILE : path.resolve(process.cwd(), process.env.DATABASE_FILE))
  : (isVercel ? path.join('/tmp', 'app_links.sqlite') : path.join(DATA_DIR, 'app_links.sqlite'));

let db: Database | null = null;

function ensureDirectoryExists(filePath: string) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn('Could not ensure directory exists:', err);
  }
}

function findSourceDbFile(): string | null {
  const candidatePaths = [
    path.resolve(process.cwd(), 'data', 'app_links.sqlite'),
    path.resolve(process.cwd(), 'app_links.sqlite'),
    path.resolve(__dirname, '..', 'data', 'app_links.sqlite'),
    path.resolve(__dirname, 'data', 'app_links.sqlite'),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function saveDb() {
  if (!db) return;
  try {
    ensureDirectoryExists(DB_FILE);
    const data = db.export();
    fs.writeFileSync(DB_FILE, Buffer.from(data));
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  let SQL: any = null;
  try {
    // Attempt standard sql.js (wasm) only if not in serverless and wasm file is present
    if (!isVercel) {
      const wasmPath = path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');
      if (fs.existsSync(wasmPath)) {
        const wasmPkg = await import('sql.js');
        const initFn = (wasmPkg.default || wasmPkg) as any;
        SQL = await initFn();
      }
    }
  } catch (wasmErr) {
    console.warn('[Database] WASM init fallback to ASM:', wasmErr);
  }

  if (!SQL) {
    // Pure JS ASM build - 100% reliable in Vercel Serverless Functions and AWS Lambda
    const initAsm = (initSqlJsAsm.default || initSqlJsAsm) as any;
    SQL = await initAsm();
  }

  ensureDirectoryExists(DB_FILE);

  const sourceDb = findSourceDbFile();

  // If on Vercel and the writable DB in /tmp does not exist yet,
  // copy from the repository bundled sqlite file if present
  if (isVercel && !fs.existsSync(DB_FILE) && sourceDb) {
    try {
      fs.copyFileSync(sourceDb, DB_FILE);
    } catch (err) {
      console.warn('Could not copy repository database to /tmp:', err);
    }
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Could not read existing database file, creating a fresh one:', e);
      db = new SQL.Database();
    }
  } else if (sourceDb) {
    try {
      const fileBuffer = fs.readFileSync(sourceDb);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON;');

  // Schema creation
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS web_apps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      web_app_id TEXT NOT NULL REFERENCES web_apps(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('Working', 'Error', 'Some Error', 'Unfilter', 'Testing')),
      sort_order INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_servers_webapp ON servers(web_app_id);
    CREATE INDEX IF NOT EXISTS idx_servers_sort ON servers(sort_order);

    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
      telegram_url TEXT NOT NULL DEFAULT '',
      whatsapp_url TEXT NOT NULL DEFAULT '',
      about_title TEXT NOT NULL DEFAULT 'About Us',
      about_description TEXT NOT NULL DEFAULT '',
      happy_title TEXT NOT NULL DEFAULT 'Stay Happy',
      happy_message TEXT NOT NULL DEFAULT 'Good things take time 💜',
      happy_icon TEXT NOT NULL DEFAULT '💜',
      message_title TEXT NOT NULL DEFAULT 'Important Message',
      message_content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      image_url TEXT NOT NULL,
      comment TEXT NOT NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS achievement_message (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Important Message',
      content TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      photo TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      social_links TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_team_members_sort ON team_members(sort_order ASC, created_at ASC);

    CREATE TABLE IF NOT EXISTS other_admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'OTHER_ADMIN',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_permissions (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES other_admins(id) ON DELETE CASCADE,
      permission TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      link_url TEXT NOT NULL DEFAULT '',
      link_label TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_perm ON admin_permissions(admin_id, permission);
    CREATE INDEX IF NOT EXISTS idx_other_admins_user ON other_admins(username);
    CREATE INDEX IF NOT EXISTS idx_messages_sort ON messages(sort_order ASC, created_at DESC);
  `);

  // Migrate servers table if existing table lacks 'Some Error' category
  try {
    const tableInfo = db.exec(`SELECT sql FROM sqlite_master WHERE type='table' AND name='servers'`);
    if (tableInfo.length > 0 && tableInfo[0].values.length > 0) {
      const createSql = String(tableInfo[0].values[0][0]);
      if (!createSql.includes('Some Error')) {
        db.run(`
          CREATE TABLE servers_new (
            id TEXT PRIMARY KEY,
            web_app_id TEXT NOT NULL REFERENCES web_apps(id) ON DELETE CASCADE,
            url TEXT NOT NULL,
            category TEXT NOT NULL CHECK(category IN ('Working', 'Error', 'Some Error', 'Unfilter', 'Testing')),
            sort_order INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          INSERT INTO servers_new SELECT id, web_app_id, url, category, sort_order, created_at, updated_at FROM servers;
          DROP TABLE servers;
          ALTER TABLE servers_new RENAME TO servers;
          CREATE INDEX IF NOT EXISTS idx_servers_webapp ON servers(web_app_id);
          CREATE INDEX IF NOT EXISTS idx_servers_sort ON servers(sort_order);
        `);
        saveDb();
        console.log('[Database] Migrated servers table to include Some Error category');
      }
    }
    // Migrate servers table if existing table lacks is_active column
    try {
      const serverCols = db.exec(`PRAGMA table_info(servers)`);
      if (serverCols.length > 0 && serverCols[0].values.length > 0) {
        const colNames = serverCols[0].values.map((col: any) => String(col[1]));
        if (!colNames.includes('is_active')) {
          db.run(`ALTER TABLE servers ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`);
          saveDb();
          console.log('[Database] Added is_active column to servers table');
        }
      }
    } catch (colErr) {
      console.warn('[Database] servers is_active column migration notice:', colErr);
    }
  } catch (migErr) {
    console.warn('[Database] Servers table migration notice:', migErr);
  }

  // Migrate site_settings table if missing message_title or message_content columns
  try {
    const settingsCols = db.exec(`PRAGMA table_info(site_settings)`);
    if (settingsCols.length > 0 && settingsCols[0].values.length > 0) {
      const colNames = settingsCols[0].values.map((col: any) => String(col[1]));
      if (!colNames.includes('message_title')) {
        db.run(`ALTER TABLE site_settings ADD COLUMN message_title TEXT NOT NULL DEFAULT 'Important Message'`);
        console.log('[Database] Added message_title column to site_settings');
      }
      if (!colNames.includes('message_content')) {
        db.run(`ALTER TABLE site_settings ADD COLUMN message_content TEXT NOT NULL DEFAULT ''`);
        console.log('[Database] Added message_content column to site_settings');
      }

      // Brand / About Us / Developer columns migration (clean schema defaults)
      const brandCols: Array<{ name: string; type: string; defaultVal: string }> = [
        { name: 'brand_name', type: 'TEXT', defaultVal: "'Study Network'" },
        { name: 'brand_tagline', type: 'TEXT', defaultVal: "''" },
        { name: 'brand_logo', type: 'TEXT', defaultVal: "''" },
        { name: 'about_message_title', type: 'TEXT', defaultVal: "''" },
        { name: 'about_message_subtitle', type: 'TEXT', defaultVal: "''" },
        { name: 'about_message_icon', type: 'TEXT', defaultVal: "''" },
        { name: 'developer_name', type: 'TEXT', defaultVal: "''" },
        { name: 'developer_role', type: 'TEXT', defaultVal: "''" },
        { name: 'developer_description', type: 'TEXT', defaultVal: "''" },
        { name: 'developer_photo', type: 'TEXT', defaultVal: "''" },
        { name: 'developer_tagline', type: 'TEXT', defaultVal: "''" },
        { name: 'developer_social_links', type: 'TEXT', defaultVal: "'[]'" },
        { name: 'about_footer_title', type: 'TEXT', defaultVal: "''" },
        { name: 'about_footer_subtitle', type: 'TEXT', defaultVal: "''" },
        { name: 'about_footer_tagline', type: 'TEXT', defaultVal: "''" },
      ];

      for (const col of brandCols) {
        if (!colNames.includes(col.name)) {
          try {
            db.run(`ALTER TABLE site_settings ADD COLUMN ${col.name} ${col.type} NOT NULL DEFAULT ${col.defaultVal}`);
            console.log(`[Database] Added ${col.name} column to site_settings`);
          } catch (colErr) {
            console.error(`[Database] Failed to add column ${col.name}:`, colErr);
          }
        }
      }
      saveDb();
    }
  } catch (migErr) {
    console.warn('[Database] site_settings migration notice:', migErr);
  }

  // Migrate achievements table if missing is_pinned column
  try {
    const achCols = db.exec(`PRAGMA table_info(achievements)`);
    if (achCols.length > 0 && achCols[0].values.length > 0) {
      const colNames = achCols[0].values.map((col: any) => String(col[1]));
      if (!colNames.includes('is_pinned')) {
        db.run(`ALTER TABLE achievements ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0`);
        saveDb();
        console.log('[Database] Added is_pinned column to achievements table');
      }
    }
    // Safely create index now that column is guaranteed to exist
    db.run(`CREATE INDEX IF NOT EXISTS idx_achievements_pinned ON achievements(is_pinned DESC, created_at DESC)`);
  } catch (migErr) {
    console.warn('[Database] achievements migration notice:', migErr);
  }

  // Initialize clean site settings row if table is completely empty
  const settingsCheck = db.exec(`SELECT id FROM site_settings LIMIT 1`);
  if (settingsCheck.length === 0 || settingsCheck[0].values.length === 0) {
    const now = new Date().toISOString();
    const sId = 'default_settings';
    const stmt = db.prepare(`
      INSERT INTO site_settings (
        id, telegram_url, whatsapp_url, about_title, about_description,
        happy_title, happy_message, happy_icon, message_title, message_content,
        brand_name, brand_tagline, brand_logo,
        about_message_title, about_message_subtitle, about_message_icon,
        developer_name, developer_role, developer_description, developer_photo, developer_tagline, developer_social_links,
        about_footer_title, about_footer_subtitle, about_footer_tagline,
        created_at, updated_at
      ) VALUES (
        ?, '', '', 'About Us', '',
        'Stay Happy', '', '💜', 'Important Message', '',
        'Study Network', '', '',
        '', '', '',
        '', '', '', '', '', '[]',
        '', '', '',
        ?, ?
      )
    `);
    stmt.run([sId, now, now]);
    stmt.free();
    console.log('[Database] Initialized baseline clean site settings');
  }

  // Ensure baseline admin user exists in users table if table is completely empty
  const userCheck = db.exec(`SELECT id FROM users LIMIT 1`);
  if (userCheck.length === 0 || userCheck[0].values.length === 0) {
    const now = new Date().toISOString();
    const defaultAdminId = crypto.randomUUID();
    const defaultHash = bcrypt.hashSync('admin', 10);
    const userStmt = db.prepare(`INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)`);
    userStmt.run([defaultAdminId, 'admin', defaultHash, 'admin', now]);
    userStmt.free();
    console.log('[Database] Seeded baseline fallback admin into users table');
  }

  // Ensure baseline web apps exist if table is completely empty
  const appsCheck = db.exec(`SELECT id FROM web_apps LIMIT 1`);
  if (appsCheck.length === 0 || appsCheck[0].values.length === 0) {
    const now = new Date().toISOString();
    const app1Id = '8c87887e-cf9b-4092-84cf-d5a38585a28d';
    const app2Id = '2301455b-1092-473d-92a1-be904df6da8d';
    const app3Id = 'a8475b2e-3f85-4e0c-85ca-73e047f23cbb';

    const appStmt = db.prepare(`INSERT INTO web_apps (id, name, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`);
    appStmt.run([app1Id, 'Study App', 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=256&q=80', now, now]);
    appStmt.run([app2Id, 'Movie App', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=256&q=80', now, now]);
    appStmt.run([app3Id, 'Tools App', 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=256&q=80', now, now]);
    appStmt.free();

    const serverStmt = db.prepare(`INSERT INTO servers (id, web_app_id, url, category, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    serverStmt.run([crypto.randomUUID(), app1Id, 'https://example.com/study1', 'Working', 1, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app1Id, 'https://example.com/study2', 'Error', 2, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app1Id, 'https://example.com/study3', 'Unfilter', 3, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app1Id, 'https://example.com/study4', 'Working', 4, 1, now, now]);

    serverStmt.run([crypto.randomUUID(), app2Id, 'https://example.com/movie1', 'Working', 1, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app2Id, 'https://example.com/movie2', 'Working', 2, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app2Id, 'https://example.com/movie3', 'Error', 3, 1, now, now]);

    serverStmt.run([crypto.randomUUID(), app3Id, 'https://example.com/tools1', 'Working', 1, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app3Id, 'https://example.com/tools2', 'Unfilter', 2, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app3Id, 'https://example.com/tools3', 'Working', 3, 1, now, now]);
    serverStmt.free();

    console.log('[Database] Seeded baseline web apps and servers');
  }

  saveDb();
  return db;
}

// Ensure db is loaded
export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Public queries
export function getPublicWebApps() {
  const database = getDb();
  // Fetch web apps
  const appsRes = database.exec(`SELECT id, name, icon FROM web_apps ORDER BY created_at DESC`);
  if (appsRes.length === 0) return [];

  const apps = appsRes[0].values.map(row => ({
    id: String(row[0]),
    name: String(row[1]),
    icon: String(row[2]),
  }));

  // Fetch servers for all apps ordered by sort_order
  const serversRes = database.exec(`
    SELECT id, web_app_id, category, sort_order, is_active 
    FROM servers 
    ORDER BY sort_order ASC, created_at ASC
  `);

  const serversByApp: Record<string, Array<{ id: string; category: string; order: number; isActive: boolean }>> = {};
  if (serversRes.length > 0) {
    serversRes[0].values.forEach(row => {
      const serverId = String(row[0]);
      const appId = String(row[1]);
      const category = String(row[2]);
      const order = Number(row[3]);
      const isActive = row[4] !== undefined && row[4] !== null ? Number(row[4]) !== 0 : true;
      if (!serversByApp[appId]) serversByApp[appId] = [];
      serversByApp[appId].push({ id: serverId, category, order, isActive });
    });
  }

  return apps.map(app => {
    const appServers = serversByApp[app.id] || [];
    // Dynamic naming: Server 1, Server 2, Server 3... based on current list order
    const formattedServers = appServers.map((s, index) => ({
      id: s.id,
      name: `Server ${index + 1}`,
      category: s.category,
      isActive: s.isActive,
    }));
    return {
      id: app.id,
      name: app.name,
      icon: app.icon,
      servers: formattedServers,
    };
  });
}

// Detailed server launch info lookup (includes isActive validation)
export function getServerLaunchInfo(webAppId: string, serverId: string): { url: string; isActive: boolean } | null {
  const database = getDb();
  const stmt = database.prepare(`SELECT url, is_active FROM servers WHERE id = ? AND web_app_id = ? LIMIT 1`);
  stmt.bind([serverId, webAppId]);
  if (stmt.step()) {
    const row = stmt.get();
    stmt.free();
    return {
      url: String(row[0]),
      isActive: row[1] !== undefined && row[1] !== null ? Number(row[1]) !== 0 : true,
    };
  }
  stmt.free();
  return null;
}

// Launch server URL lookup (used when user clicks server in modal - checks isActive)
export function getServerLaunchUrl(webAppId: string, serverId: string): string | null {
  const info = getServerLaunchInfo(webAppId, serverId);
  if (!info || !info.isActive) {
    return null;
  }
  return info.url;
}

// Toggle or set server isActive status independently
export function toggleServerStatus(serverId: string, isActive?: boolean): { id: string; isActive: boolean } | null {
  const database = getDb();
  const stmt = database.prepare(`SELECT id, is_active FROM servers WHERE id = ? LIMIT 1`);
  stmt.bind([serverId]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.get();
  stmt.free();

  const currentActive = row[1] !== undefined && row[1] !== null ? Number(row[1]) !== 0 : true;
  const newActive = isActive !== undefined ? (isActive ? 1 : 0) : (currentActive ? 0 : 1);
  const now = new Date().toISOString();

  const updateStmt = database.prepare(`UPDATE servers SET is_active = ?, updated_at = ? WHERE id = ?`);
  updateStmt.run([newActive, now, serverId]);
  updateStmt.free();
  saveDb();

  return {
    id: serverId,
    isActive: newActive === 1,
  };
}

// Admin stats
export function getAdminStats() {
  const database = getDb();
  const totalAppsRes = database.exec(`SELECT COUNT(*) FROM web_apps`);
  const totalApps = totalAppsRes.length > 0 ? Number(totalAppsRes[0].values[0][0]) : 0;

  const totalServersRes = database.exec(`SELECT COUNT(*) FROM servers`);
  const totalServers = totalServersRes.length > 0 ? Number(totalServersRes[0].values[0][0]) : 0;

  const workingRes = database.exec(`SELECT COUNT(*) FROM servers WHERE category = 'Working'`);
  const workingServers = workingRes.length > 0 ? Number(workingRes[0].values[0][0]) : 0;

  const errorRes = database.exec(`SELECT COUNT(*) FROM servers WHERE category = 'Error'`);
  const errorServers = errorRes.length > 0 ? Number(errorRes[0].values[0][0]) : 0;

  const someErrorRes = database.exec(`SELECT COUNT(*) FROM servers WHERE category = 'Some Error'`);
  const someErrorServers = someErrorRes.length > 0 ? Number(someErrorRes[0].values[0][0]) : 0;

  const unfilterRes = database.exec(`SELECT COUNT(*) FROM servers WHERE category = 'Unfilter'`);
  const unfilterServers = unfilterRes.length > 0 ? Number(unfilterRes[0].values[0][0]) : 0;

  const testingRes = database.exec(`SELECT COUNT(*) FROM servers WHERE category = 'Testing'`);
  const testingServers = testingRes.length > 0 ? Number(testingRes[0].values[0][0]) : 0;

  return {
    totalWebApps: totalApps,
    totalServers: totalServers,
    workingServers: workingServers,
    errorServers: errorServers,
    someErrorServers: someErrorServers,
    unfilterServers: unfilterServers,
    testingServers: testingServers,
  };
}

// Admin get all apps with full details
export function getAdminWebApps() {
  const database = getDb();
  const appsRes = database.exec(`SELECT id, name, icon, created_at, updated_at FROM web_apps ORDER BY created_at DESC`);
  if (appsRes.length === 0) return [];

  const apps = appsRes[0].values.map(row => ({
    id: String(row[0]),
    name: String(row[1]),
    icon: String(row[2]),
    createdAt: String(row[3]),
    updatedAt: String(row[4]),
  }));

  const serversRes = database.exec(`
    SELECT id, web_app_id, url, category, sort_order, is_active, created_at, updated_at 
    FROM servers 
    ORDER BY sort_order ASC, created_at ASC
  `);

  const serversByApp: Record<string, any[]> = {};
  if (serversRes.length > 0) {
    serversRes[0].values.forEach(row => {
      const appId = String(row[1]);
      if (!serversByApp[appId]) serversByApp[appId] = [];
      serversByApp[appId].push({
        id: String(row[0]),
        webAppId: appId,
        url: String(row[2]),
        category: String(row[3]),
        sortOrder: Number(row[4]),
        isActive: row[5] !== undefined && row[5] !== null ? Number(row[5]) !== 0 : true,
        createdAt: String(row[6]),
        updatedAt: String(row[7]),
      });
    });
  }

  return apps.map(app => ({
    ...app,
    servers: serversByApp[app.id] || [],
  }));
}

// Admin get single app
export function getAdminWebAppById(id: string) {
  const database = getDb();
  const stmt = database.prepare(`SELECT id, name, icon, created_at, updated_at FROM web_apps WHERE id = ?`);
  stmt.bind([id]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.get();
  stmt.free();

  const app = {
    id: String(row[0]),
    name: String(row[1]),
    icon: String(row[2]),
    createdAt: String(row[3]),
    updatedAt: String(row[4]),
    servers: [] as any[],
  };

  const sStmt = database.prepare(`
    SELECT id, web_app_id, url, category, sort_order, is_active, created_at, updated_at 
    FROM servers 
    WHERE web_app_id = ? 
    ORDER BY sort_order ASC, created_at ASC
  `);
  sStmt.bind([id]);
  while (sStmt.step()) {
    const sRow = sStmt.get();
    app.servers.push({
      id: String(sRow[0]),
      webAppId: String(sRow[1]),
      url: String(sRow[2]),
      category: String(sRow[3]),
      sortOrder: Number(sRow[4]),
      isActive: sRow[5] !== undefined && sRow[5] !== null ? Number(sRow[5]) !== 0 : true,
      createdAt: String(sRow[6]),
      updatedAt: String(sRow[7]),
    });
  }
  sStmt.free();

  return app;
}

// Admin Create Web App with servers
export function createWebApp(name: string, icon: string, servers: Array<{ url: string; category: string; isActive?: boolean }>) {
  const database = getDb();
  const appId = crypto.randomUUID();
  const now = new Date().toISOString();

  database.run('BEGIN TRANSACTION;');
  try {
    const appStmt = database.prepare(`INSERT INTO web_apps (id, name, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`);
    appStmt.run([appId, name, icon, now, now]);
    appStmt.free();

    servers.forEach((s, idx) => {
      const sStmt = database.prepare(`INSERT INTO servers (id, web_app_id, url, category, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      const activeVal = s.isActive !== false ? 1 : 0;
      sStmt.run([crypto.randomUUID(), appId, s.url, s.category, idx + 1, activeVal, now, now]);
      sStmt.free();
    });

    database.run('COMMIT;');
    saveDb();
    return getAdminWebAppById(appId);
  } catch (error) {
    database.run('ROLLBACK;');
    throw error;
  }
}

// Admin Update Web App and its servers
export function updateWebApp(id: string, name: string, icon: string, servers: Array<{ id?: string; url: string; category: string; isActive?: boolean }>) {
  const database = getDb();
  const now = new Date().toISOString();

  database.run('BEGIN TRANSACTION;');
  try {
    const appStmt = database.prepare(`UPDATE web_apps SET name = ?, icon = ?, updated_at = ? WHERE id = ?`);
    appStmt.run([name, icon, now, id]);
    appStmt.free();

    // Delete existing servers for this webApp and re-insert in current order
    // This cleanly guarantees Server 1, Server 2, Server 3 order and handles additions/deletions/reorderings seamlessly
    const delStmt = database.prepare(`DELETE FROM servers WHERE web_app_id = ?`);
    delStmt.run([id]);
    delStmt.free();

    servers.forEach((s, idx) => {
      const serverId = s.id || crypto.randomUUID();
      const activeVal = s.isActive !== false ? 1 : 0;
      const sStmt = database.prepare(`INSERT INTO servers (id, web_app_id, url, category, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      sStmt.run([serverId, id, s.url, s.category, idx + 1, activeVal, now, now]);
      sStmt.free();
    });

    database.run('COMMIT;');
    saveDb();
    return getAdminWebAppById(id);
  } catch (error) {
    database.run('ROLLBACK;');
    throw error;
  }
}

// Admin Delete Web App
export function deleteWebApp(id: string) {
  const database = getDb();
  database.run('BEGIN TRANSACTION;');
  try {
    // Delete servers first to ensure cascade even if PRAGMA foreign_keys had an issue
    const delServers = database.prepare(`DELETE FROM servers WHERE web_app_id = ?`);
    delServers.run([id]);
    delServers.free();

    const delApp = database.prepare(`DELETE FROM web_apps WHERE id = ?`);
    delApp.run([id]);
    delApp.free();

    database.run('COMMIT;');
    saveDb();
    return true;
  } catch (error) {
    database.run('ROLLBACK;');
    throw error;
  }
}

// User auth lookup
export function getUserByEmail(email: string) {
  const database = getDb();
  const stmt = database.prepare(`SELECT id, email, password_hash, role, created_at FROM users WHERE email = ? LIMIT 1`);
  stmt.bind([email.toLowerCase().trim()]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.get();
  stmt.free();
  return {
    id: String(row[0]),
    email: String(row[1]),
    passwordHash: String(row[2]),
    role: String(row[3]),
    createdAt: String(row[4]),
  };
}

// Site Settings queries
export function getSiteSettings() {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, telegram_url, whatsapp_url, about_title, about_description, happy_title, happy_message, happy_icon, message_title, message_content,
           brand_name, brand_tagline, brand_logo,
           about_message_title, about_message_subtitle, about_message_icon,
           developer_name, developer_role, developer_description, developer_photo, developer_tagline, developer_social_links,
           about_footer_title, about_footer_subtitle, about_footer_tagline,
           created_at, updated_at
    FROM site_settings
    LIMIT 1
  `);
  if (!stmt.step()) {
    stmt.free();
    return {
      id: 'default_settings',
      telegramUrl: '',
      whatsappUrl: '',
      aboutTitle: 'About Us',
      aboutDescription: '',
      happyTitle: 'Stay Happy',
      happyMessage: '',
      happyIcon: '💜',
      messageTitle: 'Important Message',
      messageContent: '',
      brandName: 'Study Network',
      brandTagline: '',
      brandLogo: '',
      aboutMessageTitle: '',
      aboutMessageSubtitle: '',
      aboutMessageIcon: '',
      developerName: '',
      developerRole: '',
      developerDescription: '',
      developerPhoto: '',
      developerTagline: '',
      developerSocialLinks: [],
      aboutFooterTitle: '',
      aboutFooterSubtitle: '',
      aboutFooterTagline: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const row = stmt.get();
  stmt.free();

  let devLinks: Array<{ id: string; platform: string; url: string; customName?: string }> = [];
  try {
    if (row[21]) {
      devLinks = JSON.parse(String(row[21]));
    }
  } catch (e) {
    devLinks = [];
  }

  return {
    id: String(row[0]),
    telegramUrl: String(row[1] || ''),
    whatsappUrl: String(row[2] || ''),
    aboutTitle: String(row[3] || 'About Us'),
    aboutDescription: String(row[4] || ''),
    happyTitle: String(row[5] || 'Stay Happy'),
    happyMessage: String(row[6] || ''),
    happyIcon: String(row[7] || '💜'),
    messageTitle: String(row[8] ?? 'Important Message'),
    messageContent: String(row[9] ?? ''),
    brandName: String(row[10] || 'Study Network'),
    brandTagline: String(row[11] || ''),
    brandLogo: String(row[12] || ''),
    aboutMessageTitle: String(row[13] || ''),
    aboutMessageSubtitle: String(row[14] || ''),
    aboutMessageIcon: String(row[15] || ''),
    developerName: String(row[16] || ''),
    developerRole: String(row[17] || ''),
    developerDescription: String(row[18] || ''),
    developerPhoto: String(row[19] || ''),
    developerTagline: String(row[20] || ''),
    developerSocialLinks: Array.isArray(devLinks) ? devLinks : [],
    aboutFooterTitle: String(row[22] || ''),
    aboutFooterSubtitle: String(row[23] || ''),
    aboutFooterTagline: String(row[24] || ''),
    createdAt: String(row[25]),
    updatedAt: String(row[26]),
  };
}

export function updateSiteSettings(payload: {
  telegramUrl?: string;
  whatsappUrl?: string;
  aboutTitle?: string;
  aboutDescription?: string;
  happyTitle?: string;
  happyMessage?: string;
  happyIcon?: string;
  messageTitle?: string;
  messageContent?: string;
  brandName?: string;
  brandTagline?: string;
  brandLogo?: string;
  aboutMessageTitle?: string;
  aboutMessageSubtitle?: string;
  aboutMessageIcon?: string;
  developerName?: string;
  developerRole?: string;
  developerDescription?: string;
  developerPhoto?: string;
  developerTagline?: string;
  developerSocialLinks?: any[];
  aboutFooterTitle?: string;
  aboutFooterSubtitle?: string;
  aboutFooterTagline?: string;
}) {
  const database = getDb();
  const now = new Date().toISOString();
  
  // Check if any row exists
  const existing = getSiteSettings();
  const rowId = existing.id || 'default_settings';

  const telegramUrl = payload.telegramUrl !== undefined ? payload.telegramUrl.trim() : existing.telegramUrl;
  const whatsappUrl = payload.whatsappUrl !== undefined ? payload.whatsappUrl.trim() : existing.whatsappUrl;
  const aboutTitle = payload.aboutTitle !== undefined ? payload.aboutTitle.trim() : existing.aboutTitle;
  const aboutDescription = payload.aboutDescription !== undefined ? payload.aboutDescription.trim() : existing.aboutDescription;
  const happyTitle = payload.happyTitle !== undefined ? payload.happyTitle.trim() : existing.happyTitle;
  const happyMessage = payload.happyMessage !== undefined ? payload.happyMessage.trim() : existing.happyMessage;
  const happyIcon = payload.happyIcon !== undefined ? payload.happyIcon.trim() : (existing.happyIcon || '💜');
  const messageTitle = payload.messageTitle !== undefined ? payload.messageTitle.trim() : (existing.messageTitle || 'Important Message');
  const messageContent = payload.messageContent !== undefined ? payload.messageContent : (existing.messageContent || '');

  const brandName = payload.brandName !== undefined ? payload.brandName.trim() : (existing.brandName || 'Study Network');
  const brandTagline = payload.brandTagline !== undefined ? payload.brandTagline.trim() : (existing.brandTagline || '');
  const brandLogo = payload.brandLogo !== undefined ? payload.brandLogo.trim() : (existing.brandLogo || '');
  const aboutMessageTitle = payload.aboutMessageTitle !== undefined ? payload.aboutMessageTitle.trim() : (existing.aboutMessageTitle || '');
  const aboutMessageSubtitle = payload.aboutMessageSubtitle !== undefined ? payload.aboutMessageSubtitle.trim() : (existing.aboutMessageSubtitle || '');
  const aboutMessageIcon = payload.aboutMessageIcon !== undefined ? payload.aboutMessageIcon.trim() : (existing.aboutMessageIcon || '');
  const developerName = payload.developerName !== undefined ? payload.developerName.trim() : (existing.developerName || '');
  const developerRole = payload.developerRole !== undefined ? payload.developerRole.trim() : (existing.developerRole || '');
  const developerDescription = payload.developerDescription !== undefined ? payload.developerDescription.trim() : (existing.developerDescription || '');
  const developerPhoto = payload.developerPhoto !== undefined ? payload.developerPhoto.trim() : (existing.developerPhoto || '');
  const developerTagline = payload.developerTagline !== undefined ? payload.developerTagline.trim() : (existing.developerTagline || '');
  
  let developerSocialLinksStr = JSON.stringify(existing.developerSocialLinks || []);
  if (payload.developerSocialLinks !== undefined) {
    const cleaned = cleanAndValidateSocialLinks(payload.developerSocialLinks);
    if (!cleaned.valid) {
      throw new Error(cleaned.error || 'Invalid developer social links');
    }
    developerSocialLinksStr = JSON.stringify(cleaned.links);
  }

  const aboutFooterTitle = payload.aboutFooterTitle !== undefined ? payload.aboutFooterTitle.trim() : (existing.aboutFooterTitle || '');
  const aboutFooterSubtitle = payload.aboutFooterSubtitle !== undefined ? payload.aboutFooterSubtitle.trim() : (existing.aboutFooterSubtitle || '');
  const aboutFooterTagline = payload.aboutFooterTagline !== undefined ? payload.aboutFooterTagline.trim() : (existing.aboutFooterTagline || '');

  const check = database.exec(`SELECT id FROM site_settings WHERE id = '${rowId}'`);
  if (check.length > 0 && check[0].values.length > 0) {
    const stmt = database.prepare(`
      UPDATE site_settings
      SET telegram_url = ?,
          whatsapp_url = ?,
          about_title = ?,
          about_description = ?,
          happy_title = ?,
          happy_message = ?,
          happy_icon = ?,
          message_title = ?,
          message_content = ?,
          brand_name = ?,
          brand_tagline = ?,
          brand_logo = ?,
          about_message_title = ?,
          about_message_subtitle = ?,
          about_message_icon = ?,
          developer_name = ?,
          developer_role = ?,
          developer_description = ?,
          developer_photo = ?,
          developer_tagline = ?,
          developer_social_links = ?,
          about_footer_title = ?,
          about_footer_subtitle = ?,
          about_footer_tagline = ?,
          updated_at = ?
      WHERE id = ?
    `);
    stmt.run([
      telegramUrl,
      whatsappUrl,
      aboutTitle || 'About Us',
      aboutDescription,
      happyTitle || 'Stay Happy',
      happyMessage,
      happyIcon || '💜',
      messageTitle || 'Important Message',
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
      developerSocialLinksStr,
      aboutFooterTitle,
      aboutFooterSubtitle,
      aboutFooterTagline,
      now,
      rowId,
    ]);
    stmt.free();
  } else {
    const stmt = database.prepare(`
      INSERT INTO site_settings (
        id, telegram_url, whatsapp_url, about_title, about_description, happy_title, happy_message, happy_icon, message_title, message_content,
        brand_name, brand_tagline, brand_logo, about_message_title, about_message_subtitle, about_message_icon,
        developer_name, developer_role, developer_description, developer_photo, developer_tagline, developer_social_links,
        about_footer_title, about_footer_subtitle, about_footer_tagline,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      rowId,
      telegramUrl,
      whatsappUrl,
      aboutTitle || 'About Us',
      aboutDescription,
      happyTitle || 'Stay Happy',
      happyMessage,
      happyIcon || '💜',
      messageTitle || 'Important Message',
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
      developerSocialLinksStr,
      aboutFooterTitle,
      aboutFooterSubtitle,
      aboutFooterTagline,
      now,
      now,
    ]);
    stmt.free();
  }

  saveDb();
  return getSiteSettings();
}

// ==========================================
// SOCIAL LINKS & TEAM MEMBERS
// ==========================================

export interface SocialLinkRecord {
  id: string;
  platform: string;
  url: string;
  customName?: string;
}

export interface TeamMemberRecord {
  id: string;
  name: string;
  role: string;
  description: string;
  photo: string;
  sortOrder: number;
  socialLinks: SocialLinkRecord[];
  createdAt: string;
  updatedAt: string;
}

export function cleanAndValidateSocialLinks(rawLinks: any): { valid: boolean; links: SocialLinkRecord[]; error?: string } {
  if (!rawLinks) return { valid: true, links: [] };
  let linksArray = rawLinks;
  if (typeof rawLinks === 'string') {
    try {
      linksArray = JSON.parse(rawLinks);
    } catch {
      return { valid: false, links: [], error: 'Invalid social links JSON format' };
    }
  }
  if (!Array.isArray(linksArray)) return { valid: true, links: [] };

  const validPlatforms = [
    'telegram', 'whatsapp', 'instagram', 'youtube', 'github', 
    'twitter', 'facebook', 'linkedin', 'website', 'custom'
  ];

  const cleaned: SocialLinkRecord[] = [];
  for (let i = 0; i < linksArray.length; i++) {
    const item = linksArray[i];
    if (!item || typeof item !== 'object') continue;
    const platform = String(item.platform || 'website').toLowerCase().trim();
    const url = String(item.url || '').trim();
    const customName = item.customName ? String(item.customName).trim() : undefined;

    // "If a social link is optional and left empty:
    // - Ignore it.
    // - Do not show an error.
    // - Do not create an empty social-link record."
    if (!url) {
      continue;
    }

    // Validate URL syntax
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { valid: false, links: [], error: `Invalid URL "${url}". Please enter a valid URL (e.g. https://instagram.com/example)` };
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { valid: false, links: [], error: `URL "${url}" must start with http:// or https://` };
    }

    cleaned.push({
      id: item.id && typeof item.id === 'string' ? item.id : `link-${crypto.randomUUID().slice(0, 8)}`,
      platform: validPlatforms.includes(platform) ? platform : 'custom',
      url: parsedUrl.toString(),
      customName,
    });
  }

  return { valid: true, links: cleaned };
}

export function getTeamMembers(): TeamMemberRecord[] {
  const database = getDb();
  const res = database.exec(`
    SELECT id, name, role, description, photo, sort_order, social_links, created_at, updated_at
    FROM team_members
    ORDER BY sort_order ASC, created_at ASC
  `);
  if (res.length === 0) return [];

  return res[0].values.map(row => {
    let socialLinks: SocialLinkRecord[] = [];
    try {
      if (row[6]) {
        socialLinks = JSON.parse(String(row[6]));
      }
    } catch (e) {
      socialLinks = [];
    }

    return {
      id: String(row[0]),
      name: String(row[1]),
      role: String(row[2]),
      description: String(row[3] || ''),
      photo: String(row[4] || ''),
      sortOrder: Number(row[5] || 0),
      socialLinks: Array.isArray(socialLinks) ? socialLinks : [],
      createdAt: String(row[7]),
      updatedAt: String(row[8]),
    };
  });
}

export function getTeamMemberById(id: string): TeamMemberRecord | null {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, name, role, description, photo, sort_order, social_links, created_at, updated_at
    FROM team_members
    WHERE id = ?
    LIMIT 1
  `);
  stmt.bind([id]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.get();
  stmt.free();

  let socialLinks: SocialLinkRecord[] = [];
  try {
    if (row[6]) {
      socialLinks = JSON.parse(String(row[6]));
    }
  } catch (e) {
    socialLinks = [];
  }

  return {
    id: String(row[0]),
    name: String(row[1]),
    role: String(row[2]),
    description: String(row[3] || ''),
    photo: String(row[4] || ''),
    sortOrder: Number(row[5] || 0),
    socialLinks: Array.isArray(socialLinks) ? socialLinks : [],
    createdAt: String(row[7]),
    updatedAt: String(row[8]),
  };
}

export function createTeamMember(payload: {
  name: string;
  role: string;
  description?: string;
  photo?: string;
  sortOrder?: number;
  socialLinks?: any[];
}): TeamMemberRecord {
  const database = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Determine sortOrder
  let sortOrder = payload.sortOrder;
  if (sortOrder === undefined) {
    const maxOrderRes = database.exec(`SELECT MAX(sort_order) FROM team_members`);
    if (maxOrderRes.length > 0 && maxOrderRes[0].values.length > 0 && maxOrderRes[0].values[0][0] !== null) {
      sortOrder = Number(maxOrderRes[0].values[0][0]) + 1;
    } else {
      sortOrder = 1;
    }
  }

  const cleaned = cleanAndValidateSocialLinks(payload.socialLinks);
  if (!cleaned.valid) {
    throw new Error(cleaned.error || 'Invalid social links');
  }

  const stmt = database.prepare(`
    INSERT INTO team_members (id, name, role, description, photo, sort_order, social_links, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run([
    id,
    payload.name.trim(),
    payload.role.trim(),
    payload.description ? payload.description.trim() : '',
    payload.photo ? payload.photo.trim() : '',
    sortOrder,
    JSON.stringify(cleaned.links),
    now,
    now,
  ]);
  stmt.free();
  saveDb();

  return {
    id,
    name: payload.name.trim(),
    role: payload.role.trim(),
    description: payload.description ? payload.description.trim() : '',
    photo: payload.photo ? payload.photo.trim() : '',
    sortOrder,
    socialLinks: cleaned.links,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateTeamMember(
  id: string,
  payload: {
    name?: string;
    role?: string;
    description?: string;
    photo?: string;
    sortOrder?: number;
    socialLinks?: any[];
  }
): TeamMemberRecord | null {
  const database = getDb();
  const existing = getTeamMemberById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const name = payload.name !== undefined ? payload.name.trim() : existing.name;
  const role = payload.role !== undefined ? payload.role.trim() : existing.role;
  const description = payload.description !== undefined ? payload.description.trim() : existing.description;
  const photo = payload.photo !== undefined ? payload.photo.trim() : existing.photo;
  const sortOrder = payload.sortOrder !== undefined ? payload.sortOrder : existing.sortOrder;

  let socialLinks = existing.socialLinks;
  if (payload.socialLinks !== undefined) {
    const cleaned = cleanAndValidateSocialLinks(payload.socialLinks);
    if (!cleaned.valid) {
      throw new Error(cleaned.error || 'Invalid social links');
    }
    socialLinks = cleaned.links;
  }

  const stmt = database.prepare(`
    UPDATE team_members
    SET name = ?, role = ?, description = ?, photo = ?, sort_order = ?, social_links = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run([
    name,
    role,
    description,
    photo,
    sortOrder,
    JSON.stringify(socialLinks),
    now,
    id,
  ]);
  stmt.free();
  saveDb();

  return {
    id,
    name,
    role,
    description,
    photo,
    sortOrder,
    socialLinks,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
}

export function deleteTeamMember(id: string): boolean {
  const database = getDb();
  const existing = getTeamMemberById(id);
  if (!existing) return false;

  // Safely clean up associated uploaded photo file if stored locally
  if (existing.photo && existing.photo.startsWith('/uploads/')) {
    try {
      const localPath = path.join(process.cwd(), existing.photo);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    } catch (e) {
      console.warn('[Database] Could not remove team member photo file:', e);
    }
  }

  const stmt = database.prepare(`DELETE FROM team_members WHERE id = ?`);
  stmt.run([id]);
  stmt.free();
  saveDb();
  return true;
}

export function reorderTeamMembers(ids: string[]): boolean {
  const database = getDb();
  const now = new Date().toISOString();
  database.run('BEGIN TRANSACTION;');
  try {
    const stmt = database.prepare(`UPDATE team_members SET sort_order = ?, updated_at = ? WHERE id = ?`);
    ids.forEach((id, idx) => {
      stmt.run([idx + 1, now, id]);
    });
    stmt.free();
    database.run('COMMIT;');
    saveDb();
    return true;
  } catch (err) {
    database.run('ROLLBACK;');
    throw err;
  }
}

// ==========================================
// MESSAGE / NOTICE REPOSITORY FUNCTIONS
// ==========================================

export interface NoticeMessageRecord {
  id: string;
  title: string;
  content: string;
  isPublished: boolean;
  sortOrder: number;
  linkUrl: string;
  linkLabel: string;
  createdAt: string;
  updatedAt: string;
}

export function getMessages(): NoticeMessageRecord[] {
  const database = getDb();
  const res = database.exec(`
    SELECT id, title, content, is_published, sort_order, link_url, link_label, created_at, updated_at
    FROM messages
    ORDER BY sort_order ASC, created_at DESC
  `);
  if (res.length === 0) return [];
  return res[0].values.map(row => ({
    id: String(row[0]),
    title: String(row[1]),
    content: String(row[2]),
    isPublished: Number(row[3]) === 1,
    sortOrder: Number(row[4] || 0),
    linkUrl: String(row[5] || ''),
    linkLabel: String(row[6] || ''),
    createdAt: String(row[7]),
    updatedAt: String(row[8]),
  }));
}

export function getPublishedMessages(): NoticeMessageRecord[] {
  const database = getDb();
  const res = database.exec(`
    SELECT id, title, content, is_published, sort_order, link_url, link_label, created_at, updated_at
    FROM messages
    WHERE is_published = 1
    ORDER BY sort_order ASC, created_at DESC
  `);
  if (res.length === 0) return [];
  return res[0].values.map(row => ({
    id: String(row[0]),
    title: String(row[1]),
    content: String(row[2]),
    isPublished: true,
    sortOrder: Number(row[4] || 0),
    linkUrl: String(row[5] || ''),
    linkLabel: String(row[6] || ''),
    createdAt: String(row[7]),
    updatedAt: String(row[8]),
  }));
}

export function getMessageById(id: string): NoticeMessageRecord | null {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, title, content, is_published, sort_order, link_url, link_label, created_at, updated_at
    FROM messages
    WHERE id = ? LIMIT 1
  `);
  stmt.bind([id]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.get();
  stmt.free();
  return {
    id: String(row[0]),
    title: String(row[1]),
    content: String(row[2]),
    isPublished: Number(row[3]) === 1,
    sortOrder: Number(row[4] || 0),
    linkUrl: String(row[5] || ''),
    linkLabel: String(row[6] || ''),
    createdAt: String(row[7]),
    updatedAt: String(row[8]),
  };
}

export function createMessage(payload: {
  title: string;
  content: string;
  isPublished?: boolean;
  linkUrl?: string;
  linkLabel?: string;
}): NoticeMessageRecord {
  const database = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const isPublished = payload.isPublished !== false ? 1 : 0;
  const linkUrl = (payload.linkUrl || '').trim();
  const linkLabel = (payload.linkLabel || '').trim();

  const sortRes = database.exec(`SELECT MAX(sort_order) FROM messages`);
  const maxSort = (sortRes.length > 0 && sortRes[0].values[0][0] !== null) ? Number(sortRes[0].values[0][0]) : 0;
  const sortOrder = maxSort + 1;

  const stmt = database.prepare(`
    INSERT INTO messages (id, title, content, is_published, sort_order, link_url, link_label, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run([id, payload.title.trim(), payload.content, isPublished, sortOrder, linkUrl, linkLabel, now, now]);
  stmt.free();
  saveDb();

  return {
    id,
    title: payload.title.trim(),
    content: payload.content,
    isPublished: isPublished === 1,
    sortOrder,
    linkUrl,
    linkLabel,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateMessage(id: string, payload: {
  title?: string;
  content?: string;
  isPublished?: boolean;
  linkUrl?: string;
  linkLabel?: string;
  sortOrder?: number;
}): NoticeMessageRecord | null {
  const database = getDb();
  const existing = getMessageById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const title = payload.title !== undefined ? payload.title.trim() : existing.title;
  const content = payload.content !== undefined ? payload.content : existing.content;
  const isPublished = payload.isPublished !== undefined ? (payload.isPublished ? 1 : 0) : (existing.isPublished ? 1 : 0);
  const linkUrl = payload.linkUrl !== undefined ? payload.linkUrl.trim() : existing.linkUrl;
  const linkLabel = payload.linkLabel !== undefined ? payload.linkLabel.trim() : existing.linkLabel;
  const sortOrder = payload.sortOrder !== undefined ? payload.sortOrder : existing.sortOrder;

  const stmt = database.prepare(`
    UPDATE messages
    SET title = ?, content = ?, is_published = ?, sort_order = ?, link_url = ?, link_label = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run([title, content, isPublished, sortOrder, linkUrl, linkLabel, now, id]);
  stmt.free();
  saveDb();

  return {
    id,
    title,
    content,
    isPublished: isPublished === 1,
    sortOrder,
    linkUrl,
    linkLabel,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
}

export function deleteMessage(id: string): boolean {
  const database = getDb();
  const existing = getMessageById(id);
  if (!existing) return false;

  const stmt = database.prepare(`DELETE FROM messages WHERE id = ?`);
  stmt.run([id]);
  stmt.free();
  saveDb();
  return true;
}

export function publishMessage(id: string, isPublished: boolean): NoticeMessageRecord | null {
  return updateMessage(id, { isPublished });
}

export function reorderMessages(ids: string[]): boolean {
  const database = getDb();
  const now = new Date().toISOString();
  database.run('BEGIN TRANSACTION;');
  try {
    const stmt = database.prepare(`UPDATE messages SET sort_order = ?, updated_at = ? WHERE id = ?`);
    ids.forEach((id, idx) => {
      stmt.run([idx + 1, now, id]);
    });
    stmt.free();
    database.run('COMMIT;');
    saveDb();
    return true;
  } catch (err) {
    database.run('ROLLBACK;');
    throw err;
  }
}

// ==========================================
// ACHIEVEMENTS & ACHIEVEMENT MESSAGE CRUD
// ==========================================

export interface AchievementRecord {
  id: string;
  imageUrl: string;
  comment: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AchievementMessageRecord {
  title: string;
  content: string;
  updatedAt: string;
}

export function getAchievementMessage(): AchievementMessageRecord {
  const database = getDb();
  const res = database.exec(`SELECT title, content, updated_at FROM achievement_message WHERE id = 'default' LIMIT 1`);
  if (res.length === 0 || res[0].values.length === 0) {
    return {
      title: 'Important Message',
      content: '',
      updatedAt: new Date().toISOString(),
    };
  }
  const row = res[0].values[0];
  return {
    title: String(row[0] || 'Important Message'),
    content: String(row[1] || ''),
    updatedAt: String(row[2] || ''),
  };
}

export function updateAchievementMessage(title?: string, content?: string): AchievementMessageRecord {
  const database = getDb();
  const existing = getAchievementMessage();
  const newTitle = title !== undefined ? String(title).trim() : existing.title;
  const newContent = content !== undefined ? String(content).trim() : existing.content;
  const now = new Date().toISOString();

  const stmt = database.prepare(`
    INSERT INTO achievement_message (id, title, content, updated_at)
    VALUES ('default', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET title = excluded.title, content = excluded.content, updated_at = excluded.updated_at
  `);
  stmt.run([newTitle, newContent, now]);
  stmt.free();
  saveDb();

  return {
    title: newTitle,
    content: newContent,
    updatedAt: now,
  };
}

export function getPublicAchievements(): AchievementRecord[] {
  const database = getDb();
  const res = database.exec(`SELECT id, image_url, comment, is_pinned, created_at, updated_at FROM achievements ORDER BY is_pinned DESC, created_at DESC`);
  if (res.length === 0) return [];
  return res[0].values.map(row => ({
    id: String(row[0]),
    imageUrl: String(row[1]),
    comment: String(row[2]),
    isPinned: Number(row[3]) === 1,
    createdAt: String(row[4]),
    updatedAt: String(row[5]),
  }));
}

export function getAdminAchievements(): AchievementRecord[] {
  return getPublicAchievements();
}

export function getAchievementById(id: string): AchievementRecord | null {
  const database = getDb();
  const stmt = database.prepare(`SELECT id, image_url, comment, is_pinned, created_at, updated_at FROM achievements WHERE id = ? LIMIT 1`);
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.get();
    stmt.free();
    return {
      id: String(row[0]),
      imageUrl: String(row[1]),
      comment: String(row[2]),
      isPinned: Number(row[3]) === 1,
      createdAt: String(row[4]),
      updatedAt: String(row[5]),
    };
  }
  stmt.free();
  return null;
}

export function createAchievement(imageUrl: string, comment: string, isPinned: boolean = false): AchievementRecord {
  const database = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = database.prepare(`
    INSERT INTO achievements (id, image_url, comment, is_pinned, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run([id, imageUrl, comment, isPinned ? 1 : 0, now, now]);
  stmt.free();
  saveDb();

  return {
    id,
    imageUrl,
    comment,
    isPinned: Boolean(isPinned),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateAchievement(id: string, imageUrl: string, comment: string, isPinned?: boolean): AchievementRecord | null {
  const database = getDb();
  const existing = getAchievementById(id);
  if (!existing) return null;

  const finalPinned = isPinned !== undefined ? (isPinned ? 1 : 0) : (existing.isPinned ? 1 : 0);
  const now = new Date().toISOString();
  const stmt = database.prepare(`
    UPDATE achievements
    SET image_url = ?, comment = ?, is_pinned = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run([imageUrl, comment, finalPinned, now, id]);
  stmt.free();
  saveDb();

  return {
    id,
    imageUrl,
    comment,
    isPinned: finalPinned === 1,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
}

export function toggleAchievementPin(id: string, isPinned?: boolean): AchievementRecord | null {
  const database = getDb();
  const existing = getAchievementById(id);
  if (!existing) return null;

  const newPinned = isPinned !== undefined ? Boolean(isPinned) : !existing.isPinned;
  const now = new Date().toISOString();
  const stmt = database.prepare(`
    UPDATE achievements
    SET is_pinned = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run([newPinned ? 1 : 0, now, id]);
  stmt.free();
  saveDb();

  return {
    ...existing,
    isPinned: newPinned,
    updatedAt: now,
  };
}

export function deleteAchievement(id: string): boolean {
  const database = getDb();
  const stmt = database.prepare(`DELETE FROM achievements WHERE id = ?`);
  stmt.run([id]);
  stmt.free();
  saveDb();
  return true;
}

// ==========================================
// TWO-LEVEL ADMIN SYSTEM (OTHER ADMINS & PERMISSIONS)
// ==========================================

export interface OtherAdminRecord {
  id: string;
  username: string;
  role: 'OTHER_ADMIN';
  isActive: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export function getAdminPermissions(adminId: string): string[] {
  const database = getDb();
  const stmt = database.prepare(`SELECT permission FROM admin_permissions WHERE admin_id = ? ORDER BY permission ASC`);
  stmt.bind([adminId]);
  const perms: string[] = [];
  while (stmt.step()) {
    const row = stmt.get();
    perms.push(String(row[0]));
  }
  stmt.free();
  return perms;
}

export function getAllOtherAdmins(): OtherAdminRecord[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, username, role, is_active, created_at, updated_at 
    FROM other_admins 
    ORDER BY created_at DESC
  `);
  const admins: OtherAdminRecord[] = [];
  while (stmt.step()) {
    const row = stmt.get();
    const id = String(row[0]);
    admins.push({
      id,
      username: String(row[1]),
      role: 'OTHER_ADMIN',
      isActive: Number(row[3]) === 1,
      permissions: getAdminPermissions(id),
      createdAt: String(row[4]),
      updatedAt: String(row[5]),
    });
  }
  stmt.free();
  return admins;
}

export function getOtherAdminById(id: string): OtherAdminRecord | null {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, username, role, is_active, created_at, updated_at 
    FROM other_admins 
    WHERE id = ? LIMIT 1
  `);
  stmt.bind([id]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.get();
  stmt.free();
  const idVal = String(row[0]);
  return {
    id: idVal,
    username: String(row[1]),
    role: 'OTHER_ADMIN',
    isActive: Number(row[3]) === 1,
    permissions: getAdminPermissions(idVal),
    createdAt: String(row[4]),
    updatedAt: String(row[5]),
  };
}

export function getOtherAdminByUsername(username: string): (OtherAdminRecord & { passwordHash: string }) | null {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, username, password_hash, role, is_active, created_at, updated_at 
    FROM other_admins 
    WHERE LOWER(username) = ? LIMIT 1
  `);
  stmt.bind([username.toLowerCase().trim()]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.get();
  stmt.free();
  const id = String(row[0]);
  return {
    id,
    username: String(row[1]),
    passwordHash: String(row[2]),
    role: 'OTHER_ADMIN',
    isActive: Number(row[4]) === 1,
    permissions: getAdminPermissions(id),
    createdAt: String(row[5]),
    updatedAt: String(row[6]),
  };
}

export function createOtherAdmin(
  username: string,
  password: string,
  permissions: string[] = [],
  isActive: boolean = true
): OtherAdminRecord {
  const database = getDb();
  const cleanUsername = username.trim();
  if (cleanUsername.length < 3) {
    throw new Error('Admin ID / Username must be at least 3 characters long');
  }

  const existing = getOtherAdminByUsername(cleanUsername);
  if (existing) {
    throw new Error(`An administrator with ID/username "${cleanUsername}" already exists`);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  database.run('BEGIN TRANSACTION;');
  try {
    const stmt = database.prepare(`
      INSERT INTO other_admins (id, username, password_hash, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 'OTHER_ADMIN', ?, ?, ?)
    `);
    stmt.run([id, cleanUsername, hash, isActive ? 1 : 0, now, now]);
    stmt.free();

    if (permissions.length > 0) {
      const pStmt = database.prepare(`
        INSERT INTO admin_permissions (id, admin_id, permission, created_at)
        VALUES (?, ?, ?, ?)
      `);
      for (const p of permissions) {
        if (typeof p === 'string' && p.trim()) {
          pStmt.run([crypto.randomUUID(), id, p.trim(), now]);
        }
      }
      pStmt.free();
    }

    database.run('COMMIT;');
    saveDb();
    const created = getOtherAdminById(id);
    if (!created) throw new Error('Failed to retrieve created administrator');
    return created;
  } catch (err) {
    database.run('ROLLBACK;');
    throw err;
  }
}

export function updateOtherAdmin(
  id: string,
  updates: {
    username?: string;
    password?: string;
    permissions?: string[];
    isActive?: boolean;
  }
): OtherAdminRecord {
  const database = getDb();
  const existing = getOtherAdminById(id);
  if (!existing) {
    throw new Error('Other Admin not found');
  }

  const now = new Date().toISOString();
  let newUsername = existing.username;

  if (updates.username !== undefined) {
    const cleanUser = updates.username.trim();
    if (cleanUser.length < 3) {
      throw new Error('Admin ID / Username must be at least 3 characters long');
    }
    if (cleanUser.toLowerCase() !== existing.username.toLowerCase()) {
      const dupe = getOtherAdminByUsername(cleanUser);
      if (dupe && dupe.id !== id) {
        throw new Error(`Username "${cleanUser}" is already taken by another administrator`);
      }
    }
    newUsername = cleanUser;
  }

  const newIsActive = updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : (existing.isActive ? 1 : 0);

  database.run('BEGIN TRANSACTION;');
  try {
    if (updates.password && updates.password.trim()) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(updates.password.trim(), salt);
      const stmt = database.prepare(`
        UPDATE other_admins
        SET username = ?, password_hash = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `);
      stmt.run([newUsername, hash, newIsActive, now, id]);
      stmt.free();
    } else {
      const stmt = database.prepare(`
        UPDATE other_admins
        SET username = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `);
      stmt.run([newUsername, newIsActive, now, id]);
      stmt.free();
    }

    if (Array.isArray(updates.permissions)) {
      const delStmt = database.prepare(`DELETE FROM admin_permissions WHERE admin_id = ?`);
      delStmt.run([id]);
      delStmt.free();

      if (updates.permissions.length > 0) {
        const pStmt = database.prepare(`
          INSERT INTO admin_permissions (id, admin_id, permission, created_at)
          VALUES (?, ?, ?, ?)
        `);
        for (const p of updates.permissions) {
          if (typeof p === 'string' && p.trim()) {
            pStmt.run([crypto.randomUUID(), id, p.trim(), now]);
          }
        }
        pStmt.free();
      }
    }

    database.run('COMMIT;');
    saveDb();
    const updated = getOtherAdminById(id);
    if (!updated) throw new Error('Failed to retrieve updated administrator');
    return updated;
  } catch (err) {
    database.run('ROLLBACK;');
    throw err;
  }
}

export function toggleOtherAdminStatus(id: string, isActive?: boolean): OtherAdminRecord {
  const existing = getOtherAdminById(id);
  if (!existing) {
    throw new Error('Other Admin not found');
  }
  const nextActive = isActive !== undefined ? isActive : !existing.isActive;
  return updateOtherAdmin(id, { isActive: nextActive });
}

export function deleteOtherAdmin(id: string): boolean {
  const database = getDb();
  const existing = getOtherAdminById(id);
  if (!existing) {
    return false;
  }
  database.run('BEGIN TRANSACTION;');
  try {
    const pStmt = database.prepare(`DELETE FROM admin_permissions WHERE admin_id = ?`);
    pStmt.run([id]);
    pStmt.free();

    const stmt = database.prepare(`DELETE FROM other_admins WHERE id = ?`);
    stmt.run([id]);
    stmt.free();

    database.run('COMMIT;');
    saveDb();
    return true;
  } catch (err) {
    database.run('ROLLBACK;');
    throw err;
  }
}

