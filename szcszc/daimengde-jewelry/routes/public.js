/**
 * 公共路由 - 首页、产品、详情、关于
 */
const express = require('express');
const router = express.Router();
const store = require('../database/store');

// 首页
router.get('/', (req, res) => {
  const posters = store.getActivePosters();
  const featured = store.getFeaturedProducts();
  const categories = store.getCategories();
  res.render('index', { posters, featured, categories, currentPage: 'home' });
});

// 产品列表
router.get('/products', (req, res) => {
  const category = req.query.category || '';
  const categories = store.getCategories();
  let products;
  if (category) {
    products = store.getProductsByCategory(category);
  } else {
    products = store.getProducts();
  }
  res.render('products', { products, categories, activeCategory: category, currentPage: 'products' });
});

// 产品详情
router.get('/product/:id', (req, res) => {
  const product = store.getProduct(parseInt(req.params.id));
  if (!product) return res.status(404).render('404');
  const related = store.getProductsByCategory(product.category)
    .filter(p => p.id !== product.id)
    .slice(0, 4);
  res.render('product-detail', { product, related });
});

// 关于我们
router.get('/about', (req, res) => {
  res.render('about', { currentPage: 'about' });
});

module.exports = router;
