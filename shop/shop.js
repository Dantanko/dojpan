/* Bag: kept in this browser only. Prices here are for display; the server always recalculates at checkout. */
(function () {
  var K = 'dojcart';
  function get() { try { return JSON.parse(localStorage.getItem(K)) || []; } catch (e) { return []; } }
  function set(c) { try { localStorage.setItem(K, JSON.stringify(c)); } catch (e) {} }
  function badge() { var n = get().length; document.querySelectorAll('.bag-count').forEach(function (b) { b.textContent = n ? '(' + n + ')' : ''; }); }
  window.DOJ = { get: get, set: set, badge: badge };
  badge();
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.add-bag')) return;
    var r = document.querySelector('input[name=size]:checked'), m = document.querySelector('.msg');
    if (!r) { m.textContent = 'Please choose a size.'; return; }
    var c = get(), id = +r.value;
    if (!c.some(function (x) { return x.variant_id === id; })) c.push({ variant_id: id, qty: 1, name: r.dataset.name, size: r.dataset.size, price_kobo: +r.dataset.price });
    set(c); badge(); location.href = '/shop/checkout/';
  });
})();

/* Product gallery: arrows, swipe, arrow keys and thumbnails all change the main photo. */
(function () {
  var g = document.querySelector('.gal'); if (!g) return;
  var th = [].slice.call(g.querySelectorAll('.th')); if (th.length < 2) return;
  var m = document.getElementById('mainimg'), ct = g.querySelector('.gc'), box = g.querySelector('.pimg'), i = 0, x0 = null;
  function warm(n) { var im = new Image(); im.src = th[(n + th.length) % th.length].dataset.src; }
  function show(n, dir) {
    i = (n + th.length) % th.length; var t = th[i];
    m.src = t.dataset.src; m.alt = t.dataset.alt;
    th.forEach(function (x) { x.removeAttribute('aria-current'); }); t.setAttribute('aria-current', 'true');
    if (ct) ct.textContent = (i + 1) + ' / ' + th.length;
    if (dir) { m.classList.remove('in-l', 'in-r'); void m.offsetWidth; m.classList.add(dir > 0 ? 'in-r' : 'in-l'); }
    warm(i + 1);
  }
  g.addEventListener('click', function (e) {
    var t = e.target.closest('.th');
    if (t) { var n = th.indexOf(t); show(n, n > i ? 1 : -1); }
    else if (e.target.closest('.gn')) show(i + 1, 1);
    else if (e.target.closest('.gp')) show(i - 1, -1);
  });
  g.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') show(i + 1, 1); else if (e.key === 'ArrowLeft') show(i - 1, -1); });
  box.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (x0 === null) return; var d = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(d) > 40) show(i + (d < 0 ? 1 : -1), d < 0 ? 1 : -1);
  });
  warm(1);
})();
