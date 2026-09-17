// server/app.ts
import dotenv2 from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt2 from "bcryptjs";

// server/db.ts
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import initSqlJsAsm from "sql.js/dist/sql-asm.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
dotenv.config({ override: true });
var __filename = typeof import.meta?.url === "string" ? fileURLToPath(import.meta.url) : "";
var __dirname = __filename ? path.dirname(__filename) : process.cwd();
var isVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
var REPO_DATA_DIR = path.resolve(process.cwd(), "data");
var REPO_DB_FILE = path.join(REPO_DATA_DIR, "app_links.sqlite");
var DATA_DIR = isVercel ? "/tmp" : REPO_DATA_DIR;
var DB_FILE = process.env.DATABASE_FILE ? path.isAbsolute(process.env.DATABASE_FILE) ? process.env.DATABASE_FILE : path.resolve(process.cwd(), process.env.DATABASE_FILE) : isVercel ? path.join("/tmp", "app_links.sqlite") : path.join(DATA_DIR, "app_links.sqlite");
var db = null;
function ensureDirectoryExists(filePath) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn("Could not ensure directory exists:", err);
  }
}
function findSourceDbFile() {
  const candidatePaths = [
    path.resolve(process.cwd(), "data", "app_links.sqlite"),
    path.resolve(process.cwd(), "app_links.sqlite"),
    path.resolve(__dirname, "..", "data", "app_links.sqlite"),
    path.resolve(__dirname, "data", "app_links.sqlite")
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
    console.error("Failed to save database to disk:", err);
  }
}
async function initDatabase() {
  if (db) return db;
  const initFn = initSqlJsAsm.default || initSqlJsAsm;
  const SQL = await initFn();
  ensureDirectoryExists(DB_FILE);
  const sourceDb = findSourceDbFile();
  if (isVercel && !fs.existsSync(DB_FILE) && sourceDb) {
    try {
      fs.copyFileSync(sourceDb, DB_FILE);
    } catch (err) {
      console.warn("Could not copy repository database to /tmp:", err);
    }
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn("Could not read existing database file, creating a fresh one:", e);
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
  db.run("PRAGMA foreign_keys = ON;");
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
      happy_message TEXT NOT NULL DEFAULT 'Good things take time \u{1F49C}',
      happy_icon TEXT NOT NULL DEFAULT '\u{1F49C}',
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
  try {
    const tableInfo = db.exec(`SELECT sql FROM sqlite_master WHERE type='table' AND name='servers'`);
    if (tableInfo.length > 0 && tableInfo[0].values.length > 0) {
      const createSql = String(tableInfo[0].values[0][0]);
      if (!createSql.includes("Some Error")) {
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
        console.log("[Database] Migrated servers table to include Some Error category");
      }
    }
    try {
      const serverCols = db.exec(`PRAGMA table_info(servers)`);
      if (serverCols.length > 0 && serverCols[0].values.length > 0) {
        const colNames = serverCols[0].values.map((col) => String(col[1]));
        if (!colNames.includes("is_active")) {
          db.run(`ALTER TABLE servers ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`);
          saveDb();
          console.log("[Database] Added is_active column to servers table");
        }
      }
    } catch (colErr) {
      console.warn("[Database] servers is_active column migration notice:", colErr);
    }
  } catch (migErr) {
    console.warn("[Database] Servers table migration notice:", migErr);
  }
  try {
    const settingsCols = db.exec(`PRAGMA table_info(site_settings)`);
    if (settingsCols.length > 0 && settingsCols[0].values.length > 0) {
      const colNames = settingsCols[0].values.map((col) => String(col[1]));
      if (!colNames.includes("message_title")) {
        db.run(`ALTER TABLE site_settings ADD COLUMN message_title TEXT NOT NULL DEFAULT 'Important Message'`);
        console.log("[Database] Added message_title column to site_settings");
      }
      if (!colNames.includes("message_content")) {
        db.run(`ALTER TABLE site_settings ADD COLUMN message_content TEXT NOT NULL DEFAULT ''`);
        console.log("[Database] Added message_content column to site_settings");
      }
      const brandCols = [
        { name: "brand_name", type: "TEXT", defaultVal: "'Study Network'" },
        { name: "brand_tagline", type: "TEXT", defaultVal: "''" },
        { name: "brand_logo", type: "TEXT", defaultVal: "''" },
        { name: "about_message_title", type: "TEXT", defaultVal: "''" },
        { name: "about_message_subtitle", type: "TEXT", defaultVal: "''" },
        { name: "about_message_icon", type: "TEXT", defaultVal: "''" },
        { name: "developer_name", type: "TEXT", defaultVal: "''" },
        { name: "developer_role", type: "TEXT", defaultVal: "''" },
        { name: "developer_description", type: "TEXT", defaultVal: "''" },
        { name: "developer_photo", type: "TEXT", defaultVal: "''" },
        { name: "developer_tagline", type: "TEXT", defaultVal: "''" },
        { name: "developer_social_links", type: "TEXT", defaultVal: "'[]'" },
        { name: "about_footer_title", type: "TEXT", defaultVal: "''" },
        { name: "about_footer_subtitle", type: "TEXT", defaultVal: "''" },
        { name: "about_footer_tagline", type: "TEXT", defaultVal: "''" }
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
    console.warn("[Database] site_settings migration notice:", migErr);
  }
  try {
    const achCols = db.exec(`PRAGMA table_info(achievements)`);
    if (achCols.length > 0 && achCols[0].values.length > 0) {
      const colNames = achCols[0].values.map((col) => String(col[1]));
      if (!colNames.includes("is_pinned")) {
        db.run(`ALTER TABLE achievements ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0`);
        saveDb();
        console.log("[Database] Added is_pinned column to achievements table");
      }
    }
    db.run(`CREATE INDEX IF NOT EXISTS idx_achievements_pinned ON achievements(is_pinned DESC, created_at DESC)`);
  } catch (migErr) {
    console.warn("[Database] achievements migration notice:", migErr);
  }
  const settingsCheck = db.exec(`SELECT id FROM site_settings LIMIT 1`);
  if (settingsCheck.length === 0 || settingsCheck[0].values.length === 0) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const sId = "default_settings";
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
        'Stay Happy', '', '\u{1F49C}', 'Important Message', '',
        'Study Network', '', '',
        '', '', '',
        '', '', '', '', '', '[]',
        '', '', '',
        ?, ?
      )
    `);
    stmt.run([sId, now, now]);
    stmt.free();
    console.log("[Database] Initialized baseline clean site settings");
  }
  const userCheck = db.exec(`SELECT id FROM users LIMIT 1`);
  if (userCheck.length === 0 || userCheck[0].values.length === 0) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const defaultAdminId = crypto.randomUUID();
    const defaultHash = bcrypt.hashSync("admin", 10);
    const userStmt = db.prepare(`INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)`);
    userStmt.run([defaultAdminId, "admin", defaultHash, "admin", now]);
    userStmt.free();
    console.log("[Database] Seeded baseline fallback admin into users table");
  }
  const appsCheck = db.exec(`SELECT id FROM web_apps LIMIT 1`);
  if (appsCheck.length === 0 || appsCheck[0].values.length === 0) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const app1Id = "8c87887e-cf9b-4092-84cf-d5a38585a28d";
    const app2Id = "2301455b-1092-473d-92a1-be904df6da8d";
    const app3Id = "a8475b2e-3f85-4e0c-85ca-73e047f23cbb";
    const appStmt = db.prepare(`INSERT INTO web_apps (id, name, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`);
    appStmt.run([app1Id, "Study App", "https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=256&q=80", now, now]);
    appStmt.run([app2Id, "Movie App", "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=256&q=80", now, now]);
    appStmt.run([app3Id, "Tools App", "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=256&q=80", now, now]);
    appStmt.free();
    const serverStmt = db.prepare(`INSERT INTO servers (id, web_app_id, url, category, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    serverStmt.run([crypto.randomUUID(), app1Id, "https://example.com/study1", "Working", 1, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app1Id, "https://example.com/study2", "Error", 2, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app1Id, "https://example.com/study3", "Unfilter", 3, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app1Id, "https://example.com/study4", "Working", 4, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app2Id, "https://example.com/movie1", "Working", 1, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app2Id, "https://example.com/movie2", "Working", 2, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app2Id, "https://example.com/movie3", "Error", 3, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app3Id, "https://example.com/tools1", "Working", 1, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app3Id, "https://example.com/tools2", "Unfilter", 2, 1, now, now]);
    serverStmt.run([crypto.randomUUID(), app3Id, "https://example.com/tools3", "Working", 3, 1, now, now]);
    serverStmt.free();
    console.log("[Database] Seeded baseline web apps and servers");
  }
  saveDb();
  return db;
}
function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}
function getPublicWebApps() {
  const database = getDb();
  const appsRes = database.exec(`SELECT id, name, icon FROM web_apps ORDER BY created_at DESC`);
  if (appsRes.length === 0) return [];
  const apps = appsRes[0].values.map((row) => ({
    id: String(row[0]),
    name: String(row[1]),
    icon: String(row[2])
  }));
  const serversRes = database.exec(`
    SELECT id, web_app_id, category, sort_order, is_active 
    FROM servers 
    ORDER BY sort_order ASC, created_at ASC
  `);
  const serversByApp = {};
  if (serversRes.length > 0) {
    serversRes[0].values.forEach((row) => {
      const serverId = String(row[0]);
      const appId = String(row[1]);
      const category = String(row[2]);
      const order = Number(row[3]);
      const isActive = row[4] !== void 0 && row[4] !== null ? Number(row[4]) !== 0 : true;
      if (!serversByApp[appId]) serversByApp[appId] = [];
      serversByApp[appId].push({ id: serverId, category, order, isActive });
    });
  }
  return apps.map((app2) => {
    const appServers = serversByApp[app2.id] || [];
    const formattedServers = appServers.map((s, index) => ({
      id: s.id,
      name: `Server ${index + 1}`,
      category: s.category,
      isActive: s.isActive
    }));
    return {
      id: app2.id,
      name: app2.name,
      icon: app2.icon,
      servers: formattedServers
    };
  });
}
function getServerLaunchInfo(webAppId, serverId) {
  const database = getDb();
  const stmt = database.prepare(`SELECT url, is_active FROM servers WHERE id = ? AND web_app_id = ? LIMIT 1`);
  stmt.bind([serverId, webAppId]);
  if (stmt.step()) {
    const row = stmt.get();
    stmt.free();
    return {
      url: String(row[0]),
      isActive: row[1] !== void 0 && row[1] !== null ? Number(row[1]) !== 0 : true
    };
  }
  stmt.free();
  return null;
}
function toggleServerStatus(serverId, isActive) {
  const database = getDb();
  const stmt = database.prepare(`SELECT id, is_active FROM servers WHERE id = ? LIMIT 1`);
  stmt.bind([serverId]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.get();
  stmt.free();
  const currentActive = row[1] !== void 0 && row[1] !== null ? Number(row[1]) !== 0 : true;
  const newActive = isActive !== void 0 ? isActive ? 1 : 0 : currentActive ? 0 : 1;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updateStmt = database.prepare(`UPDATE servers SET is_active = ?, updated_at = ? WHERE id = ?`);
  updateStmt.run([newActive, now, serverId]);
  updateStmt.free();
  saveDb();
  return {
    id: serverId,
    isActive: newActive === 1
  };
}
function getAdminStats() {
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
    totalServers,
    workingServers,
    errorServers,
    someErrorServers,
    unfilterServers,
    testingServers
  };
}
function getAdminWebApps() {
  const database = getDb();
  const appsRes = database.exec(`SELECT id, name, icon, created_at, updated_at FROM web_apps ORDER BY created_at DESC`);
  if (appsRes.length === 0) return [];
  const apps = appsRes[0].values.map((row) => ({
    id: String(row[0]),
    name: String(row[1]),
    icon: String(row[2]),
    createdAt: String(row[3]),
    updatedAt: String(row[4])
  }));
  const serversRes = database.exec(`
    SELECT id, web_app_id, url, category, sort_order, is_active, created_at, updated_at 
    FROM servers 
    ORDER BY sort_order ASC, created_at ASC
  `);
  const serversByApp = {};
  if (serversRes.length > 0) {
    serversRes[0].values.forEach((row) => {
      const appId = String(row[1]);
      if (!serversByApp[appId]) serversByApp[appId] = [];
      serversByApp[appId].push({
        id: String(row[0]),
        webAppId: appId,
        url: String(row[2]),
        category: String(row[3]),
        sortOrder: Number(row[4]),
        isActive: row[5] !== void 0 && row[5] !== null ? Number(row[5]) !== 0 : true,
        createdAt: String(row[6]),
        updatedAt: String(row[7])
      });
    });
  }
  return apps.map((app2) => ({
    ...app2,
    servers: serversByApp[app2.id] || []
  }));
}
function getAdminWebAppById(id) {
  const database = getDb();
  const stmt = database.prepare(`SELECT id, name, icon, created_at, updated_at FROM web_apps WHERE id = ?`);
  stmt.bind([id]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.get();
  stmt.free();
  const app2 = {
    id: String(row[0]),
    name: String(row[1]),
    icon: String(row[2]),
    createdAt: String(row[3]),
    updatedAt: String(row[4]),
    servers: []
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
    app2.servers.push({
      id: String(sRow[0]),
      webAppId: String(sRow[1]),
      url: String(sRow[2]),
      category: String(sRow[3]),
      sortOrder: Number(sRow[4]),
      isActive: sRow[5] !== void 0 && sRow[5] !== null ? Number(sRow[5]) !== 0 : true,
      createdAt: String(sRow[6]),
      updatedAt: String(sRow[7])
    });
  }
  sStmt.free();
  return app2;
}
function createWebApp(name, icon, servers) {
  const database = getDb();
  const appId = crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  database.run("BEGIN TRANSACTION;");
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
    database.run("COMMIT;");
    saveDb();
    return getAdminWebAppById(appId);
  } catch (error) {
    database.run("ROLLBACK;");
    throw error;
  }
}
function updateWebApp(id, name, icon, servers) {
  const database = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  database.run("BEGIN TRANSACTION;");
  try {
    const appStmt = database.prepare(`UPDATE web_apps SET name = ?, icon = ?, updated_at = ? WHERE id = ?`);
    appStmt.run([name, icon, now, id]);
    appStmt.free();
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
    database.run("COMMIT;");
    saveDb();
    return getAdminWebAppById(id);
  } catch (error) {
    database.run("ROLLBACK;");
    throw error;
  }
}
function deleteWebApp(id) {
  const database = getDb();
  database.run("BEGIN TRANSACTION;");
  try {
    const delServers = database.prepare(`DELETE FROM servers WHERE web_app_id = ?`);
    delServers.run([id]);
    delServers.free();
    const delApp = database.prepare(`DELETE FROM web_apps WHERE id = ?`);
    delApp.run([id]);
    delApp.free();
    database.run("COMMIT;");
    saveDb();
    return true;
  } catch (error) {
    database.run("ROLLBACK;");
    throw error;
  }
}
function getUserByEmail(email) {
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
    createdAt: String(row[4])
  };
}
function getSiteSettings() {
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
      id: "default_settings",
      telegramUrl: "",
      whatsappUrl: "",
      aboutTitle: "About Us",
      aboutDescription: "",
      happyTitle: "Stay Happy",
      happyMessage: "",
      happyIcon: "\u{1F49C}",
      messageTitle: "Important Message",
      messageContent: "",
      brandName: "Study Network",
      brandTagline: "",
      brandLogo: "",
      aboutMessageTitle: "",
      aboutMessageSubtitle: "",
      aboutMessageIcon: "",
      developerName: "",
      developerRole: "",
      developerDescription: "",
      developerPhoto: "",
      developerTagline: "",
      developerSocialLinks: [],
      aboutFooterTitle: "",
      aboutFooterSubtitle: "",
      aboutFooterTagline: "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  const row = stmt.get();
  stmt.free();
  let devLinks = [];
  try {
    if (row[21]) {
      devLinks = JSON.parse(String(row[21]));
    }
  } catch (e) {
    devLinks = [];
  }
  return {
    id: String(row[0]),
    telegramUrl: String(row[1] || ""),
    whatsappUrl: String(row[2] || ""),
    aboutTitle: String(row[3] || "About Us"),
    aboutDescription: String(row[4] || ""),
    happyTitle: String(row[5] || "Stay Happy"),
    happyMessage: String(row[6] || ""),
    happyIcon: String(row[7] || "\u{1F49C}"),
    messageTitle: String(row[8] ?? "Important Message"),
    messageContent: String(row[9] ?? ""),
    brandName: String(row[10] || "Study Network"),
    brandTagline: String(row[11] || ""),
    brandLogo: String(row[12] || ""),
    aboutMessageTitle: String(row[13] || ""),
    aboutMessageSubtitle: String(row[14] || ""),
    aboutMessageIcon: String(row[15] || ""),
    developerName: String(row[16] || ""),
    developerRole: String(row[17] || ""),
    developerDescription: String(row[18] || ""),
    developerPhoto: String(row[19] || ""),
    developerTagline: String(row[20] || ""),
    developerSocialLinks: Array.isArray(devLinks) ? devLinks : [],
    aboutFooterTitle: String(row[22] || ""),
    aboutFooterSubtitle: String(row[23] || ""),
    aboutFooterTagline: String(row[24] || ""),
    createdAt: String(row[25]),
    updatedAt: String(row[26])
  };
}
function updateSiteSettings(payload) {
  const database = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existing = getSiteSettings();
  const rowId = existing.id || "default_settings";
  const telegramUrl = payload.telegramUrl !== void 0 ? payload.telegramUrl.trim() : existing.telegramUrl;
  const whatsappUrl = payload.whatsappUrl !== void 0 ? payload.whatsappUrl.trim() : existing.whatsappUrl;
  const aboutTitle = payload.aboutTitle !== void 0 ? payload.aboutTitle.trim() : existing.aboutTitle;
  const aboutDescription = payload.aboutDescription !== void 0 ? payload.aboutDescription.trim() : existing.aboutDescription;
  const happyTitle = payload.happyTitle !== void 0 ? payload.happyTitle.trim() : existing.happyTitle;
  const happyMessage = payload.happyMessage !== void 0 ? payload.happyMessage.trim() : existing.happyMessage;
  const happyIcon = payload.happyIcon !== void 0 ? payload.happyIcon.trim() : existing.happyIcon || "\u{1F49C}";
  const messageTitle = payload.messageTitle !== void 0 ? payload.messageTitle.trim() : existing.messageTitle || "Important Message";
  const messageContent = payload.messageContent !== void 0 ? payload.messageContent : existing.messageContent || "";
  const brandName = payload.brandName !== void 0 ? payload.brandName.trim() : existing.brandName || "Study Network";
  const brandTagline = payload.brandTagline !== void 0 ? payload.brandTagline.trim() : existing.brandTagline || "";
  const brandLogo = payload.brandLogo !== void 0 ? payload.brandLogo.trim() : existing.brandLogo || "";
  const aboutMessageTitle = payload.aboutMessageTitle !== void 0 ? payload.aboutMessageTitle.trim() : existing.aboutMessageTitle || "";
  const aboutMessageSubtitle = payload.aboutMessageSubtitle !== void 0 ? payload.aboutMessageSubtitle.trim() : existing.aboutMessageSubtitle || "";
  const aboutMessageIcon = payload.aboutMessageIcon !== void 0 ? payload.aboutMessageIcon.trim() : existing.aboutMessageIcon || "";
  const developerName = payload.developerName !== void 0 ? payload.developerName.trim() : existing.developerName || "";
  const developerRole = payload.developerRole !== void 0 ? payload.developerRole.trim() : existing.developerRole || "";
  const developerDescription = payload.developerDescription !== void 0 ? payload.developerDescription.trim() : existing.developerDescription || "";
  const developerPhoto = payload.developerPhoto !== void 0 ? payload.developerPhoto.trim() : existing.developerPhoto || "";
  const developerTagline = payload.developerTagline !== void 0 ? payload.developerTagline.trim() : existing.developerTagline || "";
  let developerSocialLinksStr = JSON.stringify(existing.developerSocialLinks || []);
  if (payload.developerSocialLinks !== void 0) {
    const cleaned = cleanAndValidateSocialLinks(payload.developerSocialLinks);
    if (!cleaned.valid) {
      throw new Error(cleaned.error || "Invalid developer social links");
    }
    developerSocialLinksStr = JSON.stringify(cleaned.links);
  }
  const aboutFooterTitle = payload.aboutFooterTitle !== void 0 ? payload.aboutFooterTitle.trim() : existing.aboutFooterTitle || "";
  const aboutFooterSubtitle = payload.aboutFooterSubtitle !== void 0 ? payload.aboutFooterSubtitle.trim() : existing.aboutFooterSubtitle || "";
  const aboutFooterTagline = payload.aboutFooterTagline !== void 0 ? payload.aboutFooterTagline.trim() : existing.aboutFooterTagline || "";
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
      aboutTitle || "About Us",
      aboutDescription,
      happyTitle || "Stay Happy",
      happyMessage,
      happyIcon || "\u{1F49C}",
      messageTitle || "Important Message",
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
      rowId
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
      aboutTitle || "About Us",
      aboutDescription,
      happyTitle || "Stay Happy",
      happyMessage,
      happyIcon || "\u{1F49C}",
      messageTitle || "Important Message",
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
      now
    ]);
    stmt.free();
  }
  saveDb();
  return getSiteSettings();
}
function cleanAndValidateSocialLinks(rawLinks) {
  if (!rawLinks) return { valid: true, links: [] };
  let linksArray = rawLinks;
  if (typeof rawLinks === "string") {
    try {
      linksArray = JSON.parse(rawLinks);
    } catch {
      return { valid: false, links: [], error: "Invalid social links JSON format" };
    }
  }
  if (!Array.isArray(linksArray)) return { valid: true, links: [] };
  const validPlatforms = [
    "telegram",
    "whatsapp",
    "instagram",
    "youtube",
    "github",
    "twitter",
    "facebook",
    "linkedin",
    "website",
    "custom"
  ];
  const cleaned = [];
  for (let i = 0; i < linksArray.length; i++) {
    const item = linksArray[i];
    if (!item || typeof item !== "object") continue;
    const platform = String(item.platform || "website").toLowerCase().trim();
    const url = String(item.url || "").trim();
    const customName = item.customName ? String(item.customName).trim() : void 0;
    if (!url) {
      continue;
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { valid: false, links: [], error: `Invalid URL "${url}". Please enter a valid URL (e.g. https://instagram.com/example)` };
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return { valid: false, links: [], error: `URL "${url}" must start with http:// or https://` };
    }
    cleaned.push({
      id: item.id && typeof item.id === "string" ? item.id : `link-${crypto.randomUUID().slice(0, 8)}`,
      platform: validPlatforms.includes(platform) ? platform : "custom",
      url: parsedUrl.toString(),
      customName
    });
  }
  return { valid: true, links: cleaned };
}
function getTeamMembers() {
  const database = getDb();
  const res = database.exec(`
    SELECT id, name, role, description, photo, sort_order, social_links, created_at, updated_at
    FROM team_members
    ORDER BY sort_order ASC, created_at ASC
  `);
  if (res.length === 0) return [];
  return res[0].values.map((row) => {
    let socialLinks = [];
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
      description: String(row[3] || ""),
      photo: String(row[4] || ""),
      sortOrder: Number(row[5] || 0),
      socialLinks: Array.isArray(socialLinks) ? socialLinks : [],
      createdAt: String(row[7]),
      updatedAt: String(row[8])
    };
  });
}
function getTeamMemberById(id) {
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
  let socialLinks = [];
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
    description: String(row[3] || ""),
    photo: String(row[4] || ""),
    sortOrder: Number(row[5] || 0),
    socialLinks: Array.isArray(socialLinks) ? socialLinks : [],
    createdAt: String(row[7]),
    updatedAt: String(row[8])
  };
}
function createTeamMember(payload) {
  const database = getDb();
  const id = crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let sortOrder = payload.sortOrder;
  if (sortOrder === void 0) {
    const maxOrderRes = database.exec(`SELECT MAX(sort_order) FROM team_members`);
    if (maxOrderRes.length > 0 && maxOrderRes[0].values.length > 0 && maxOrderRes[0].values[0][0] !== null) {
      sortOrder = Number(maxOrderRes[0].values[0][0]) + 1;
    } else {
      sortOrder = 1;
    }
  }
  const cleaned = cleanAndValidateSocialLinks(payload.socialLinks);
  if (!cleaned.valid) {
    throw new Error(cleaned.error || "Invalid social links");
  }
  const stmt = database.prepare(`
    INSERT INTO team_members (id, name, role, description, photo, sort_order, social_links, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run([
    id,
    payload.name.trim(),
    payload.role.trim(),
    payload.description ? payload.description.trim() : "",
    payload.photo ? payload.photo.trim() : "",
    sortOrder,
    JSON.stringify(cleaned.links),
    now,
    now
  ]);
  stmt.free();
  saveDb();
  return {
    id,
    name: payload.name.trim(),
    role: payload.role.trim(),
    description: payload.description ? payload.description.trim() : "",
    photo: payload.photo ? payload.photo.trim() : "",
    sortOrder,
    socialLinks: cleaned.links,
    createdAt: now,
    updatedAt: now
  };
}
function updateTeamMember(id, payload) {
  const database = getDb();
  const existing = getTeamMemberById(id);
  if (!existing) return null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const name = payload.name !== void 0 ? payload.name.trim() : existing.name;
  const role = payload.role !== void 0 ? payload.role.trim() : existing.role;
  const description = payload.description !== void 0 ? payload.description.trim() : existing.description;
  const photo = payload.photo !== void 0 ? payload.photo.trim() : existing.photo;
  const sortOrder = payload.sortOrder !== void 0 ? payload.sortOrder : existing.sortOrder;
  let socialLinks = existing.socialLinks;
  if (payload.socialLinks !== void 0) {
    const cleaned = cleanAndValidateSocialLinks(payload.socialLinks);
    if (!cleaned.valid) {
      throw new Error(cleaned.error || "Invalid social links");
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
    id
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
    updatedAt: now
  };
}
function deleteTeamMember(id) {
  const database = getDb();
  const existing = getTeamMemberById(id);
  if (!existing) return false;
  if (existing.photo && existing.photo.startsWith("/uploads/")) {
    try {
      const localPath = path.join(process.cwd(), existing.photo);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    } catch (e) {
      console.warn("[Database] Could not remove team member photo file:", e);
    }
  }
  const stmt = database.prepare(`DELETE FROM team_members WHERE id = ?`);
  stmt.run([id]);
  stmt.free();
  saveDb();
  return true;
}
function reorderTeamMembers(ids) {
  const database = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  database.run("BEGIN TRANSACTION;");
  try {
    const stmt = database.prepare(`UPDATE team_members SET sort_order = ?, updated_at = ? WHERE id = ?`);
    ids.forEach((id, idx) => {
      stmt.run([idx + 1, now, id]);
    });
    stmt.free();
    database.run("COMMIT;");
    saveDb();
    return true;
  } catch (err) {
    database.run("ROLLBACK;");
    throw err;
  }
}
function getMessages() {
  const database = getDb();
  const res = database.exec(`
    SELECT id, title, content, is_published, sort_order, link_url, link_label, created_at, updated_at
    FROM messages
    ORDER BY sort_order ASC, created_at DESC
  `);
  if (res.length === 0) return [];
  return res[0].values.map((row) => ({
    id: String(row[0]),
    title: String(row[1]),
    content: String(row[2]),
    isPublished: Number(row[3]) === 1,
    sortOrder: Number(row[4] || 0),
    linkUrl: String(row[5] || ""),
    linkLabel: String(row[6] || ""),
    createdAt: String(row[7]),
    updatedAt: String(row[8])
  }));
}
function getPublishedMessages() {
  const database = getDb();
  const res = database.exec(`
    SELECT id, title, content, is_published, sort_order, link_url, link_label, created_at, updated_at
    FROM messages
    WHERE is_published = 1
    ORDER BY sort_order ASC, created_at DESC
  `);
  if (res.length === 0) return [];
  return res[0].values.map((row) => ({
    id: String(row[0]),
    title: String(row[1]),
    content: String(row[2]),
    isPublished: true,
    sortOrder: Number(row[4] || 0),
    linkUrl: String(row[5] || ""),
    linkLabel: String(row[6] || ""),
    createdAt: String(row[7]),
    updatedAt: String(row[8])
  }));
}
function getMessageById(id) {
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
    linkUrl: String(row[5] || ""),
    linkLabel: String(row[6] || ""),
    createdAt: String(row[7]),
    updatedAt: String(row[8])
  };
}
function createMessage(payload) {
  const database = getDb();
  const id = crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const isPublished = payload.isPublished !== false ? 1 : 0;
  const linkUrl = (payload.linkUrl || "").trim();
  const linkLabel = (payload.linkLabel || "").trim();
  const sortRes = database.exec(`SELECT MAX(sort_order) FROM messages`);
  const maxSort = sortRes.length > 0 && sortRes[0].values[0][0] !== null ? Number(sortRes[0].values[0][0]) : 0;
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
    updatedAt: now
  };
}
function updateMessage(id, payload) {
  const database = getDb();
  const existing = getMessageById(id);
  if (!existing) return null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const title = payload.title !== void 0 ? payload.title.trim() : existing.title;
  const content = payload.content !== void 0 ? payload.content : existing.content;
  const isPublished = payload.isPublished !== void 0 ? payload.isPublished ? 1 : 0 : existing.isPublished ? 1 : 0;
  const linkUrl = payload.linkUrl !== void 0 ? payload.linkUrl.trim() : existing.linkUrl;
  const linkLabel = payload.linkLabel !== void 0 ? payload.linkLabel.trim() : existing.linkLabel;
  const sortOrder = payload.sortOrder !== void 0 ? payload.sortOrder : existing.sortOrder;
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
    updatedAt: now
  };
}
function deleteMessage(id) {
  const database = getDb();
  const existing = getMessageById(id);
  if (!existing) return false;
  const stmt = database.prepare(`DELETE FROM messages WHERE id = ?`);
  stmt.run([id]);
  stmt.free();
  saveDb();
  return true;
}
function publishMessage(id, isPublished) {
  return updateMessage(id, { isPublished });
}
function reorderMessages(ids) {
  const database = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  database.run("BEGIN TRANSACTION;");
  try {
    const stmt = database.prepare(`UPDATE messages SET sort_order = ?, updated_at = ? WHERE id = ?`);
    ids.forEach((id, idx) => {
      stmt.run([idx + 1, now, id]);
    });
    stmt.free();
    database.run("COMMIT;");
    saveDb();
    return true;
  } catch (err) {
    database.run("ROLLBACK;");
    throw err;
  }
}
function getAchievementMessage() {
  const database = getDb();
  const res = database.exec(`SELECT title, content, updated_at FROM achievement_message WHERE id = 'default' LIMIT 1`);
  if (res.length === 0 || res[0].values.length === 0) {
    return {
      title: "Important Message",
      content: "",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  const row = res[0].values[0];
  return {
    title: String(row[0] || "Important Message"),
    content: String(row[1] || ""),
    updatedAt: String(row[2] || "")
  };
}
function updateAchievementMessage(title, content) {
  const database = getDb();
  const existing = getAchievementMessage();
  const newTitle = title !== void 0 ? String(title).trim() : existing.title;
  const newContent = content !== void 0 ? String(content).trim() : existing.content;
  const now = (/* @__PURE__ */ new Date()).toISOString();
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
    updatedAt: now
  };
}
function getPublicAchievements() {
  const database = getDb();
  const res = database.exec(`SELECT id, image_url, comment, is_pinned, created_at, updated_at FROM achievements ORDER BY is_pinned DESC, created_at DESC`);
  if (res.length === 0) return [];
  return res[0].values.map((row) => ({
    id: String(row[0]),
    imageUrl: String(row[1]),
    comment: String(row[2]),
    isPinned: Number(row[3]) === 1,
    createdAt: String(row[4]),
    updatedAt: String(row[5])
  }));
}
function getAdminAchievements() {
  return getPublicAchievements();
}
function getAchievementById(id) {
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
      updatedAt: String(row[5])
    };
  }
  stmt.free();
  return null;
}
function createAchievement(imageUrl, comment, isPinned = false) {
  const database = getDb();
  const id = crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
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
    updatedAt: now
  };
}
function updateAchievement(id, imageUrl, comment, isPinned) {
  const database = getDb();
  const existing = getAchievementById(id);
  if (!existing) return null;
  const finalPinned = isPinned !== void 0 ? isPinned ? 1 : 0 : existing.isPinned ? 1 : 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
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
    updatedAt: now
  };
}
function toggleAchievementPin(id, isPinned) {
  const database = getDb();
  const existing = getAchievementById(id);
  if (!existing) return null;
  const newPinned = isPinned !== void 0 ? Boolean(isPinned) : !existing.isPinned;
  const now = (/* @__PURE__ */ new Date()).toISOString();
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
    updatedAt: now
  };
}
function deleteAchievement(id) {
  const database = getDb();
  const stmt = database.prepare(`DELETE FROM achievements WHERE id = ?`);
  stmt.run([id]);
  stmt.free();
  saveDb();
  return true;
}
function getAdminPermissions(adminId) {
  const database = getDb();
  const stmt = database.prepare(`SELECT permission FROM admin_permissions WHERE admin_id = ? ORDER BY permission ASC`);
  stmt.bind([adminId]);
  const perms = [];
  while (stmt.step()) {
    const row = stmt.get();
    perms.push(String(row[0]));
  }
  stmt.free();
  return perms;
}
function getAllOtherAdmins() {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, username, role, is_active, created_at, updated_at 
    FROM other_admins 
    ORDER BY created_at DESC
  `);
  const admins = [];
  while (stmt.step()) {
    const row = stmt.get();
    const id = String(row[0]);
    admins.push({
      id,
      username: String(row[1]),
      role: "OTHER_ADMIN",
      isActive: Number(row[3]) === 1,
      permissions: getAdminPermissions(id),
      createdAt: String(row[4]),
      updatedAt: String(row[5])
    });
  }
  stmt.free();
  return admins;
}
function getOtherAdminById(id) {
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
    role: "OTHER_ADMIN",
    isActive: Number(row[3]) === 1,
    permissions: getAdminPermissions(idVal),
    createdAt: String(row[4]),
    updatedAt: String(row[5])
  };
}
function getOtherAdminByUsername(username) {
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
    role: "OTHER_ADMIN",
    isActive: Number(row[4]) === 1,
    permissions: getAdminPermissions(id),
    createdAt: String(row[5]),
    updatedAt: String(row[6])
  };
}
function createOtherAdmin(username, password, permissions = [], isActive = true) {
  const database = getDb();
  const cleanUsername = username.trim();
  if (cleanUsername.length < 3) {
    throw new Error("Admin ID / Username must be at least 3 characters long");
  }
  const existing = getOtherAdminByUsername(cleanUsername);
  if (existing) {
    throw new Error(`An administrator with ID/username "${cleanUsername}" already exists`);
  }
  const id = crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  database.run("BEGIN TRANSACTION;");
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
        if (typeof p === "string" && p.trim()) {
          pStmt.run([crypto.randomUUID(), id, p.trim(), now]);
        }
      }
      pStmt.free();
    }
    database.run("COMMIT;");
    saveDb();
    const created = getOtherAdminById(id);
    if (!created) throw new Error("Failed to retrieve created administrator");
    return created;
  } catch (err) {
    database.run("ROLLBACK;");
    throw err;
  }
}
function updateOtherAdmin(id, updates) {
  const database = getDb();
  const existing = getOtherAdminById(id);
  if (!existing) {
    throw new Error("Other Admin not found");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let newUsername = existing.username;
  if (updates.username !== void 0) {
    const cleanUser = updates.username.trim();
    if (cleanUser.length < 3) {
      throw new Error("Admin ID / Username must be at least 3 characters long");
    }
    if (cleanUser.toLowerCase() !== existing.username.toLowerCase()) {
      const dupe = getOtherAdminByUsername(cleanUser);
      if (dupe && dupe.id !== id) {
        throw new Error(`Username "${cleanUser}" is already taken by another administrator`);
      }
    }
    newUsername = cleanUser;
  }
  const newIsActive = updates.isActive !== void 0 ? updates.isActive ? 1 : 0 : existing.isActive ? 1 : 0;
  database.run("BEGIN TRANSACTION;");
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
          if (typeof p === "string" && p.trim()) {
            pStmt.run([crypto.randomUUID(), id, p.trim(), now]);
          }
        }
        pStmt.free();
      }
    }
    database.run("COMMIT;");
    saveDb();
    const updated = getOtherAdminById(id);
    if (!updated) throw new Error("Failed to retrieve updated administrator");
    return updated;
  } catch (err) {
    database.run("ROLLBACK;");
    throw err;
  }
}
function toggleOtherAdminStatus(id, isActive) {
  const existing = getOtherAdminById(id);
  if (!existing) {
    throw new Error("Other Admin not found");
  }
  const nextActive = isActive !== void 0 ? isActive : !existing.isActive;
  return updateOtherAdmin(id, { isActive: nextActive });
}
function deleteOtherAdmin(id) {
  const database = getDb();
  const existing = getOtherAdminById(id);
  if (!existing) {
    return false;
  }
  database.run("BEGIN TRANSACTION;");
  try {
    const pStmt = database.prepare(`DELETE FROM admin_permissions WHERE admin_id = ?`);
    pStmt.run([id]);
    pStmt.free();
    const stmt = database.prepare(`DELETE FROM other_admins WHERE id = ?`);
    stmt.run([id]);
    stmt.free();
    database.run("COMMIT;");
    saveDb();
    return true;
  } catch (err) {
    database.run("ROLLBACK;");
    throw err;
  }
}

