/**
 * 静态网站生成器
 * 从 SQLite 读取数据 → 生成纯 HTML 文件到 public/
 * 每次管理员修改数据后调用 rebuild() 即可更新全站
 */
const fs = require('fs');
const path = require('path');
const store = require('./store');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ============ HTML 工具函数 ============
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function siteHeader(site, currentPage) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${currentPage ? esc(currentPage) + ' - ' : ''}${esc(site.name)}</title>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700;900&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
</head>
<body>
  <header class="site-header">
    <div class="header-top">
      <div class="container">
        <span class="header-contact">${esc(site.site_contact)}</span>
      </div>
    </div>
    <div class="header-main">
      <div class="container">
        <a href="/" class="logo">
          <span class="logo-text">${esc(site.name)}</span>
          <span class="logo-sub">${esc(site.subtitle)}</span>
        </a>
        <nav class="main-nav">
          <a href="/" class="${currentPage === 'home' ? 'active' : ''}">首页</a>
          <a href="/products.html" class="${currentPage === 'products' ? 'active' : ''}">全部产品</a>
          <a href="/about.html" class="${currentPage === 'about' ? 'active' : ''}">关于我们</a>
          <a href="/admin/login" class="nav-admin-link">管理入口</a>
        </nav>
        <button class="mobile-menu-btn" onclick="document.querySelector('.main-nav').classList.toggle('open')">☰</button>
      </div>
    </div>
  </header>
  <main>`;
}

function siteFooter(site) {
  return `  </main>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <h3>${esc(site.name)}</h3>
          <p>${esc(site.site_about)}</p>
        </div>
        <div class="footer-col">
          <h3>快速导航</h3>
          <a href="/">首页</a>
          <a href="/products.html">全部产品</a>
          <a href="/about.html">关于我们</a>
        </div>
        <div class="footer-col">
          <h3>联系我们</h3>
          <p>${esc(site.site_contact)}</p>
        </div>
      </div>
      <div class="footer-bottom">
        <p>${esc(site.site_footer)}</p>
      </div>
    </div>
  </footer>
  <script src="/js/main.js"></script>
</body>
</html>`;
}

// ============ HTML 组件 ============

function productCard(p) {
  const discount = p.original_price > p.price;
  return `
      <div class="product-card">
        <a href="/product-${p.id}.html">
          <div class="product-image">
            <div class="img-placeholder" data-cat="${esc(p.category)}">
              <span class="img-label">${esc(p.category)}</span>
            </div>
            ${discount ? '<span class="badge-sale">限时优惠</span>' : ''}
          </div>
          <div class="product-info">
            <h3>${esc(p.name)}</h3>
            <p class="product-desc">${esc(p.description).substring(0, 35)}...</p>
            <div class="product-price">
              <span class="price-current">¥${p.price.toLocaleString()}</span>
              ${discount ? `<span class="price-original">¥${p.original_price.toLocaleString()}</span>` : ''}
            </div>
          </div>
        </a>
      </div>`;
}

function carouselHTML(posters, site) {
  if (posters.length === 0) {
    return `
  <section class="hero-carousel">
    <div class="carousel-container">
      <div class="carousel-slide active">
        <div class="slide-content" style="background:linear-gradient(135deg,#1a1a2e,#16213e);">
          <div class="slide-overlay">
            <h2>${esc(site.name)}</h2>
            <p>${esc(site.subtitle)}</p>
          </div>
        </div>
      </div>
    </div>
  </section>`;
  }
  let slides = posters.map((p, i) => `
    <div class="carousel-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
      <a href="${esc(p.link)}">
        <div class="slide-content" style="background-image:url('${esc(p.image_path)}');">
          <div class="slide-overlay">
            <h2>${esc(p.title)}</h2>
          </div>
        </div>
      </a>
    </div>`).join('');

  let dots = posters.map((_, i) =>
    `<span class="dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></span>`
  ).join('');

  let btns = posters.length > 1 ? `
    <button class="carousel-btn prev" onclick="changeSlide(-1)">❮</button>
    <button class="carousel-btn next" onclick="changeSlide(1)">❯</button>
    <div class="carousel-dots">${dots}</div>` : '';

  return `
  <section class="hero-carousel">
    <div class="carousel-container">
      ${slides}
      ${btns}
    </div>
  </section>`;
}

// ============ 页面生成函数 ============

