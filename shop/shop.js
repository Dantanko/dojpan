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