// server/app.ts
dotenv2.config({ override: true });
var JWT_SECRET = process.env.JWT_SECRET || "secret-admin-token-link-manager-key-2026";
var ALL_PERMISSIONS = [
  "VIEW_WEBAPPS",
  "ADD_WEBAPP",
  "EDIT_WEBAPP",
  "DELETE_WEBAPP",
  "VIEW_SERVERS",
  "ADD_SERVER",
  "EDIT_SERVER",
  "DELETE_SERVER",
  "CHANGE_SERVER_CATEGORY",
  "EDIT_TELEGRAM",
  "EDIT_WHATSAPP",
  "EDIT_STAY_HAPPY",
  "VIEW_ABOUT_US_TEAM",
  "EDIT_ABOUT_US",
  "EDIT_DEVELOPER",
  "ADD_TEAM_MEMBER",
  "EDIT_TEAM_MEMBER",
  "DELETE_TEAM_MEMBER",
  "MANAGE_TEAM_SOCIAL_LINKS",
  "REORDER_TEAM_MEMBERS",
  "VIEW_MESSAGES",
  "ADD_MESSAGE",
  "EDIT_MESSAGE",
  "DELETE_MESSAGE",
  "PUBLISH_MESSAGE",
  "REORDER_MESSAGES",
  "MANAGE_MESSAGE_LINKS",
  "VIEW_DASHBOARD"
];
function getMainAdminCredentials() {
  const id = (process.env.MAIN_ADMIN_ID || process.env.ADMIN_ID || process.env.ADMIN_USERNAME || "admin").trim();
  const password = (process.env.MAIN_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "admin").trim();
  return { id, password };
}
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid authentication token" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === "MAIN_ADMIN" || decoded.role === "admin") {
      const mainAdmin = getMainAdminCredentials();
      req.user = {
        id: "main-admin",
        username: mainAdmin.id,
        email: mainAdmin.id,
        role: "MAIN_ADMIN",
        isActive: true,
        permissions: [...ALL_PERMISSIONS]
      };
      return next();
    }
    if (decoded.role === "OTHER_ADMIN") {
      const admin = getOtherAdminById(decoded.id);
      if (!admin) {
        return res.status(401).json({ error: "Administrator account not found or was removed" });
      }
      if (!admin.isActive) {
        return res.status(403).json({ error: "This administrator account is disabled. Please contact the Main Admin." });
      }
      req.user = {
        id: admin.id,
        username: admin.username,
        email: admin.username,
        role: "OTHER_ADMIN",
        isActive: admin.isActive,
        permissions: admin.permissions
      };
      return next();
    }
    return res.status(401).json({ error: "Unauthorized: Unrecognized admin role" });
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Token has expired or is invalid" });
  }
}
function requireMainAdmin(req, res, next) {
  if (!req.user || req.user.role !== "MAIN_ADMIN") {
    return res.status(403).json({ error: "Forbidden: Main Admin access required" });
  }
  next();
}
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (req.user.role === "MAIN_ADMIN") {
      return next();
    }
    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }
    return res.status(403).json({
      error: `Forbidden: Missing required permission (${permission})`
    });
  };
}
function requireAnyPermission(permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (req.user.role === "MAIN_ADMIN") {
      return next();
    }
    const hasPerm = permissions.some((p) => req.user?.permissions?.includes(p));
    if (hasPerm) {
      return next();
    }
    return res.status(403).json({
      error: `Forbidden: Missing required permission for this section (${permissions.join(", ")})`
    });
  };
}
function isValidUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (e) {
    return false;
  }
}
function isValidImageUrl(urlOrData) {
  if (!urlOrData || typeof urlOrData !== "string") return false;
  const trimmed = urlOrData.trim();
  if (trimmed.startsWith("data:image/")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (e) {
    return false;
  }
}
var app = express();
var dbInitialized = false;
var dbInitPromise = null;
async function ensureDbReady() {
  if (dbInitialized) return;
  if (!dbInitPromise) {
    dbInitPromise = initDatabase().then(() => {
      dbInitialized = true;
    });
  }
  await dbInitPromise;
}
app.use(async (req, res, next) => {
  try {
    await ensureDbReady();
    next();
  } catch (err) {
    console.error("[Server] Database initialization failed:", err);
    res.status(500).json({ error: "Database initialization failed" });
  }
});
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    return next();
  }
  express.json({ limit: "15mb" })(req, res, (err) => {
    if (err) return next(err);
    express.urlencoded({ extended: true, limit: "15mb" })(req, res, next);
  });
});
app.use((req, res, next) => {
  const forwardedUrl = req.headers["x-forwarded-url"] || req.headers["x-matched-path"] || req.headers["x-vercel-original-url"];
  if (forwardedUrl && forwardedUrl.startsWith("/api/") && forwardedUrl !== req.url) {
    req.url = forwardedUrl.split("?")[0];
  } else if (req.originalUrl && req.originalUrl.startsWith("/api/") && !req.url.startsWith("/api/")) {
    req.url = req.originalUrl.split("?")[0];
  } else if (req.url && !req.url.startsWith("/api/")) {
    const apiPrefixes = ["/health", "/auth", "/webapps", "/settings", "/message", "/achievements", "/team", "/admin", "/servers", "/messages"];
    if (apiPrefixes.some((p) => req.url.startsWith(p))) {
      req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
    }
  }
  next();
});
app.get(["/api/health", "/health"], (req, res) => {
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/webapps", (req, res) => {
  try {
    const apps = getPublicWebApps();
    res.json(apps);
  } catch (err) {
    console.error("Error fetching public webapps:", err);
    res.status(500).json({ error: "Failed to retrieve web apps" });
  }
});
app.get("/api/settings", (req, res) => {
  try {
    const settings = getSiteSettings();
    res.json(settings);
  } catch (err) {
    console.error("Error fetching site settings:", err);
    res.status(500).json({ error: "Failed to retrieve site settings" });
  }
});
app.get("/api/message", (req, res) => {
  try {
    const settings = getSiteSettings();
    res.json({
      messageTitle: settings.messageTitle || "Message",
      messageContent: settings.messageContent || ""
    });
  } catch (err) {
    console.error("Error fetching message:", err);
    res.status(500).json({ error: "Failed to retrieve message" });
  }
});
app.get("/api/achievements/message", (req, res) => {
  try {
    const message = getAchievementMessage();
    res.json(message);
  } catch (err) {
    console.error("Error fetching achievement message:", err);
    res.status(500).json({ error: "Failed to retrieve achievement message" });
  }
});
app.get("/api/achievements", (req, res) => {
  try {
    const achievements = getPublicAchievements();
    res.json(achievements);
  } catch (err) {
    console.error("Error fetching achievements:", err);
    res.status(500).json({ error: "Failed to retrieve achievements" });
  }
});
app.get("/api/team-members", (req, res) => {
  try {
    const members = getTeamMembers();
    res.json(members);
  } catch (err) {
    console.error("Error fetching team members:", err);
    res.status(500).json({ error: "Failed to retrieve team members" });
  }
});
app.get("/api/webapps/:webAppId/servers/:serverId/launch", (req, res) => {
  try {
    const { webAppId, serverId } = req.params;
    const info = getServerLaunchInfo(webAppId, serverId);
    if (!info) {
      return res.status(404).json({ error: "Server link not found" });
    }
    if (!info.isActive) {
      return res.status(403).json({ error: "This server is currently inactive and cannot be launched." });
    }
    res.json({ url: info.url });
  } catch (err) {
    console.error("Error launching server:", err);
    res.status(500).json({ error: "Failed to launch server" });
  }
});
app.get("/api/servers/:serverId/launch", (req, res) => {
  try {
    const { serverId } = req.params;
    const apps = getAdminWebApps();
    for (const appItem of apps) {
      const found = appItem.servers.find((s) => s.id === serverId);
      if (found) {
        if (!found.isActive) {
          return res.status(403).json({ error: "This server is currently inactive and cannot be launched." });
        }
        return res.json({ url: found.url });
      }
    }
    res.status(404).json({ error: "Server link not found" });
  } catch (err) {
    res.status(500).json({ error: "Failed to launch server" });
  }
});
app.post(["/api/auth/login", "/auth/login", "/login"], (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    const rawLoginId = (username || email || "").trim();
    if (!rawLoginId || !password) {
      return res.status(400).json({ error: "Admin ID/Username and password are required" });
    }
    const loginId = rawLoginId.startsWith("@") ? rawLoginId.slice(1).trim() : rawLoginId;
    const mainAdmin = getMainAdminCredentials();
    const cleanMainAdminId = mainAdmin.id.startsWith("@") ? mainAdmin.id.slice(1).trim() : mainAdmin.id;
    if ((rawLoginId.toLowerCase() === mainAdmin.id.toLowerCase() || loginId.toLowerCase() === cleanMainAdminId.toLowerCase()) && password === mainAdmin.password) {
      const token = jwt.sign(
        { id: "main-admin", username: mainAdmin.id, role: "MAIN_ADMIN" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.json({
        token,
        user: {
          id: "main-admin",
          username: mainAdmin.id,
          email: mainAdmin.id,
          role: "MAIN_ADMIN",
          isActive: true,
          permissions: [...ALL_PERMISSIONS]
        }
      });
    }
    const otherAdmin = getOtherAdminByUsername(loginId) || getOtherAdminByUsername(rawLoginId);
    if (otherAdmin) {
      if (!otherAdmin.isActive) {
        return res.status(403).json({
          error: "This administrator account has been disabled. Please contact the Main Admin."
        });
      }
      const isMatch = bcrypt2.compareSync(password, otherAdmin.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid ID/username or password" });
      }
      const token = jwt.sign(
        { id: otherAdmin.id, username: otherAdmin.username, role: "OTHER_ADMIN" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.json({
        token,
        user: {
          id: otherAdmin.id,
          username: otherAdmin.username,
          email: otherAdmin.username,
          role: "OTHER_ADMIN",
          isActive: otherAdmin.isActive,
          permissions: otherAdmin.permissions
        }
      });
    }
    const legacyUser = getUserByEmail(loginId) || getUserByEmail(rawLoginId);
    if (legacyUser) {
      const isMatch = bcrypt2.compareSync(password, legacyUser.passwordHash);
      if (isMatch) {
        const token = jwt.sign(
          { id: "main-admin", username: mainAdmin.id, role: "MAIN_ADMIN" },
          JWT_SECRET,
          { expiresIn: "7d" }
        );
        return res.json({
          token,
          user: {
            id: "main-admin",
            username: mainAdmin.id,
            email: mainAdmin.id,
            role: "MAIN_ADMIN",
            isActive: true,
            permissions: [...ALL_PERMISSIONS]
          }
        });
      }
    }
    return res.status(401).json({ error: "Invalid ID/username or password" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error during login" });
  }
});
app.get(["/api/auth/me", "/auth/me", "/me"], requireAdminAuth, (req, res) => {
  res.json({ user: req.user });
});
app.get("/api/admin/other-admins", requireAdminAuth, requireMainAdmin, (req, res) => {
  try {
    const admins = getAllOtherAdmins();
    res.json(admins);
  } catch (err) {
    console.error("Error fetching other admins:", err);
    res.status(500).json({ error: "Failed to retrieve administrators" });
  }
});
app.post("/api/admin/other-admins", requireAdminAuth, requireMainAdmin, (req, res) => {
  try {
    const { username, password, permissions, isActive } = req.body;
    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return res.status(400).json({ error: "Admin ID / Username must be at least 3 characters long" });
    }
    if (!password || typeof password !== "string" || password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters long" });
    }
    const mainAdmin = getMainAdminCredentials();
    if (username.trim().toLowerCase() === mainAdmin.id.toLowerCase()) {
      return res.status(400).json({ error: "Cannot create an Other Admin using the Main Admin ID" });
    }
    const validPerms = Array.isArray(permissions) ? permissions.filter((p) => ALL_PERMISSIONS.includes(p)) : [];
    const created = createOtherAdmin(
      username.trim(),
      password,
      validPerms,
      isActive !== false
    );
    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating other admin:", err);
    res.status(400).json({ error: err.message || "Failed to create administrator" });
  }
});
app.put("/api/admin/other-admins/:id", requireAdminAuth, requireMainAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, permissions, isActive } = req.body;
    if (username !== void 0) {
      if (!username || typeof username !== "string" || username.trim().length < 3) {
        return res.status(400).json({ error: "Admin ID / Username must be at least 3 characters long" });
      }
      const mainAdmin = getMainAdminCredentials();
      if (username.trim().toLowerCase() === mainAdmin.id.toLowerCase()) {
        return res.status(400).json({ error: "Cannot use the Main Admin ID for an Other Admin" });
      }
    }
    if (password !== void 0 && password !== "") {
      if (typeof password !== "string" || password.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters long" });
      }
    }
    const validPerms = Array.isArray(permissions) ? permissions.filter((p) => ALL_PERMISSIONS.includes(p)) : void 0;
    const updated = updateOtherAdmin(id, {
      username: username !== void 0 ? username.trim() : void 0,
      password: password && password.trim() ? password : void 0,
      permissions: validPerms,
      isActive: typeof isActive === "boolean" ? isActive : void 0
    });
    res.json(updated);
  } catch (err) {
    console.error("Error updating other admin:", err);
    res.status(400).json({ error: err.message || "Failed to update administrator" });
  }
});
app.patch("/api/admin/other-admins/:id/status", requireAdminAuth, requireMainAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};
    const updated = toggleOtherAdminStatus(id, typeof isActive === "boolean" ? isActive : void 0);
    res.json(updated);
  } catch (err) {
    console.error("Error toggling admin status:", err);
    res.status(400).json({ error: err.message || "Failed to update administrator status" });
  }
});
app.delete("/api/admin/other-admins/:id", requireAdminAuth, requireMainAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const success = deleteOtherAdmin(id);
    if (!success) {
      return res.status(404).json({ error: "Administrator not found" });
    }
    res.json({ success: true, message: "Other Administrator deleted successfully" });
  } catch (err) {
    console.error("Error deleting other admin:", err);
    res.status(500).json({ error: "Failed to delete administrator" });
  }
});
app.all(["/api/admin/admins", "/api/admin/admins/*", "/api/admin/accounts", "/api/admin/accounts/*"], requireAdminAuth, requireMainAdmin, (req, res) => {
  res.status(403).json({ error: "Forbidden: Main Admin access required" });
});
app.get("/api/admin/stats", requireAdminAuth, requirePermission("VIEW_DASHBOARD"), (req, res) => {
  try {
    const stats = getAdminStats();
    res.json(stats);
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Failed to retrieve stats" });
  }
});
app.get("/api/admin/webapps", requireAdminAuth, (req, res) => {
  try {
    const apps = getAdminWebApps();
    res.json(apps);
  } catch (err) {
    console.error("Error fetching admin webapps:", err);
    res.status(500).json({ error: "Failed to retrieve web apps" });
  }
});
app.get("/api/admin/webapps/:id", requireAdminAuth, (req, res) => {
  try {
    const appItem = getAdminWebAppById(req.params.id);
    if (!appItem) {
      return res.status(404).json({ error: "Web App not found" });
    }
    res.json(appItem);
  } catch (err) {
    console.error("Error fetching webapp:", err);
    res.status(500).json({ error: "Failed to retrieve web app" });
  }
});
function validateWebAppPayload(body) {
  const { name, icon, servers } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return { valid: false, message: "Web App name is required" };
  }
  if (!icon || !isValidImageUrl(icon)) {
    return { valid: false, message: "A valid image URL or uploaded image is required" };
  }
  if (!Array.isArray(servers) || servers.length === 0) {
    return { valid: false, message: "At least one server link is required" };
  }
  const validCategories = ["Working", "Error", "Some Error", "Unfilter", "Testing"];
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
var handleCreateWebApp = (req, res) => {
  try {
    if (req.user?.role !== "MAIN_ADMIN" && !req.user?.permissions?.includes("ADD_WEBAPP")) {
      return res.status(403).json({ error: "Forbidden: Missing permission (ADD_WEBAPP)" });
    }
    const validation = validateWebAppPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    const { name, icon, servers } = req.body;
    if (Array.isArray(servers) && servers.length > 0) {
      if (req.user?.role !== "MAIN_ADMIN" && !req.user?.permissions?.includes("ADD_SERVER")) {
        return res.status(403).json({ error: "Forbidden: Missing permission (ADD_SERVER) to add servers" });
      }
    }
    const cleanServers = servers.map((s) => ({
      url: s.url.trim(),
      category: s.category,
      isActive: s.isActive !== false
    }));
    const newApp = createWebApp(name.trim(), icon.trim(), cleanServers);
    res.status(201).json(newApp);
  } catch (err) {
    console.error("Error creating web app:", err);
    res.status(500).json({ error: "Failed to create web app" });
  }
};
app.post("/api/admin/webapps", requireAdminAuth, requirePermission("ADD_WEBAPP"), handleCreateWebApp);
app.post("/api/webapps", requireAdminAuth, requirePermission("ADD_WEBAPP"), handleCreateWebApp);
var handleUpdateWebApp = (req, res) => {
  try {
    if (req.user?.role !== "MAIN_ADMIN" && !req.user?.permissions?.includes("EDIT_WEBAPP")) {
      return res.status(403).json({ error: "Forbidden: Missing permission (EDIT_WEBAPP)" });
    }
    const { id } = req.params;
    const existing = getAdminWebAppById(id);
    if (!existing) {
      return res.status(404).json({ error: "Web App not found" });
    }
    const validation = validateWebAppPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    const { name, icon, servers } = req.body;
    if (req.user?.role !== "MAIN_ADMIN") {
      const perms = req.user?.permissions || [];
      const existingServerMap = new Map(existing.servers.map((s) => [s.id, s]));
      const payloadServerIds = new Set(servers.filter((s) => s.id).map((s) => s.id));
      const hasNewServers = servers.some((s) => !s.id || !existingServerMap.has(s.id));
      if (hasNewServers && !perms.includes("ADD_SERVER")) {
        return res.status(403).json({ error: "Forbidden: Missing permission (ADD_SERVER) to add new servers" });
      }
      const hasDeletedServers = existing.servers.some((s) => !payloadServerIds.has(s.id));
      if (hasDeletedServers && !perms.includes("DELETE_SERVER")) {
        return res.status(403).json({ error: "Forbidden: Missing permission (DELETE_SERVER) to delete servers" });
      }
      for (const s of servers) {
        if (s.id && existingServerMap.has(s.id)) {
          const oldS = existingServerMap.get(s.id);
          if (oldS.category !== s.category && !perms.includes("CHANGE_SERVER_CATEGORY")) {
            return res.status(403).json({ error: "Forbidden: Missing permission (CHANGE_SERVER_CATEGORY) to change server category" });
          }
          if (oldS.url !== s.url.trim() && !perms.includes("EDIT_SERVER")) {
            return res.status(403).json({ error: "Forbidden: Missing permission (EDIT_SERVER) to edit server URL" });
          }
        }
      }
    }
    const cleanServers = servers.map((s) => ({
      id: s.id,
      url: s.url.trim(),
      category: s.category,
      isActive: s.isActive !== false
    }));
    const updated = updateWebApp(id, name.trim(), icon.trim(), cleanServers);
    res.json(updated);
  } catch (err) {
    console.error("Error updating web app:", err);
    res.status(500).json({ error: "Failed to update web app" });
  }
};
app.put("/api/admin/webapps/:id", requireAdminAuth, requirePermission("EDIT_WEBAPP"), handleUpdateWebApp);
app.put("/api/webapps/:id", requireAdminAuth, requirePermission("EDIT_WEBAPP"), handleUpdateWebApp);
var handleToggleServer = (req, res) => {
  try {
    if (req.user?.role !== "MAIN_ADMIN" && !req.user?.permissions?.includes("EDIT_SERVER")) {
      return res.status(403).json({ error: "Forbidden: Missing permission (EDIT_SERVER)" });
    }
    const { serverId } = req.params;
    const { isActive } = req.body || {};
    const result = toggleServerStatus(
      serverId,
      typeof isActive === "boolean" ? isActive : void 0
    );
    if (!result) {
      return res.status(404).json({ error: "Server not found" });
    }
    res.json(result);
  } catch (err) {
    console.error("Error updating server status:", err);
    res.status(500).json({ error: "Failed to update server status" });
  }
};
app.patch("/api/admin/servers/:serverId/status", requireAdminAuth, requirePermission("EDIT_SERVER"), handleToggleServer);
app.post("/api/admin/servers/:serverId/toggle", requireAdminAuth, requirePermission("EDIT_SERVER"), handleToggleServer);
var handleDeleteWebApp = (req, res) => {
  try {
    if (req.user?.role !== "MAIN_ADMIN" && !req.user?.permissions?.includes("DELETE_WEBAPP")) {
      return res.status(403).json({ error: "Forbidden: Missing permission (DELETE_WEBAPP)" });
    }
    const { id } = req.params;
    const existing = getAdminWebAppById(id);
    if (!existing) {
      return res.status(404).json({ error: "Web App not found" });
    }
    deleteWebApp(id);
    res.json({ success: true, message: "Web App and associated servers deleted" });
  } catch (err) {
    console.error("Error deleting web app:", err);
    res.status(500).json({ error: "Failed to delete web app" });
  }
};
app.delete("/api/admin/webapps/:id", requireAdminAuth, requirePermission("DELETE_WEBAPP"), handleDeleteWebApp);
app.delete("/api/webapps/:id", requireAdminAuth, requirePermission("DELETE_WEBAPP"), handleDeleteWebApp);
app.get("/api/admin/settings", requireAdminAuth, (req, res) => {
  try {
    const settings = getSiteSettings();
    res.json(settings);
  } catch (err) {
    console.error("Error fetching admin settings:", err);
    res.status(500).json({ error: "Failed to retrieve site settings" });
  }
});
app.put("/api/admin/settings", requireAdminAuth, (req, res) => {
  try {
    const user = req.user;
    if (user?.role !== "MAIN_ADMIN") {
      const perms = user?.permissions || [];
      const {
        telegramUrl: telegramUrl2,
        whatsappUrl: whatsappUrl2,
        aboutTitle: aboutTitle2,
        aboutDescription: aboutDescription2,
        happyTitle: happyTitle2,
        happyMessage: happyMessage2,
        happyIcon: happyIcon2,
        messageTitle: messageTitle2,
        messageContent: messageContent2,
        brandName: brandName2,
        brandTagline: brandTagline2,
        brandLogo: brandLogo2,
        aboutMessageTitle: aboutMessageTitle2,
        aboutMessageSubtitle: aboutMessageSubtitle2,
        aboutMessageIcon: aboutMessageIcon2,
        developerName: developerName2,
        developerRole: developerRole2,
        developerDescription: developerDescription2,
        developerPhoto: developerPhoto2,
        developerTagline: developerTagline2,
        developerSocialLinks: developerSocialLinks2,
        aboutFooterTitle: aboutFooterTitle2,
        aboutFooterSubtitle: aboutFooterSubtitle2,
        aboutFooterTagline: aboutFooterTagline2
      } = req.body;
      if (telegramUrl2 !== void 0 && !perms.includes("EDIT_TELEGRAM")) {
        return res.status(403).json({ error: "Forbidden: Missing permission (EDIT_TELEGRAM)" });
      }
      if (whatsappUrl2 !== void 0 && !perms.includes("EDIT_WHATSAPP")) {
        return res.status(403).json({ error: "Forbidden: Missing permission (EDIT_WHATSAPP)" });
      }
      const isEditingStayHappy = happyTitle2 !== void 0 || happyMessage2 !== void 0 || happyIcon2 !== void 0;
      if (isEditingStayHappy && !perms.includes("EDIT_STAY_HAPPY")) {
        return res.status(403).json({ error: "Forbidden: Missing permission (EDIT_STAY_HAPPY)" });
      }
      const isEditingAbout = aboutTitle2 !== void 0 || aboutDescription2 !== void 0 || brandName2 !== void 0 || brandTagline2 !== void 0 || brandLogo2 !== void 0 || aboutMessageTitle2 !== void 0 || aboutMessageSubtitle2 !== void 0 || aboutMessageIcon2 !== void 0 || aboutFooterTitle2 !== void 0 || aboutFooterSubtitle2 !== void 0 || aboutFooterTagline2 !== void 0;
      if (isEditingAbout && !perms.includes("EDIT_ABOUT_US")) {
        return res.status(403).json({ error: "Forbidden: Missing permission (EDIT_ABOUT_US)" });
      }
      const isEditingDeveloper = developerName2 !== void 0 || developerRole2 !== void 0 || developerDescription2 !== void 0 || developerPhoto2 !== void 0 || developerTagline2 !== void 0 || developerSocialLinks2 !== void 0;
      if (isEditingDeveloper && !perms.includes("EDIT_DEVELOPER")) {
        return res.status(403).json({ error: "Forbidden: Missing permission (EDIT_DEVELOPER)" });
      }
      const isEditingMessage = messageTitle2 !== void 0 || messageContent2 !== void 0;
      if (isEditingMessage && !perms.includes("EDIT_MESSAGE")) {
        return res.status(403).json({ error: "Forbidden: Missing permission (EDIT_MESSAGE)" });
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
      aboutFooterTagline
    } = req.body;
    const updated = updateSiteSettings({
      telegramUrl: telegramUrl !== void 0 ? String(telegramUrl) : void 0,
      whatsappUrl: whatsappUrl !== void 0 ? String(whatsappUrl) : void 0,
      aboutTitle: aboutTitle !== void 0 ? String(aboutTitle) : void 0,
      aboutDescription: aboutDescription !== void 0 ? String(aboutDescription) : void 0,
      happyTitle: happyTitle !== void 0 ? String(happyTitle) : void 0,
      happyMessage: happyMessage !== void 0 ? String(happyMessage) : void 0,
      happyIcon: happyIcon !== void 0 ? String(happyIcon) : void 0,
      messageTitle: messageTitle !== void 0 ? String(messageTitle) : void 0,
      messageContent: messageContent !== void 0 ? String(messageContent) : void 0,
      brandName: brandName !== void 0 ? String(brandName) : void 0,
      brandTagline: brandTagline !== void 0 ? String(brandTagline) : void 0,
      brandLogo: brandLogo !== void 0 ? String(brandLogo) : void 0,
      aboutMessageTitle: aboutMessageTitle !== void 0 ? String(aboutMessageTitle) : void 0,
      aboutMessageSubtitle: aboutMessageSubtitle !== void 0 ? String(aboutMessageSubtitle) : void 0,
      aboutMessageIcon: aboutMessageIcon !== void 0 ? String(aboutMessageIcon) : void 0,
      developerName: developerName !== void 0 ? String(developerName) : void 0,
      developerRole: developerRole !== void 0 ? String(developerRole) : void 0,
      developerDescription: developerDescription !== void 0 ? String(developerDescription) : void 0,
      developerPhoto: developerPhoto !== void 0 ? String(developerPhoto) : void 0,
      developerTagline: developerTagline !== void 0 ? String(developerTagline) : void 0,
      developerSocialLinks: developerSocialLinks !== void 0 ? developerSocialLinks : void 0,
      aboutFooterTitle: aboutFooterTitle !== void 0 ? String(aboutFooterTitle) : void 0,
      aboutFooterSubtitle: aboutFooterSubtitle !== void 0 ? String(aboutFooterSubtitle) : void 0,
      aboutFooterTagline: aboutFooterTagline !== void 0 ? String(aboutFooterTagline) : void 0
    });
    res.json(updated);
  } catch (err) {
    console.error("Error saving site settings:", err);
    res.status(400).json({ error: err.message || "Failed to save site settings" });
  }
});
var handleUpdateAboutUs = (req, res) => {
  try {
    const user = req.user;
    if (user?.role !== "MAIN_ADMIN") {
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
        aboutFooterTagline
      } = req.body;
      const isDev = developerName !== void 0 || developerRole !== void 0 || developerDescription !== void 0 || developerPhoto !== void 0 || developerTagline !== void 0 || developerSocialLinks !== void 0;
      if (isDev && !perms.includes("EDIT_DEVELOPER")) {
        return res.status(403).json({ error: "Forbidden: Missing permission (EDIT_DEVELOPER)" });
      }
      const isAbout = aboutTitle !== void 0 || aboutDescription !== void 0 || brandName !== void 0 || brandTagline !== void 0 || brandLogo !== void 0 || aboutMessageTitle !== void 0 || aboutMessageSubtitle !== void 0 || aboutMessageIcon !== void 0 || aboutFooterTitle !== void 0 || aboutFooterSubtitle !== void 0 || aboutFooterTagline !== void 0;
      if (isAbout && !perms.includes("EDIT_ABOUT_US")) {
        return res.status(403).json({ error: "Forbidden: Missing permission (EDIT_ABOUT_US)" });
      }
    }
    const updated = updateSiteSettings(req.body);
    res.json(updated);
  } catch (err) {
    console.error("Error updating about us:", err);
    res.status(400).json({ error: err.message || "Failed to update about us" });
  }
};
app.put("/api/admin/about-us", requireAdminAuth, requireAnyPermission(["EDIT_ABOUT_US", "EDIT_DEVELOPER"]), handleUpdateAboutUs);
app.put("/api/about-us", requireAdminAuth, requireAnyPermission(["EDIT_ABOUT_US", "EDIT_DEVELOPER"]), handleUpdateAboutUs);
app.put("/api/admin/message", requireAdminAuth, requirePermission("EDIT_MESSAGE"), (req, res) => {
  try {
    const { messageTitle, messageContent } = req.body;
    const updated = updateSiteSettings({
      messageTitle: messageTitle !== void 0 ? String(messageTitle) : void 0,
      messageContent: messageContent !== void 0 ? String(messageContent) : void 0
    });
    res.json({
      messageTitle: updated.messageTitle,
      messageContent: updated.messageContent,
      updatedAt: updated.updatedAt
    });
  } catch (err) {
    console.error("Error updating admin message:", err);
    res.status(500).json({ error: "Failed to update message" });
  }
});
app.get("/api/messages", (req, res) => {
  try {
    const messages = getPublishedMessages();
    res.json(messages);
  } catch (err) {
    console.error("Error fetching public messages:", err);
    res.status(500).json({ error: "Failed to retrieve messages" });
  }
});
app.get("/api/admin/messages", requireAdminAuth, requireAnyPermission(["VIEW_MESSAGES", "ADD_MESSAGE", "EDIT_MESSAGE", "DELETE_MESSAGE", "PUBLISH_MESSAGE", "REORDER_MESSAGES", "MANAGE_MESSAGE_LINKS"]), (req, res) => {
  try {
    const messages = getMessages();
    res.json(messages);
  } catch (err) {
    console.error("Error fetching admin messages:", err);
    res.status(500).json({ error: "Failed to retrieve messages" });
  }
});
var handleCreateMessage = (req, res) => {
  try {
    const { title, content, isPublished, linkUrl, linkLabel } = req.body;
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Message title is required" });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Message content is required" });
    }
    if (req.user?.role !== "MAIN_ADMIN" && (linkUrl || linkLabel)) {
      if (!req.user?.permissions?.includes("MANAGE_MESSAGE_LINKS")) {
        return res.status(403).json({ error: "Forbidden: Missing permission (MANAGE_MESSAGE_LINKS)" });
      }
    }
    const created = createMessage({
      title: title.trim(),
      content: content.trim(),
      isPublished: typeof isPublished === "boolean" ? isPublished : true,
      linkUrl: linkUrl ? String(linkUrl).trim() : "",
      linkLabel: linkLabel ? String(linkLabel).trim() : ""
    });
    if (created.isPublished) {
      updateSiteSettings({
        messageTitle: created.title,
        messageContent: created.content
      });
    }
    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating message:", err);
    res.status(400).json({ error: err.message || "Failed to create message" });
  }
};
app.post("/api/admin/messages", requireAdminAuth, requirePermission("ADD_MESSAGE"), handleCreateMessage);
app.post("/api/messages", requireAdminAuth, requirePermission("ADD_MESSAGE"), handleCreateMessage);
var handleUpdateMessage = (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, isPublished, linkUrl, linkLabel, sortOrder } = req.body;
    if (title !== void 0 && (!title || !String(title).trim())) {
      return res.status(400).json({ error: "Message title cannot be empty" });
    }
    if (content !== void 0 && (!content || !String(content).trim())) {
      return res.status(400).json({ error: "Message content cannot be empty" });
    }
    if (req.user?.role !== "MAIN_ADMIN" && (linkUrl !== void 0 || linkLabel !== void 0)) {
      if (!req.user?.permissions?.includes("MANAGE_MESSAGE_LINKS")) {
        return res.status(403).json({ error: "Forbidden: Missing permission (MANAGE_MESSAGE_LINKS)" });
      }
    }
    const updated = updateMessage(id, {
      title: title !== void 0 ? String(title).trim() : void 0,
      content: content !== void 0 ? String(content).trim() : void 0,
      isPublished: typeof isPublished === "boolean" ? isPublished : void 0,
      linkUrl: linkUrl !== void 0 ? String(linkUrl).trim() : void 0,
      linkLabel: linkLabel !== void 0 ? String(linkLabel).trim() : void 0,
      sortOrder: typeof sortOrder === "number" ? sortOrder : void 0
    });
    if (!updated) {
      return res.status(404).json({ error: "Message not found" });
    }
    if (updated.isPublished) {
      updateSiteSettings({
        messageTitle: updated.title,
        messageContent: updated.content
      });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error updating message:", err);
    res.status(400).json({ error: err.message || "Failed to update message" });
  }
};
app.put("/api/admin/messages/:id", requireAdminAuth, requirePermission("EDIT_MESSAGE"), handleUpdateMessage);
app.put("/api/messages/:id", requireAdminAuth, requirePermission("EDIT_MESSAGE"), handleUpdateMessage);
var handlePublishMessage = (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;
    if (typeof isPublished !== "boolean") {
      return res.status(400).json({ error: "isPublished boolean is required" });
    }
    const updated = publishMessage(id, isPublished);
    if (!updated) {
      return res.status(404).json({ error: "Message not found" });
    }
    if (updated.isPublished) {
      updateSiteSettings({
        messageTitle: updated.title,
        messageContent: updated.content
      });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error publishing message:", err);
    res.status(500).json({ error: "Failed to update message publication status" });
  }
};
app.put("/api/admin/messages/:id/publish", requireAdminAuth, requirePermission("PUBLISH_MESSAGE"), handlePublishMessage);
app.put("/api/messages/:id/publish", requireAdminAuth, requirePermission("PUBLISH_MESSAGE"), handlePublishMessage);
var handleDeleteMessage = (req, res) => {
  try {
    const { id } = req.params;
    const success = deleteMessage(id);
    if (!success) {
      return res.status(404).json({ error: "Message not found" });
    }
    res.json({ success: true, message: "Message deleted successfully" });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).json({ error: "Failed to delete message" });
  }
};
app.delete("/api/admin/messages/:id", requireAdminAuth, requirePermission("DELETE_MESSAGE"), handleDeleteMessage);
app.delete("/api/messages/:id", requireAdminAuth, requirePermission("DELETE_MESSAGE"), handleDeleteMessage);
var handleReorderMessages = (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "Invalid ids array for reordering" });
    }
    reorderMessages(ids);
    res.json({ success: true, messages: getMessages() });
  } catch (err) {
    console.error("Error reordering messages:", err);
    res.status(500).json({ error: "Failed to reorder messages" });
  }
};
app.post("/api/admin/messages/reorder", requireAdminAuth, requirePermission("REORDER_MESSAGES"), handleReorderMessages);
app.post("/api/messages/reorder", requireAdminAuth, requirePermission("REORDER_MESSAGES"), handleReorderMessages);
app.get("/api/admin/team-members", requireAdminAuth, requireAnyPermission(["VIEW_ABOUT_US_TEAM", "EDIT_ABOUT_US", "EDIT_DEVELOPER", "ADD_TEAM_MEMBER", "EDIT_TEAM_MEMBER", "DELETE_TEAM_MEMBER", "MANAGE_TEAM_SOCIAL_LINKS", "REORDER_TEAM_MEMBERS"]), (req, res) => {
  try {
    const members = getTeamMembers();
    res.json(members);
  } catch (err) {
    console.error("Error fetching admin team members:", err);
    res.status(500).json({ error: "Failed to retrieve team members" });
  }
});
var handleCreateTeamMember = (req, res) => {
  try {
    const { name, role, description, photo, sortOrder, socialLinks } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Team member name is required" });
    }
    if (!role || typeof role !== "string" || !role.trim()) {
      return res.status(400).json({ error: "Team member role / designation is required" });
    }
    if (req.user?.role !== "MAIN_ADMIN" && Array.isArray(socialLinks) && socialLinks.length > 0) {
      if (!req.user?.permissions?.includes("MANAGE_TEAM_SOCIAL_LINKS")) {
        return res.status(403).json({ error: "Forbidden: Missing permission (MANAGE_TEAM_SOCIAL_LINKS)" });
      }
    }
    const created = createTeamMember({
      name: name.trim(),
      role: role.trim(),
      description: description ? String(description) : "",
      photo: photo ? String(photo) : "",
      sortOrder: typeof sortOrder === "number" ? sortOrder : void 0,
      socialLinks: Array.isArray(socialLinks) ? socialLinks : []
    });
    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating team member:", err);
    res.status(400).json({ error: err.message || "Failed to create team member" });
  }
};
app.post("/api/admin/team-members", requireAdminAuth, requirePermission("ADD_TEAM_MEMBER"), handleCreateTeamMember);
app.post("/api/team-members", requireAdminAuth, requirePermission("ADD_TEAM_MEMBER"), handleCreateTeamMember);
var handleUpdateTeamMember = (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, description, photo, sortOrder, socialLinks } = req.body;
    if (name !== void 0 && (!name || !String(name).trim())) {
      return res.status(400).json({ error: "Team member name cannot be empty" });
    }
    if (role !== void 0 && (!role || !String(role).trim())) {
      return res.status(400).json({ error: "Team member role cannot be empty" });
    }
    if (req.user?.role !== "MAIN_ADMIN" && socialLinks !== void 0) {
      if (!req.user?.permissions?.includes("MANAGE_TEAM_SOCIAL_LINKS")) {
        return res.status(403).json({ error: "Forbidden: Missing permission (MANAGE_TEAM_SOCIAL_LINKS)" });
      }
    }
    const updated = updateTeamMember(id, {
      name: name !== void 0 ? String(name).trim() : void 0,
      role: role !== void 0 ? String(role).trim() : void 0,
      description: description !== void 0 ? String(description) : void 0,
      photo: photo !== void 0 ? String(photo) : void 0,
      sortOrder: typeof sortOrder === "number" ? sortOrder : void 0,
      socialLinks: socialLinks !== void 0 ? socialLinks : void 0
    });
    if (!updated) {
      return res.status(404).json({ error: "Team member not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error updating team member:", err);
    res.status(400).json({ error: err.message || "Failed to update team member" });
  }
};
app.put("/api/admin/team-members/:id", requireAdminAuth, requirePermission("EDIT_TEAM_MEMBER"), handleUpdateTeamMember);
app.put("/api/team-members/:id", requireAdminAuth, requirePermission("EDIT_TEAM_MEMBER"), handleUpdateTeamMember);
var handleDeleteTeamMember = (req, res) => {
  try {
    const { id } = req.params;
    const success = deleteTeamMember(id);
    if (!success) {
      return res.status(404).json({ error: "Team member not found" });
    }
    res.json({ success: true, message: "Team member deleted" });
  } catch (err) {
    console.error("Error deleting team member:", err);
    res.status(500).json({ error: "Failed to delete team member" });
  }
};
app.delete("/api/admin/team-members/:id", requireAdminAuth, requirePermission("DELETE_TEAM_MEMBER"), handleDeleteTeamMember);
app.delete("/api/team-members/:id", requireAdminAuth, requirePermission("DELETE_TEAM_MEMBER"), handleDeleteTeamMember);
var handleReorderTeamMembers = (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "Invalid ids array for reordering" });
    }
    reorderTeamMembers(ids);
    res.json({ success: true, members: getTeamMembers() });
  } catch (err) {
    console.error("Error reordering team members:", err);
    res.status(500).json({ error: "Failed to reorder team members" });
  }
};
app.post("/api/admin/team-members/reorder", requireAdminAuth, requirePermission("REORDER_TEAM_MEMBERS"), handleReorderTeamMembers);
app.post("/api/team-members/reorder", requireAdminAuth, requirePermission("REORDER_TEAM_MEMBERS"), handleReorderTeamMembers);
app.get("/api/admin/achievements/message", requireAdminAuth, (req, res) => {
  try {
    const msg = getAchievementMessage();
    res.json(msg);
  } catch (err) {
    console.error("Error fetching admin achievement message:", err);
    res.status(500).json({ error: "Failed to retrieve achievement message" });
  }
});
app.put("/api/admin/achievements/message", requireAdminAuth, requireAnyPermission(["VIEW_DASHBOARD", "EDIT_ABOUT_US"]), (req, res) => {
  try {
    const { title, content } = req.body;
    const updated = updateAchievementMessage(
      title !== void 0 ? String(title) : void 0,
      content !== void 0 ? String(content) : void 0
    );
    res.json(updated);
  } catch (err) {
    console.error("Error updating achievement message:", err);
    res.status(500).json({ error: "Failed to update achievement message" });
  }
});
app.get("/api/admin/achievements", requireAdminAuth, (req, res) => {
  try {
    const achievements = getAdminAchievements();
    res.json(achievements);
  } catch (err) {
    console.error("Error fetching admin achievements:", err);
    res.status(500).json({ error: "Failed to retrieve achievements" });
  }
});
app.get("/api/admin/achievements/:id", requireAdminAuth, (req, res) => {
  try {
    const item = getAchievementById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Achievement not found" });
    }
    res.json(item);
  } catch (err) {
    console.error("Error fetching achievement:", err);
    res.status(500).json({ error: "Failed to retrieve achievement" });
  }
});
app.post("/api/admin/achievements", requireAdminAuth, requireAnyPermission(["VIEW_DASHBOARD", "EDIT_ABOUT_US"]), (req, res) => {
  try {
    const { imageUrl, comment, isPinned } = req.body;
    if (!imageUrl || !isValidImageUrl(imageUrl)) {
      return res.status(400).json({ error: "Valid achievement image is required (upload or URL)" });
    }
    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return res.status(400).json({ error: "Admin comment is required" });
    }
    const created = createAchievement(imageUrl.trim(), comment.trim(), Boolean(isPinned));
    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating achievement:", err);
    res.status(500).json({ error: "Failed to create achievement" });
  }
});
app.put("/api/admin/achievements/:id", requireAdminAuth, requireAnyPermission(["VIEW_DASHBOARD", "EDIT_ABOUT_US"]), (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl, comment, isPinned } = req.body;
    if (!imageUrl || !isValidImageUrl(imageUrl)) {
      return res.status(400).json({ error: "Valid achievement image is required (upload or URL)" });
    }
    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return res.status(400).json({ error: "Admin comment is required" });
    }
    const updated = updateAchievement(
      id,
      imageUrl.trim(),
      comment.trim(),
      isPinned !== void 0 ? Boolean(isPinned) : void 0
    );
    if (!updated) {
      return res.status(404).json({ error: "Achievement not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error updating achievement:", err);
    res.status(500).json({ error: "Failed to update achievement" });
  }
});
var handleToggleAchievementPin = (req, res) => {
  try {
    const { id } = req.params;
    const { isPinned } = req.body;
    const updated = toggleAchievementPin(
      id,
      typeof isPinned === "boolean" ? isPinned : void 0
    );
    if (!updated) {
      return res.status(404).json({ error: "Achievement not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error toggling pin on achievement:", err);
    res.status(500).json({ error: "Failed to update pin status" });
  }
};
app.patch("/api/admin/achievements/:id/pin", requireAdminAuth, requireAnyPermission(["VIEW_DASHBOARD", "EDIT_ABOUT_US"]), handleToggleAchievementPin);
app.post("/api/admin/achievements/:id/pin", requireAdminAuth, requireAnyPermission(["VIEW_DASHBOARD", "EDIT_ABOUT_US"]), handleToggleAchievementPin);
app.delete("/api/admin/achievements/:id", requireAdminAuth, requireAnyPermission(["VIEW_DASHBOARD", "EDIT_ABOUT_US"]), (req, res) => {
  try {
    const { id } = req.params;
    deleteAchievement(id);
    res.json({ success: true, message: "Achievement deleted successfully" });
  } catch (err) {
    console.error("Error deleting achievement:", err);
    res.status(500).json({ error: "Failed to delete achievement" });
  }
});
app.post("/api/webapps/:id/servers", requireAdminAuth, requirePermission("ADD_SERVER"), (req, res) => {
  try {
    const { id } = req.params;
    const appItem = getAdminWebAppById(id);
    if (!appItem) {
      return res.status(404).json({ error: "Web App not found" });
    }
    const { url, category } = req.body;
    if (!url || !isValidUrl(url.trim())) {
      return res.status(400).json({ error: "Valid URL is required" });
    }
    const validCategories = ["Working", "Error", "Some Error", "Unfilter", "Testing"];
    if (!category || !validCategories.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }
    const existingServers = appItem.servers.map((s) => ({
      id: s.id,
      url: s.url,
      category: s.category
    }));
    existingServers.push({ url: url.trim(), category });
    const updated = updateWebApp(id, appItem.name, appItem.icon, existingServers);
    res.status(201).json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to add server" });
  }
});
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.path} not found` });
});
var app_default = app;

// server/vercel.ts
process.env.IS_SERVERLESS = "1";
async function handler(req, res) {
  if (req.query) {
    const catchAll = req.query.all || req.query["...all"] || req.query.path;
    if (catchAll) {
      const slug = Array.isArray(catchAll) ? catchAll.join("/") : catchAll;
      if (slug && !req.url.includes(slug)) {
        req.url = `/api/${slug}`;
      }
    }
  }
  const forwardedUrl = req.headers?.["x-forwarded-url"] || req.headers?.["x-matched-path"] || req.headers?.["x-vercel-original-url"];
  if (forwardedUrl && forwardedUrl.startsWith("/api/") && (!req.url || req.url === "/" || !req.url.startsWith("/api/"))) {
    req.url = forwardedUrl.split("?")[0];
  }
  try {
    await ensureDbReady();
  } catch (err) {
    console.error("[Vercel API] Failed to initialize database:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Database initialization failed: " + (err?.message || "Internal Server Error") }));
      return;
    }
  }
  return app_default(req, res);
}

// server/vercel-me.ts
process.env.IS_SERVERLESS = "1";
async function handler2(req, res) {
  req.url = "/api/auth/me";
  return handler(req, res);
}
export {
  handler2 as default
};