function buildIndex(site, posters, featured, categories) {
  let cards = featured.map(p => productCard(p)).join('');
  let catCards = categories.map(c =>
    `<a href="/products.html?category=${encodeURIComponent(c)}" class="category-card"><span class="cat-name">${esc(c)}</span></a>`
  ).join('');

  return siteHeader(site, 'home') + `
${carouselHTML(posters, site)}

  <section class="brand-intro">
    <div class="container">
      <h2 class="section-title">匠心传承 · 璀璨人生</h2>
      <p class="brand-text">${esc(site.site_about)}</p>
    </div>
  </section>

  <section class="featured-products">
    <div class="container">
      <h2 class="section-title">精选臻品</h2>
      <div class="product-grid">${cards}</div>
      <div class="text-center mt-40">
        <a href="/products.html" class="btn-gold">查看全部产品 →</a>
      </div>
    </div>
  </section>

  <section class="category-section">
    <div class="container">
      <h2 class="section-title">产品分类</h2>
      <div class="category-grid">${catCards}</div>
    </div>
  </section>
` + siteFooter(site);
}

function buildProducts(site, products, categories, activeCategory) {
  let filterTags = '<a href="/products.html" class="filter-tag' + (!activeCategory ? ' active' : '') + '">全部</a>';
  for (const cat of categories) {
    filterTags += `<a href="/products.html?category=${encodeURIComponent(cat)}" class="filter-tag${activeCategory === cat ? ' active' : ''}">${esc(cat)}</a>`;
  }

  if (products.length === 0) {
    return siteHeader(site, 'products') + `
  <section class="products-page">
    <div class="container">
      <h2 class="section-title">${esc(activeCategory || '全部产品')}</h2>
      <div class="category-filter">${filterTags}</div>
      <p class="empty-msg">该分类暂无产品</p>
    </div>
  </section>
` + siteFooter(site);
  }

  let cards = products.map(p => productCard(p)).join('');
  return siteHeader(site, 'products') + `
  <section class="products-page">
    <div class="container">
      <h2 class="section-title">${esc(activeCategory || '全部产品')}</h2>
      <div class="category-filter">${filterTags}</div>
      <div class="product-grid">${cards}</div>
    </div>
  </section>
` + siteFooter(site);
}

function buildProductDetail(site, product, related) {
  const discount = product.original_price > product.price;
  const discountTag = discount
    ? `<span class="price-original">¥${product.original_price.toLocaleString()}</span>
          <span class="tag-discount">省 ¥${(product.original_price - product.price).toLocaleString()}</span>`
    : '';

  let relatedCards = '';
  if (related.length > 0) {
    relatedCards = `
    <div class="related-section">
      <h2 class="section-title">相关推荐</h2>
      <div class="product-grid">
        ${related.map(rp => `
        <div class="product-card">
          <a href="/product-${rp.id}.html">
            <div class="product-image">
              <div class="img-placeholder" data-cat="${esc(rp.category)}">
                <span class="img-label">${esc(rp.category)}</span>
              </div>
            </div>
            <div class="product-info">
              <h3>${esc(rp.name)}</h3>
              <div class="product-price">
                <span class="price-current">¥${rp.price.toLocaleString()}</span>
              </div>
            </div>
          </a>
        </div>`).join('')}
      </div>
    </div>`;
  }

  return siteHeader(site, '') + `
  <section class="detail-page">
    <div class="container">
      <div class="detail-grid">
        <div class="detail-image">
          <div class="img-placeholder large" data-cat="${esc(product.category)}">
            <span class="img-label">${esc(product.category)}</span>
          </div>
        </div>
        <div class="detail-info">
          <p class="detail-cat">${esc(product.category)}</p>
          <h1>${esc(product.name)}</h1>
          <p class="detail-desc">${esc(product.description)}</p>
          <div class="detail-price">
            <span class="price-current large">¥${product.price.toLocaleString()}</span>
            ${discountTag}
          </div>
          <div class="detail-actions">
            <button class="btn-gold" onclick="alert('感谢关注！欢迎莅临蓬莱振华商厦一楼戴梦得专柜选购。\\n专柜电话：0535-5668888')">立即咨询</button>
            <button class="btn-outline" onclick="history.back()">返回</button>
          </div>
          <div class="detail-meta">
            <p>📍 蓬莱振华商厦一楼戴梦得珠宝专柜</p>
            <p>📞 0535-5668888</p>
          </div>
        </div>
      </div>
      ${relatedCards}
    </div>
  </section>
` + siteFooter(site);
}

