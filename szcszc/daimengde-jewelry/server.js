/**
 * 戴梦得珠宝 · 蓬莱振华专柜 — 静态网站服务器
 * public/ 目录下全部是预生成的 .html 文件
 * 管理端修改数据后自动重建静态文件
 */
const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ============ 依赖 ============
const store = require('./database/store');
const { rebuild } = require('./database/generator');

// 启动时首次生成静态网站
rebuild();

// ============ 中间件 ============
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'daimengde-static-site-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 12 * 60 * 60 * 1000, httpOnly: true }
}));

// 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${new Date().toLocaleTimeString()} ${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// ============ 静态文件服务器 ============
// public/ 下所有文件直接作为静态文件返回 — 无需模板引擎
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  etag: true,
  index: 'index.html',
  extensions: ['html'],
}));

// 分类筛选页的 URL 重写: /products?category=项链 → /products-项链.html
app.get('/products.html', (req, res, next) => {
  if (req.query.category) {
    const safe = req.query.category.replace(/\s+/g, '-');
    return res.redirect(`/products-${safe}.html`);
  }
  next();
});

// 产品详情 URL 重写: /product/:id → /product-:id.html
app.get('/product/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(404).redirect('/404.html');
  res.redirect(`/product-${id}.html`);
});

// ============ Admin 路由 (管理后台仍是动态的) ============
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 注入 site + session 到 admin 视图
app.use('/admin', (req, res, next) => {
  res.locals.session = req.session;
  const raw = store.getSiteSettings();
  res.locals.site = {
    name: raw.site_name || '戴梦得珠宝',
    subtitle: raw.site_subtitle || '',
    site_about: raw.site_about || '',
    site_contact: raw.site_contact || '',
    site_footer: raw.site_footer || '',
    site_name: raw.site_name || '戴梦得珠宝',
    site_subtitle: raw.site_subtitle || '',
  };
  next();
});

app.use('/admin', require('./routes/admin'));

// ============ 启动 ============
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   💎 戴梦得珠宝 — 静态网站             ║');
  console.log('║   蓬莱振华专柜                          ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║   首页:     http://localhost:${PORT}         ║`);
  console.log(`║   管理端:   http://localhost:${PORT}/admin/login ║`);
  console.log('║   账号: admin / admin123                ║');
  console.log('║   所有页面均为预生成的静态 .html 文件   ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});
