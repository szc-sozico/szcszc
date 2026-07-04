/**
 * 戴梦得珠宝 · 前端交互
 * 轮播图 · 滚动动画 · 移动端菜单
 */
(function() {
  let currentSlide = 0;
  let slides, dots;
  let autoTimer;

  function initCarousel() {
    slides = document.querySelectorAll('.carousel-slide');
    dots = document.querySelectorAll('.dot');
    if (slides.length <= 1) return;
    showSlide(0);
    startAuto();
  }

  function showSlide(i) {
    if (!slides.length) return;
    slides.forEach(s => s.classList.remove('active'));
    if (dots.length) dots.forEach(d => d.classList.remove('active'));
    slides[i].classList.add('active');
    if (dots[i]) dots[i].classList.add('active');
    currentSlide = i;
  }

  window.changeSlide = function(dir) {
    if (!slides.length) return;
    const next = (currentSlide + dir + slides.length) % slides.length;
    showSlide(next);
    resetAuto();
  };

  window.goToSlide = function(i) {
    showSlide(i);
    resetAuto();
  };

  function startAuto() {
    if (slides.length <= 1) return;
    autoTimer = setInterval(function() { changeSlide(1); }, 5000);
  }

  function resetAuto() {
    clearInterval(autoTimer);
    startAuto();
  }

  // Scroll animations
  function initScrollAnim() {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.product-card, .category-card, .section-title').forEach(function(el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    initCarousel();
    initScrollAnim();
    // Close mobile menu on outside click
    document.addEventListener('click', function(e) {
      var nav = document.querySelector('.main-nav');
      var btn = document.querySelector('.mobile-menu-btn');
      if (nav && nav.classList.contains('open') && !nav.contains(e.target) && e.target !== btn) {
        nav.classList.remove('open');
      }
    });
  });
})();