function buildAbout(site) {
  return siteHeader(site, 'about') + `
  <section class="about-page">
    <div class="container">
      <h1 class="section-title">关于我们</h1>
      <div class="about-grid">
        <div class="about-text">
          <h3>蓬莱振华 · 戴梦得珠宝专柜</h3>
          <p>${esc(site.site_about)}</p>
          <br>
          <h4>品牌使命</h4>
          <p>戴梦得珠宝致力于将东方美学与现代珠宝设计完美融合，为蓬莱及周边地区的顾客打造独一无二的璀璨时刻。</p>
          <br>
          <h4>品质保障</h4>
          <p>所有产品均采用天然宝石与贵金属材质，由资深工匠手工打造。提供完善的检测证书与售后服务，让您购买无忧。</p>
          <br>
          <h4>门店地址</h4>
          <p>蓬莱市振华商厦一层 · 戴梦得珠宝专柜<br>营业时间：9:00 - 21:00</p>
        </div>
        <div class="about-sidebar">
          <div class="about-card">
            <h4>联系方式</h4>
            <p>${esc(site.site_contact)}</p>
          </div>
          <div class="about-card">
            <h4>售后服务</h4>
            <p>免费清洗保养<br>终身维修服务<br>以旧换新活动</p>
          </div>
        </div>
      </div>
    </div>
  </section>
` + siteFooter(site);
}

function build404(site) {
  return siteHeader(site, '') + `
  <section style="text-align:center;padding:100px 20px;min-height:50vh;">
    <div style="font-size:100px;color:#c9a96e;font-family:'Noto Serif SC',serif;">404</div>
    <p style="font-size:18px;color:#666;margin:20px 0;">抱歉，您访问的页面不存在</p>
    <a href="/" class="btn-gold">返回首页</a>
  </section>
` + siteFooter(site);
}

// ============ 主入口 ============
function rebuild() {
  ensureDir(PUBLIC_DIR);
  ensureDir(path.join(PUBLIC_DIR, 'uploads'));
  ensureDir(path.join(PUBLIC_DIR, 'css'));
  ensureDir(path.join(PUBLIC_DIR, 'js'));
  ensureDir(path.join(PUBLIC_DIR, 'images'));

  const siteRaw = store.getSiteSettings();
  const site = {
    name: siteRaw.site_name || '戴梦得珠宝',
    subtitle: siteRaw.site_subtitle || '',
    site_about: siteRaw.site_about || '',
    site_contact: siteRaw.site_contact || '',
    site_footer: siteRaw.site_footer || '',
  };

  const posters = store.getActivePosters();
  const products = store.getProducts();
  const categories = store.getCategories();
  const featured = store.getFeaturedProducts();

  // 首页
  fs.writeFileSync(path.join(PUBLIC_DIR, 'index.html'), buildIndex(site, posters, featured, categories), 'utf8');

  // 产品列表页（全部）
  fs.writeFileSync(path.join(PUBLIC_DIR, 'products.html'), buildProducts(site, products, categories, ''), 'utf8');

  // 按分类的产品列表页
  for (const cat of categories) {
    const catProducts = store.getProductsByCategory(cat);
    const safeName = cat.replace(/\s+/g, '-');
    fs.writeFileSync(path.join(PUBLIC_DIR, `products-${safeName}.html`), buildProducts(site, catProducts, categories, cat), 'utf8');
  }

  // 产品详情页
  for (const p of products) {
    const related = store.getProductsByCategory(p.category).filter(r => r.id !== p.id).slice(0, 4);
    fs.writeFileSync(path.join(PUBLIC_DIR, `product-${p.id}.html`), buildProductDetail(site, p, related), 'utf8');
  }

  // 关于
  fs.writeFileSync(path.join(PUBLIC_DIR, 'about.html'), buildAbout(site), 'utf8');

  // 404
  fs.writeFileSync(path.join(PUBLIC_DIR, '404.html'), build404(site), 'utf8');

  console.log(`✅ 静态网站已生成 → ${PUBLIC_DIR}/`);
  console.log(`   首页: index.html`);
  console.log(`   产品: ${products.length} 件 (含详情页)`);
  console.log(`   海报: ${posters.length} 张`);
}

// 直接运行则重建
if (require.main === module) {
  rebuild();
}

module.exports = { rebuild };
