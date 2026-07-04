/**
 * 戴梦得珠宝 - SQLite 数据库层
 * 蓬莱振华专柜专用
 */
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'daimengde.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
  }
  return db;
}

// ============ 数据库迁移 ============
function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS posters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      image_path TEXT NOT NULL DEFAULT '',
      link TEXT DEFAULT '#',
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '项链',
      price REAL NOT NULL DEFAULT 0,
      original_price REAL DEFAULT 0,
      description TEXT DEFAULT '',
      image_path TEXT DEFAULT '/images/default.svg',
      featured INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // 种子数据
  seedIfEmpty(db);
}

function seedIfEmpty(db) {
  const adminCount = db.prepare('SELECT COUNT(*) as cnt FROM admins').get();
  if (adminCount.cnt === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', hash);
  }

  const settingsCount = db.prepare('SELECT COUNT(*) as cnt FROM site_settings').get();
  if (settingsCount.cnt === 0) {
    const insertSetting = db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');
    insertSetting.run('site_name', '戴梦得珠宝');
    insertSetting.run('site_subtitle', '蓬莱振华专柜 · 匠心传承 璀璨人生');
    insertSetting.run('site_about', '戴梦得珠宝蓬莱振华专柜，坐落于蓬莱市中心振华商厦一层。我们精选全球优质宝石，由资深工匠手工打造每一件作品，将东方美学与现代设计完美融合，为蓬莱市民提供高品质珠宝选购体验。');
    insertSetting.run('site_contact', '专柜电话：0535-5668888 | 地址：蓬莱市振华商厦一楼戴梦得珠宝专柜');
    insertSetting.run('site_footer', '© 2024 蓬莱振华戴梦得珠宝专柜. All rights reserved.');
  }

  const productCount = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
  if (productCount.cnt === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (name, category, price, original_price, description, image_path, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const products = [
      ['星月交辉 钻石项链', '项链', 12800, 16800, '18K白金镶嵌，主钻0.5克拉，环绕碎钻点缀如星河', '/images/default.svg', 1],
      ['永恒之约 铂金对戒', '戒指', 9600, 12800, 'PT950铂金对戒，内壁刻字定制，见证永恒爱情', '/images/default.svg', 1],
      ['花语心愿 宝石手链', '手链', 5800, 7200, '18K玫瑰金搭配天然红宝石，花朵造型优雅灵动', '/images/default.svg', 1],
      ['璀璨星辰 钻石耳钉', '耳饰', 4500, 5600, 'PT950铂金镶嵌，单颗0.3克拉，简约不失华贵', '/images/default.svg', 1],
      ['皇家蓝宝石 吊坠', '项链', 18600, 22800, '18K白金镶嵌斯里兰卡皇家蓝宝石，配镶碎钻', '/images/default.svg', 1],
      ['蝶恋花 宝石胸针', '胸针', 8200, 9800, '18K金底镶嵌彩色宝石，蝴蝶造型栩栩如生', '/images/default.svg', 1],
      ['珍珠泪 南洋耳坠', '耳饰', 3600, 4200, '18K金搭配南洋海水珍珠，水滴造型温婉动人', '/images/default.svg', 0],
      ['时光印记 镂空手镯', '手镯', 13800, 16800, '18K玫瑰金镂空雕花工艺，内圈可刻字', '/images/default.svg', 0],
      ['王冠之梦 钻石头饰', '头饰', 25800, 32800, 'PT950铂金全镶钻，手工打造，适合婚礼佩戴', '/images/default.svg', 0],
      ['幸运四叶草 祖母绿项链', '项链', 3200, 3800, '18K金四叶草造型镶嵌祖母绿，传递幸运与希望', '/images/default.svg', 0],
      ['玫瑰人生 玫瑰戒指', '戒指', 6500, 7800, '18K玫瑰金玫瑰造型戒指，花瓣镶碎钻点缀', '/images/default.svg', 0],
      ['海洋之心 蓝钻吊坠', '项链', 32000, 39800, 'PT950铂金镶嵌1克拉蓝钻，稀世珍品', '/images/default.svg', 1],
    ];
    const insertMany = db.transaction(() => {
      for (const p of products) insertProduct.run(...p);
    });
    insertMany();
  }

  const posterCount = db.prepare('SELECT COUNT(*) as cnt FROM posters').get();
  if (posterCount.cnt === 0) {
    const insertPoster = db.prepare(`
      INSERT INTO posters (title, image_path, link, active, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    const posters = [
      ['夏日璀璨 · 新品发布', '/uploads/default-poster-1.svg', '#products', 1, 1],
      ['婚嫁系列 · 专属定制', '/uploads/default-poster-2.svg', '#products', 1, 2],
      ['会员尊享 · 限时折扣', '/uploads/default-poster-3.svg', '#products', 1, 3],
    ];
    const insertMany = db.transaction(() => {
      for (const p of posters) insertPoster.run(...p);
    });
    insertMany();
  }
}

// ============ 查询接口 ============

// -- 海报 --
function getActivePosters() {
  return getDb().prepare('SELECT * FROM posters WHERE active = 1 ORDER BY sort_order').all();
}

function getAllPosters() {
  return getDb().prepare('SELECT * FROM posters ORDER BY sort_order').all();
}

function getPoster(id) {
  return getDb().prepare('SELECT * FROM posters WHERE id = ?').get(id);
}

function addPoster(data) {
  const stmt = getDb().prepare(`
    INSERT INTO posters (title, image_path, link, active, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(data.title, data.image_path, data.link || '#', data.active ? 1 : 0, data.sort_order || 99);
  return getPoster(result.lastInsertRowid);
}

function updatePoster(id, data) {
  const poster = getPoster(id);
  if (!poster) return null;
  const stmt = getDb().prepare(`
    UPDATE posters SET title=?, image_path=?, link=?, active=?, sort_order=?, updated_at=datetime('now','localtime')
    WHERE id=?
  `);
  stmt.run(
    data.title ?? poster.title,
    data.image_path ?? poster.image_path,
    data.link ?? poster.link,
    data.active !== undefined ? (data.active ? 1 : 0) : poster.active,
    data.sort_order ?? poster.sort_order,
    id
  );
  return getPoster(id);
}

function deletePoster(id) {
  return getDb().prepare('DELETE FROM posters WHERE id = ?').run(id);
}

// -- 产品 --
function getProducts() {
  return getDb().prepare('SELECT * FROM products ORDER BY featured DESC, id DESC').all();
}

function getFeaturedProducts() {
  return getDb().prepare('SELECT * FROM products WHERE featured = 1 ORDER BY id DESC LIMIT 12').all();
}

function getProduct(id) {
  return getDb().prepare('SELECT * FROM products WHERE id = ?').get(id);
}

function getProductsByCategory(category) {
  return getDb().prepare('SELECT * FROM products WHERE category = ? ORDER BY featured DESC, id DESC').all(category);
}

function getCategories() {
  return getDb().prepare('SELECT DISTINCT category FROM products ORDER BY category').all().map(r => r.category);
}

function addProduct(data) {
  const stmt = getDb().prepare(`
    INSERT INTO products (name, category, price, original_price, description, image_path, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.name, data.category, data.price,
    data.original_price || data.price,
    data.description || '', data.image_path || '/images/default.svg',
    data.featured ? 1 : 0
  );
  return getProduct(result.lastInsertRowid);
}

function updateProduct(id, data) {
  const product = getProduct(id);
  if (!product) return null;
  const stmt = getDb().prepare(`
    UPDATE products SET name=?, category=?, price=?, original_price=?,
    description=?, image_path=?, featured=?, updated_at=datetime('now','localtime')
    WHERE id=?
  `);
  stmt.run(
    data.name ?? product.name,
    data.category ?? product.category,
    data.price ?? product.price,
    data.original_price ?? product.original_price,
    data.description ?? product.description,
    data.image_path ?? product.image_path,
    data.featured !== undefined ? (data.featured ? 1 : 0) : product.featured,
    id
  );
  return getProduct(id);
}

function deleteProduct(id) {
  return getDb().prepare('DELETE FROM products WHERE id = ?').run(id);
}

// -- 站点设置 --
function getSiteSettings() {
  const rows = getDb().prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

function getSiteSetting(key) {
  const row = getDb().prepare('SELECT value FROM site_settings WHERE key = ?').get(key);
  return row ? row.value : '';
}

function updateSiteSetting(key, value) {
  getDb().prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run(key, value);
}

function updateSiteSettings(data) {
  const stmt = getDb().prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');
  const transaction = getDb().transaction(() => {
    for (const [key, value] of Object.entries(data)) {
      stmt.run(key, value);
    }
  });
  transaction();
}

// -- 管理员 --
function getAdmin(username) {
  return getDb().prepare('SELECT * FROM admins WHERE username = ?').get(username);
}

function updateAdminPassword(username, newHash) {
  return getDb().prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(newHash, username);
}

module.exports = {
  getDb,
  // Posters
  getActivePosters, getAllPosters, getPoster, addPoster, updatePoster, deletePoster,
  // Products
  getProducts, getFeaturedProducts, getProduct, getProductsByCategory, getCategories,
  addProduct, updateProduct, deleteProduct,
  // Settings
  getSiteSettings, getSiteSetting, updateSiteSetting, updateSiteSettings,
  // Admin
  getAdmin, updateAdminPassword,
};
