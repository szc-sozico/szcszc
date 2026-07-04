/**
 * 管理后台路由
 * 每次增删改后自动 rebuild() 更新静态网站
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const store = require('../database/store');
const { rebuild } = require('../database/generator');

// ============ 文件上传（存到 public/uploads/） ============
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'public', 'uploads'),
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, 'poster-' + safe + path.extname(file.originalname).toLowerCase());
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPG/PNG/GIF/WEBP/SVG'));
    }
  }
});

// ============ 鉴权 ============
function requireAuth(req, res, next) {
  if (req.session && req.session.adminLoggedIn) return next();
  return res.redirect('/admin/login');
}

// ============ 登录/登出 ============
router.get('/login', (req, res) => {
  if (req.session.adminLoggedIn) return res.redirect('/admin/dashboard');
  res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = store.getAdmin(username);
  if (admin && bcrypt.compareSync(password, admin.password_hash)) {
    req.session.adminLoggedIn = true;
    req.session.adminUsername = username;
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', { error: '用户名或密码错误' });
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ============ 管理后台仪表盘 ============
router.get('/dashboard', requireAuth, (req, res) => {
  res.render('admin/dashboard', {
    posters: store.getAllPosters(),
    products: store.getProducts(),
    categories: store.getCategories(),
    site: store.getSiteSettings(),
    msg: req.query.msg || null,
    err: req.query.err || null,
  });
});

// ============ 海报 CRUD (每次操作后重建静态站) ============

router.post('/poster/add', requireAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) throw new Error('请选择图片');
    store.addPoster({
      title: req.body.title || '新海报',
      image_path: '/uploads/' + req.file.filename,
      link: req.body.link || '#',
      sort_order: parseInt(req.body.sort_order) || 99,
      active: true,
    });
    rebuild();
    res.redirect('/admin/dashboard?msg=海报已上传，静态网站已更新');
  } catch (e) {
    res.redirect('/admin/dashboard?err=' + encodeURIComponent(e.message));
  }
});

router.post('/poster/toggle/:id', requireAuth, (req, res) => {
  const p = store.getPoster(parseInt(req.params.id));
  if (p) { store.updatePoster(p.id, { active: p.active ? 0 : 1 }); rebuild(); }
  res.redirect('/admin/dashboard?msg=状态已更新，静态网站已重建');
});

router.post('/poster/edit/:id', requireAuth, (req, res) => {
  store.updatePoster(parseInt(req.params.id), {
    title: req.body.title,
    link: req.body.link,
    sort_order: parseInt(req.body.sort_order) || 0,
  });
  rebuild();
  res.redirect('/admin/dashboard?msg=海报已更新，静态网站已重建');
});

router.post('/poster/replace-image/:id', requireAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) throw new Error('请选择图片');
    store.updatePoster(parseInt(req.params.id), { image_path: '/uploads/' + req.file.filename });
    rebuild();
    res.redirect('/admin/dashboard?msg=图片已替换，静态网站已更新');
  } catch (e) {
    res.redirect('/admin/dashboard?err=' + encodeURIComponent(e.message));
  }
});

router.post('/poster/delete/:id', requireAuth, (req, res) => {
  store.deletePoster(parseInt(req.params.id));
  rebuild();
  res.redirect('/admin/dashboard?msg=海报已删除，静态网站已重建');
});

// ============ 产品 CRUD ============

router.post('/product/add', requireAuth, (req, res) => {
  const { name, category, price, original_price, description, featured } = req.body;
  if (!name || !category || !price) {
    return res.redirect('/admin/dashboard?err=名称、分类、价格为必填#tab-products');
  }
  store.addProduct({
    name, category,
    price: parseFloat(price),
    original_price: parseFloat(original_price) || parseFloat(price),
    description: description || '',
    image_path: '/images/default.svg',
    featured: featured === 'on',
  });
  rebuild();
  res.redirect('/admin/dashboard?msg=产品已添加，静态网站已更新#tab-products');
});

router.post('/product/edit/:id', requireAuth, (req, res) => {
  const { name, category, price, original_price, description, featured } = req.body;
  if (!name || !category || !price) {
    return res.redirect('/admin/dashboard?err=名称、分类、价格为必填#tab-products');
  }
  store.updateProduct(parseInt(req.params.id), {
    name, category,
    price: parseFloat(price),
    original_price: parseFloat(original_price) || parseFloat(price),
    description: description || '',
    featured: featured === 'on',
  });
  rebuild();
  res.redirect('/admin/dashboard?msg=产品已更新，静态网站已重建#tab-products');
});

router.post('/product/delete/:id', requireAuth, (req, res) => {
  store.deleteProduct(parseInt(req.params.id));
  rebuild();
  res.redirect('/admin/dashboard?msg=产品已删除，静态网站已重建#tab-products');
});

// ============ 站点设置 ============
router.post('/site/update', requireAuth, (req, res) => {
  store.updateSiteSettings({
    site_name: req.body.site_name,
    site_subtitle: req.body.site_subtitle,
    site_about: req.body.site_about,
    site_contact: req.body.site_contact,
    site_footer: req.body.site_footer,
  });
  rebuild();
  res.redirect('/admin/dashboard?msg=站点信息已更新，静态网站已重建');
});

// ============ 修改密码 ============
router.post('/change-password', requireAuth, (req, res) => {
  const { old_password, new_password, confirm_password } = req.body;
  const admin = store.getAdmin(req.session.adminUsername);
  if (!bcrypt.compareSync(old_password, admin.password_hash)) {
    return res.redirect('/admin/dashboard?err=原密码错误');
  }
  if (new_password.length < 6) {
    return res.redirect('/admin/dashboard?err=新密码至少6位');
  }
  if (new_password !== confirm_password) {
    return res.redirect('/admin/dashboard?err=两次密码不一致');
  }
  store.updateAdminPassword(req.session.adminUsername, bcrypt.hashSync(new_password, 10));
  req.session.destroy(() => res.redirect('/admin/login?msg=密码已修改，请重新登录'));
});

// ============ 手动触发重建 ============
router.post('/rebuild', requireAuth, (req, res) => {
  rebuild();
  res.redirect('/admin/dashboard?msg=静态网站已手动重建');
});

module.exports = router;
