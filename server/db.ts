import fs from 'fs';
import path from 'path';
import initSqlJs, { type Database } from 'sql.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = process.env.DATABASE_FILE 
  ? path.resolve(process.cwd(), process.env.DATABASE_FILE)
  : path.join(DATA_DIR, 'app_links.sqlite');

let db: Database | null = null;

function ensureDirectoryExists(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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

  const SQL = await initSqlJs();
  ensureDirectoryExists(DB_FILE);

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Could not read existing database file, creating a fresh one:', e);
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_servers_webapp ON servers(web_app_id);
    CREATE INDEX IF NOT EXISTS idx_servers_sort ON servers(sort_order);
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
  } catch (migErr) {
    console.warn('[Database] Servers table migration notice:', migErr);
  }

  // Seed default admin accounts
  const seedUsers = [
    { email: 'admin@example.com', pass: 'Admin@123456' },
    { email: process.env.ADMIN_EMAIL || 'admin10@gmail.com', pass: process.env.ADMIN_PASSWORD || 'admin' },
  ];

  for (const u of seedUsers) {
    const checkStmt = db.prepare(`SELECT id, password_hash FROM users WHERE email = ? LIMIT 1`);
    checkStmt.bind([u.email.toLowerCase().trim()]);
    const hasRow = checkStmt.step();
    if (!hasRow) {
      checkStmt.free();
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(u.pass, salt);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const stmt = db.prepare(`
        INSERT INTO users (id, email, password_hash, role, created_at)
        VALUES (?, ?, ?, 'admin', ?)
      `);
      stmt.run([id, u.email.toLowerCase().trim(), hash, now]);
      stmt.free();
      console.log(`[Database] Initialized admin account: ${u.email}`);
    } else {
      const row = checkStmt.get();
      checkStmt.free();
      const currentHash = String(row[1]);
      if (!bcrypt.compareSync(u.pass, currentHash)) {
        const salt = bcrypt.genSaltSync(10);
        const newHash = bcrypt.hashSync(u.pass, salt);
        const updateStmt = db.prepare(`UPDATE users SET password_hash = ? WHERE email = ?`);
        updateStmt.run([newHash, u.email.toLowerCase().trim()]);
        updateStmt.free();
      }
    }
  }

  // Seed sample web apps if empty
  const appCheck = db.exec(`SELECT id FROM web_apps LIMIT 1`);
  if (appCheck.length === 0 || appCheck[0].values.length === 0) {
    console.log('[Database] Seeding initial sample Web Apps and servers...');
    const now = new Date().toISOString();

    // 1. Study App
    const studyId = crypto.randomUUID();
    let stmt = db.prepare(`INSERT INTO web_apps (id, name, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`);
    stmt.run([studyId, 'Study App', 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=256&q=80', now, now]);
    stmt.free();

    const studyServers = [
      { url: 'https://khanacademy.org', category: 'Working' },
      { url: 'https://coursera.org/broken-link', category: 'Error' },
      { url: 'https://edx.org', category: 'Unfilter' },
      { url: 'https://quizlet.com', category: 'Working' },
    ];
    studyServers.forEach((s, idx) => {
      const sStmt = db!.prepare(`INSERT INTO servers (id, web_app_id, url, category, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      sStmt.run([crypto.randomUUID(), studyId, s.url, s.category, idx + 1, now, now]);
      sStmt.free();
    });

    // 2. Movie App
    const movieId = crypto.randomUUID();
    stmt = db.prepare(`INSERT INTO web_apps (id, name, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`);
    stmt.run([movieId, 'Movie App', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=256&q=80', now, now]);
    stmt.free();

    const movieServers = [
      { url: 'https://imdb.com', category: 'Working' },
      { url: 'https://themoviedb.org', category: 'Working' },
      { url: 'https://stream-archive.invalid/test', category: 'Error' },
    ];
    movieServers.forEach((s, idx) => {
      const sStmt = db!.prepare(`INSERT INTO servers (id, web_app_id, url, category, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      sStmt.run([crypto.randomUUID(), movieId, s.url, s.category, idx + 1, now, now]);
      sStmt.free();
    });

    // 3. Tools App
    const toolsId = crypto.randomUUID();
    stmt = db.prepare(`INSERT INTO web_apps (id, name, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`);
    stmt.run([toolsId, 'Tools App', 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=256&q=80', now, now]);
    stmt.free();

    const toolsServers = [
      { url: 'https://github.com', category: 'Working' },
      { url: 'https://developer.mozilla.org', category: 'Unfilter' },
      { url: 'https://stackoverflow.com', category: 'Working' },
    ];
    toolsServers.forEach((s, idx) => {
      const sStmt = db!.prepare(`INSERT INTO servers (id, web_app_id, url, category, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      sStmt.run([crypto.randomUUID(), toolsId, s.url, s.category, idx + 1, now, now]);
      sStmt.free();
    });
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
    SELECT id, web_app_id, category, sort_order 
    FROM servers 
    ORDER BY sort_order ASC, created_at ASC
  `);

  const serversByApp: Record<string, Array<{ id: string; category: string; order: number }>> = {};
  if (serversRes.length > 0) {
    serversRes[0].values.forEach(row => {
      const serverId = String(row[0]);
      const appId = String(row[1]);
      const category = String(row[2]);
      const order = Number(row[3]);
      if (!serversByApp[appId]) serversByApp[appId] = [];
      serversByApp[appId].push({ id: serverId, category, order });
    });
  }

  return apps.map(app => {
    const appServers = serversByApp[app.id] || [];
    // Dynamic naming: Server 1, Server 2, Server 3... based on current list order
    const formattedServers = appServers.map((s, index) => ({
      id: s.id,
      name: `Server ${index + 1}`,
      category: s.category,
    }));
    return {
      id: app.id,
      name: app.name,
      icon: app.icon,
      servers: formattedServers,
    };
  });
}

// Launch server URL lookup (used when user clicks server in modal)
export function getServerLaunchUrl(webAppId: string, serverId: string): string | null {
  const database = getDb();
  const stmt = database.prepare(`SELECT url FROM servers WHERE id = ? AND web_app_id = ? LIMIT 1`);
  stmt.bind([serverId, webAppId]);
  if (stmt.step()) {
    const row = stmt.get();
    stmt.free();
    return String(row[0]);
  }
  stmt.free();
  return null;
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
    SELECT id, web_app_id, url, category, sort_order, created_at, updated_at 
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
        createdAt: String(row[5]),
        updatedAt: String(row[6]),
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
    SELECT id, web_app_id, url, category, sort_order, created_at, updated_at 
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
      createdAt: String(sRow[5]),
      updatedAt: String(sRow[6]),
    });
  }
  sStmt.free();

  return app;
}

// Admin Create Web App with servers
export function createWebApp(name: string, icon: string, servers: Array<{ url: string; category: string }>) {
  const database = getDb();
  const appId = crypto.randomUUID();
  const now = new Date().toISOString();

  database.run('BEGIN TRANSACTION;');
  try {
    const appStmt = database.prepare(`INSERT INTO web_apps (id, name, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`);
    appStmt.run([appId, name, icon, now, now]);
    appStmt.free();

    servers.forEach((s, idx) => {
      const sStmt = database.prepare(`INSERT INTO servers (id, web_app_id, url, category, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      sStmt.run([crypto.randomUUID(), appId, s.url, s.category, idx + 1, now, now]);
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
export function updateWebApp(id: string, name: string, icon: string, servers: Array<{ id?: string; url: string; category: string }>) {
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
      const sStmt = database.prepare(`INSERT INTO servers (id, web_app_id, url, category, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      sStmt.run([serverId, id, s.url, s.category, idx + 1, now, now]);
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
