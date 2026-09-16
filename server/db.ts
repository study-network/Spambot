import dotenv from 'dotenv';
dotenv.config({ override: true });
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

    CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_perm ON admin_permissions(admin_id, permission);
    CREATE INDEX IF NOT EXISTS idx_other_admins_user ON other_admins(username);
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

      // Brand / About Us / Developer columns migration
      const brandCols: Array<{ name: string; type: string; defaultVal: string }> = [
        { name: 'brand_name', type: 'TEXT', defaultVal: "'LINK VERSE'" },
        { name: 'brand_tagline', type: 'TEXT', defaultVal: "'LEARN • EXPLORE • GROW'" },
        { name: 'brand_logo', type: 'TEXT', defaultVal: "''" },
        { name: 'about_message_title', type: 'TEXT', defaultVal: "'Knowledge shared is a brighter tomorrow.'" },
        { name: 'about_message_subtitle', type: 'TEXT', defaultVal: "'Stay Connected • Stay Curious • Stay Ahead'" },
        { name: 'about_message_icon', type: 'TEXT', defaultVal: "''" },
        { name: 'developer_name', type: 'TEXT', defaultVal: "'Ritesh'" },
        { name: 'developer_role', type: 'TEXT', defaultVal: "'Founder & Developer'" },
        { name: 'developer_description', type: 'TEXT', defaultVal: "''" },
        { name: 'developer_photo', type: 'TEXT', defaultVal: "''" },
        { name: 'developer_tagline', type: 'TEXT', defaultVal: "'Code • Create • Contribute • Grow'" },
        { name: 'developer_social_links', type: 'TEXT', defaultVal: "'[]'" },
        { name: 'about_footer_title', type: 'TEXT', defaultVal: "'Thanks for being a part of LINK VERSE.'" },
        { name: 'about_footer_subtitle', type: 'TEXT', defaultVal: "'Together, we can make learning simple, free and accessible for everyone.'" },
        { name: 'about_footer_tagline', type: 'TEXT', defaultVal: "'Keep Learning • Keep Exploring • Keep Growing'" },
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

      // Initialize default developer description if empty
      const defaultDevBio = "Hi! I'm the developer of LINK VERSE. I build this platform to make learning and resources easily accessible for everyone. My goal is to create a simple, fast and helpful platform for students and learners.";
      const devBioCheck = db.prepare(`SELECT developer_description FROM site_settings LIMIT 1`);
      if (devBioCheck.step()) {
        const val = devBioCheck.get();
        if (!val[0] || String(val[0]).trim() === '') {
          db.run(`UPDATE site_settings SET developer_description = ? WHERE id = (SELECT id FROM site_settings LIMIT 1)`, [defaultDevBio]);
          console.log('[Database] Initialized default developer description');
        }
      }
      devBioCheck.free();

      // Initialize default developer social links if currently empty or '[]'
      const devSocialCheck = db.prepare(`SELECT developer_social_links FROM site_settings LIMIT 1`);
      if (devSocialCheck.step()) {
        const val = devSocialCheck.get();
        if (!val[0] || String(val[0]).trim() === '' || String(val[0]).trim() === '[]') {
          const defaultDevSocials = JSON.stringify([
            { id: 'dev-1', platform: 'telegram', url: 'https://t.me/ritesh' },
            { id: 'dev-2', platform: 'whatsapp', url: 'https://wa.me/919876543210' },
            { id: 'dev-3', platform: 'instagram', url: 'https://instagram.com/ritesh' },
            { id: 'dev-4', platform: 'youtube', url: 'https://youtube.com/@ritesh' },
            { id: 'dev-5', platform: 'github', url: 'https://github.com/ritesh' },
          ]);
          db.run(`UPDATE site_settings SET developer_social_links = ? WHERE id = (SELECT id FROM site_settings LIMIT 1)`, [defaultDevSocials]);
          console.log('[Database] Initialized default developer social links');
        }
      }
      devSocialCheck.free();

      // Populate default message content if it's empty so the user sees the example immediately
      const defaultExampleMsg = `📚 Stay consistent and keep learning every day.\n🚫 Do not misuse or share restricted links.\n💡 Use this platform only for educational purposes.\n❤️ Keep learning and stay motivated!`;
      const currentMsgStmt = db.prepare(`SELECT message_content FROM site_settings LIMIT 1`);
      if (currentMsgStmt.step()) {
        const existingVal = currentMsgStmt.get();
        if (!existingVal[0] || String(existingVal[0]).trim() === '') {
          db.run(`UPDATE site_settings SET message_title = 'Important Message', message_content = ? WHERE id = (SELECT id FROM site_settings LIMIT 1)`, [defaultExampleMsg]);
          console.log('[Database] Initialized default example message in site_settings');
        }
      }
      currentMsgStmt.free();
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

  // Seed default achievement message if table exists but empty
  try {
    const msgCheck = db.exec(`SELECT id FROM achievement_message WHERE id = 'default' LIMIT 1`);
    if (msgCheck.length === 0 || msgCheck[0].values.length === 0) {
      const defaultAchievementMsg = `Keep working hard and stay consistent.\nYour hard work will definitely pay off.\nNever give up on your goals.\nKeep learning and improving every day. ❤️`;
      const mStmt = db.prepare(`
        INSERT INTO achievement_message (id, title, content, updated_at)
        VALUES ('default', 'Important Message', ?, ?)
      `);
      mStmt.run([defaultAchievementMsg, new Date().toISOString()]);
      mStmt.free();
      saveDb();
      console.log('[Database] Seeded default achievement message');
    }
  } catch (msgErr) {
    console.warn('[Database] achievement_message seed notice:', msgErr);
  }

  // Seed default admin accounts from environment variables (.env)
  const envAdminId = (process.env.ADMIN_ID || process.env.ADMIN_USERNAME || '').toLowerCase().trim();
  const envEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const envPass = process.env.ADMIN_PASSWORD;

  const seedUsers: Array<{ email: string; pass: string }> = [
    { email: 'admin', pass: 'admin' },
    { email: 'admin@example.com', pass: 'Admin@123456' },
    { email: 'admin10@gmail.com', pass: 'admin' },
  ];

  if (envAdminId && envPass) {
    const existing = seedUsers.find(u => u.email === envAdminId);
    if (existing) {
      existing.pass = envPass;
    } else {
      seedUsers.unshift({ email: envAdminId, pass: envPass });
    }
  }

  if (envEmail && envPass) {
    const existing = seedUsers.find(u => u.email === envEmail);
    if (existing) {
      existing.pass = envPass;
    } else {
      seedUsers.unshift({ email: envEmail, pass: envPass });
    }
  }

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
      const sStmt = db!.prepare(`INSERT INTO servers (id, web_app_id, url, category, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`);
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
      const sStmt = db!.prepare(`INSERT INTO servers (id, web_app_id, url, category, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`);
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
      const sStmt = db!.prepare(`INSERT INTO servers (id, web_app_id, url, category, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`);
      sStmt.run([crypto.randomUUID(), toolsId, s.url, s.category, idx + 1, now, now]);
      sStmt.free();
    });
  }

  // Seed site settings if empty
  const settingsCheck = db.exec(`SELECT id FROM site_settings LIMIT 1`);
  if (settingsCheck.length === 0 || settingsCheck[0].values.length === 0) {
    const now = new Date().toISOString();
    const sId = 'default_settings';
    const stmt = db.prepare(`
      INSERT INTO site_settings (
        id, telegram_url, whatsapp_url, about_title, about_description, happy_title, happy_message, happy_icon, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      sId,
      'https://t.me/example',
      'https://wa.me/example',
      'About Us',
      'Welcome to Web App Link Manager. We provide verified multi-server link routing with real-time status indicators, high-speed failover, and zero downtime connection to your favourite web applications.',
      'Stay Happy',
      'Good things take time 💜',
      '💜',
      now,
      now,
    ]);
    stmt.free();
    console.log('[Database] Initialized default site settings');
  }

  // Seed sample achievements if table is empty
  const achieveCheck = db.exec(`SELECT id FROM achievements LIMIT 1`);
  if (achieveCheck.length === 0 || achieveCheck[0].values.length === 0) {
    console.log('[Database] Seeding initial sample achievements...');
    const samples = [
      {
        id: crypto.randomUUID(),
        imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=80',
        comment: 'Congratulations Ritesh! 🎉\nYour hard work and consistency have paid off.\nKeep learning and keep growing. You can achieve even more...\nProud of you! ❤️',
        createdAt: '2025-06-20T10:00:00.000Z',
      },
      {
        id: crypto.randomUUID(),
        imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1000&q=80',
        comment: 'Small steps every day make a big difference.\nStay consistent and keep moving forward! 💪',
        createdAt: '2025-06-15T10:00:00.000Z',
      },
      {
        id: crypto.randomUUID(),
        imageUrl: 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?auto=format&fit=crop&w=1000&q=80',
        comment: 'Keep going!\nSuccess is a journey, not a destination. ❤️',
        createdAt: '2025-06-10T10:00:00.000Z',
      },
    ];

    for (const sample of samples) {
      const aStmt = db.prepare(`
        INSERT INTO achievements (id, image_url, comment, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      aStmt.run([sample.id, sample.imageUrl, sample.comment, sample.createdAt, sample.createdAt]);
      aStmt.free();
    }
    console.log('[Database] Initialized default sample achievements');
  }

  // Seed sample team members if table is empty
  const teamCheck = db.exec(`SELECT id FROM team_members LIMIT 1`);
  if (teamCheck.length === 0 || teamCheck[0].values.length === 0) {
    console.log('[Database] Seeding initial sample team members...');
    const now = new Date().toISOString();
    const defaultMembers = [
      {
        id: 'team-1',
        name: 'Ritesh',
        role: 'Founder & Developer',
        description: 'A passionate developer who loves to build useful learning tools for everyone.',
        photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
        sortOrder: 1,
        socialLinks: [
          { id: 't-1-1', platform: 'telegram', url: 'https://t.me/ritesh' },
          { id: 't-1-2', platform: 'github', url: 'https://github.com/ritesh' },
          { id: 't-1-3', platform: 'youtube', url: 'https://youtube.com/@ritesh' },
        ],
      },
      {
        id: 'team-2',
        name: 'Aman',
        role: 'Backend Support',
        description: 'Backend architect specializing in distributed servers and secure link routing.',
        photo: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
        sortOrder: 2,
        socialLinks: [
          { id: 't-2-1', platform: 'github', url: 'https://github.com/aman' },
          { id: 't-2-2', platform: 'linkedin', url: 'https://linkedin.com/in/aman' },
        ],
      },
      {
        id: 'team-3',
        name: 'Priya',
        role: 'UI/UX Designer',
        description: 'Creative product designer shaping clean, accessible interfaces for students.',
        photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
        sortOrder: 3,
        socialLinks: [
          { id: 't-3-1', platform: 'instagram', url: 'https://instagram.com/priya' },
          { id: 't-3-2', platform: 'linkedin', url: 'https://linkedin.com/in/priya' },
        ],
      },
      {
        id: 'team-4',
        name: 'Sahil',
        role: 'Content Manager',
        description: 'Content manager curating verified resources and educational links.',
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
        sortOrder: 4,
        socialLinks: [], // No social links, exactly matching screenshot!
      },
    ];

    for (const member of defaultMembers) {
      const tmStmt = db.prepare(`
        INSERT INTO team_members (id, name, role, description, photo, sort_order, social_links, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      tmStmt.run([
        member.id,
        member.name,
        member.role,
        member.description,
        member.photo,
        member.sortOrder,
        JSON.stringify(member.socialLinks),
        now,
        now,
      ]);
      tmStmt.free();
    }
    console.log('[Database] Initialized default sample team members');
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
      aboutDescription: 'Welcome to Web App Link Manager. Safe and fast access to your favorite web applications.',
      happyTitle: 'Stay Happy',
      happyMessage: 'Good things take time 💜',
      happyIcon: '💜',
      messageTitle: 'Important Message',
      messageContent: '📚 Stay consistent and keep learning every day.\n🚫 Do not misuse or share restricted links.\n💡 Use this platform only for educational purposes.\n❤️ Keep learning and stay motivated!',
      brandName: 'LINK VERSE',
      brandTagline: 'LEARN • EXPLORE • GROW',
      brandLogo: '',
      aboutMessageTitle: 'Knowledge shared is a brighter tomorrow.',
      aboutMessageSubtitle: 'Stay Connected • Stay Curious • Stay Ahead',
      aboutMessageIcon: '',
      developerName: 'Ritesh',
      developerRole: 'Founder & Developer',
      developerDescription: "Hi! I'm the developer of LINK VERSE. I build this platform to make learning and resources easily accessible for everyone. My goal is to create a simple, fast and helpful platform for students and learners.",
      developerPhoto: '',
      developerTagline: 'Code • Create • Contribute • Grow',
      developerSocialLinks: [
        { id: 'dev-1', platform: 'telegram', url: 'https://t.me/ritesh' },
        { id: 'dev-2', platform: 'whatsapp', url: 'https://wa.me/919876543210' },
        { id: 'dev-3', platform: 'instagram', url: 'https://instagram.com/ritesh' },
        { id: 'dev-4', platform: 'youtube', url: 'https://youtube.com/@ritesh' },
        { id: 'dev-5', platform: 'github', url: 'https://github.com/ritesh' },
      ],
      aboutFooterTitle: 'Thanks for being a part of LINK VERSE.',
      aboutFooterSubtitle: 'Together, we can make learning simple, free and accessible for everyone.',
      aboutFooterTagline: 'Keep Learning • Keep Exploring • Keep Growing',
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
    happyMessage: String(row[6] || 'Good things take time 💜'),
    happyIcon: String(row[7] || '💜'),
    messageTitle: String(row[8] ?? 'Important Message'),
    messageContent: String(row[9] ?? ''),
    brandName: String(row[10] || 'LINK VERSE'),
    brandTagline: String(row[11] || 'LEARN • EXPLORE • GROW'),
    brandLogo: String(row[12] || ''),
    aboutMessageTitle: String(row[13] || 'Knowledge shared is a brighter tomorrow.'),
    aboutMessageSubtitle: String(row[14] || 'Stay Connected • Stay Curious • Stay Ahead'),
    aboutMessageIcon: String(row[15] || ''),
    developerName: String(row[16] || 'Ritesh'),
    developerRole: String(row[17] || 'Founder & Developer'),
    developerDescription: String(row[18] || "Hi! I'm the developer of LINK VERSE. I build this platform to make learning and resources easily accessible for everyone. My goal is to create a simple, fast and helpful platform for students and learners."),
    developerPhoto: String(row[19] || ''),
    developerTagline: String(row[20] || 'Code • Create • Contribute • Grow'),
    developerSocialLinks: Array.isArray(devLinks) ? devLinks : [],
    aboutFooterTitle: String(row[22] || 'Thanks for being a part of LINK VERSE.'),
    aboutFooterSubtitle: String(row[23] || 'Together, we can make learning simple, free and accessible for everyone.'),
    aboutFooterTagline: String(row[24] || 'Keep Learning • Keep Exploring • Keep Growing'),
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

  const brandName = payload.brandName !== undefined ? payload.brandName.trim() : (existing.brandName || 'LINK VERSE');
  const brandTagline = payload.brandTagline !== undefined ? payload.brandTagline.trim() : (existing.brandTagline || 'LEARN • EXPLORE • GROW');
  const brandLogo = payload.brandLogo !== undefined ? payload.brandLogo.trim() : (existing.brandLogo || '');
  const aboutMessageTitle = payload.aboutMessageTitle !== undefined ? payload.aboutMessageTitle.trim() : (existing.aboutMessageTitle || 'Knowledge shared is a brighter tomorrow.');
  const aboutMessageSubtitle = payload.aboutMessageSubtitle !== undefined ? payload.aboutMessageSubtitle.trim() : (existing.aboutMessageSubtitle || 'Stay Connected • Stay Curious • Stay Ahead');
  const aboutMessageIcon = payload.aboutMessageIcon !== undefined ? payload.aboutMessageIcon.trim() : (existing.aboutMessageIcon || '');
  const developerName = payload.developerName !== undefined ? payload.developerName.trim() : (existing.developerName || 'Ritesh');
  const developerRole = payload.developerRole !== undefined ? payload.developerRole.trim() : (existing.developerRole || 'Founder & Developer');
  const developerDescription = payload.developerDescription !== undefined ? payload.developerDescription.trim() : (existing.developerDescription || '');
  const developerPhoto = payload.developerPhoto !== undefined ? payload.developerPhoto.trim() : (existing.developerPhoto || '');
  const developerTagline = payload.developerTagline !== undefined ? payload.developerTagline.trim() : (existing.developerTagline || 'Code • Create • Contribute • Grow');
  
  let developerSocialLinksStr = JSON.stringify(existing.developerSocialLinks || []);
  if (payload.developerSocialLinks !== undefined) {
    const cleaned = cleanAndValidateSocialLinks(payload.developerSocialLinks);
    if (!cleaned.valid) {
      throw new Error(cleaned.error || 'Invalid developer social links');
    }
    developerSocialLinksStr = JSON.stringify(cleaned.links);
  }

  const aboutFooterTitle = payload.aboutFooterTitle !== undefined ? payload.aboutFooterTitle.trim() : (existing.aboutFooterTitle || 'Thanks for being a part of LINK VERSE.');
  const aboutFooterSubtitle = payload.aboutFooterSubtitle !== undefined ? payload.aboutFooterSubtitle.trim() : (existing.aboutFooterSubtitle || 'Together, we can make learning simple, free and accessible for everyone.');
  const aboutFooterTagline = payload.aboutFooterTagline !== undefined ? payload.aboutFooterTagline.trim() : (existing.aboutFooterTagline || 'Keep Learning • Keep Exploring • Keep Growing');

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
      happyMessage || 'Good things take time 💜',
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
      happyMessage || 'Good things take time 💜',
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

