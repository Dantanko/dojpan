(function () {
  var NEXT = { paid: ['packed', 'refunded'], packed: ['shipped', 'refunded'], shipped: ['delivered'], needs_attention: ['packed', 'refunded'] };
  var LBL = { packed: 'Mark packed', shipped: 'Mark shipped', delivered: 'Mark delivered', refunded: 'Mark refunded' };
  var FIL = [['open', 'Open orders'], ['paid', 'Paid (to pack)'], ['packed', 'Packed'], ['shipped', 'Shipped'], ['needs_attention', 'Needs attention'], ['delivered', 'Delivered'], ['offline', 'In-person sales'], ['refunded', 'Refunded'], ['cancelled', 'Cancelled'], ['all', 'Everything']];
  var root = document.getElementById('app'), tab = 'orders', filter = 'open';
  function el(t, x, c) { var e = document.createElement(t); if (x != null) e.textContent = x; if (c) e.className = c; return e; }
  function api(p, body) {
    var o = body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {};
    return fetch('/api/admin/' + p, o).then(function (r) { return r.json().then(function (j) { if (r.status === 401) location.reload(); return j; }); });
  }
  function naira(k) { var s = (k / 100).toFixed(2).split('.'); return '\u20A6' + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (s[1] === '00' ? '' : '.' + s[1]); }
  function wa(ph) { var d = String(ph).replace(/\D/g, ''); if (d.charAt(0) === '0') d = '234' + d.slice(1); return 'https://wa.me/' + d; }
  function render() {
    root.textContent = '';
    var t = el('div', null, 'tabs');
    [['orders', 'Orders'], ['sale', 'Record a sale'], ['stock', 'Stock']].forEach(function (n) { var b = el('button', n[1], tab === n[0] ? 'on' : ''); b.onclick = function () { tab = n[0]; render(); }; t.appendChild(b); });
    var lo = el('button', 'Sign out'); lo.onclick = function () { api('logout', {}).then(function () { location.reload(); }); }; t.appendChild(lo);
    root.appendChild(t);
    var box = el('div'); root.appendChild(box);
    ({ orders: orders, sale: sale, stock: stock })[tab](box);
  }
  function orders(box) {
    var sel = el('select'); FIL.forEach(function (f) { var o = el('option', f[1]); o.value = f[0]; if (f[0] === filter) o.selected = true; sel.appendChild(o); });
    sel.onchange = function () { filter = sel.value; render(); }; box.appendChild(sel);
    var list = el('div'); box.appendChild(list); list.textContent = 'Loading...';
    api('orders?status=' + filter).then(function (d) {
      list.textContent = '';
      if (d.alerts_configured === false) list.appendChild(el('p', 'Automatic order alerts are not set up yet, so check this page for new orders.', 'o warn'));
      if (d.unalerted > 0) {
        var bn = el('div', null, 'o warn'); bn.appendChild(el('p', d.unalerted + ' paid order(s) did not send an alert. Please check them below.'));
        var rs = el('button', 'Resend alerts', 'p'); rs.onclick = function () { rs.disabled = true; api('resend-alerts', {}).then(render); }; bn.appendChild(rs); list.appendChild(bn);
      }
      if (!d.orders || !d.orders.length) { list.appendChild(el('p', 'No orders here.')); return; }
      d.orders.forEach(function (o) {
        var c = el('div', null, 'o' + (o.status === 'needs_attention' ? ' warn' : ''));
        var h = el('h3', o.reference + '  '); h.appendChild(el('span', o.status.replace('_', ' '), 'tag'));
        if (o.source !== 'online') { h.appendChild(document.createTextNode(' ')); h.appendChild(el('span', 'in person', 'tag')); }
        c.appendChild(h);
        c.appendChild(el('p', (o.items || []).map(function (i) { return i.qty + ' x ' + i.name + ' (size ' + i.size + ')'; }).join(', ') + '  -  ' + naira(o.total_kobo)));
        var p = el('p', o.customer_name + (o.phone ? ', ' : ''));
        if (o.phone) { var a = el('a', o.phone); a.href = wa(o.phone); a.target = '_blank'; a.rel = 'noopener'; p.appendChild(a); }
        c.appendChild(p);
        c.appendChild(el('p', (o.delivery_method === 'pickup' ? 'Collection' : 'Delivery: ' + o.address + ', ' + o.city)));
        if (o.fitting_note) c.appendChild(el('p', 'Notes: ' + o.fitting_note));
        c.appendChild(el('p', 'Paid: ' + (o.paid_at || 'not yet') + ' (UTC)'));
        if (o.status === 'needs_attention') c.appendChild(el('p', 'Paid, but the piece was no longer in stock. Offer the next batch, or refund in the Paystack dashboard and then mark refunded.'));
        (NEXT[o.status] || []).forEach(function (to) {
          var b = el('button', LBL[to], to === 'refunded' ? '' : 'p');
          b.onclick = function () {
            if (to === 'refunded' && !confirm('Mark as refunded? Refund the money in Paystack separately, and adjust stock if needed.')) return;
            b.disabled = true;
            api('order-status', { reference: o.reference, to: to }).then(function (r) { if (r.error) alert('Could not change: ' + r.error); render(); });
          };
          c.appendChild(b); c.appendChild(document.createTextNode(' '));
        });
        if (o.source !== 'online' && ['paid', 'packed', 'delivered'].indexOf(o.status) > -1) {
          var u = el('button', 'Undo this sale');
          u.onclick = function () { if (!confirm('Undo this sale? The piece goes back into stock.')) return; u.disabled = true; api('sale-cancel', { reference: o.reference }).then(function (r) { if (r.error) alert('Could not undo: ' + r.error); render(); }); };
          c.appendChild(u);
        }
        list.appendChild(c);
      });
    });
  }
  function sale(box) {
    box.appendChild(el('p', 'Sold a piece outside the website? Record it here so the shop never sells it twice.'));
    var f = el('form', null, 'fm'); box.appendChild(f);
    function field(label, input) { var l = el('label', label); l.appendChild(input); f.appendChild(l); return input; }
    var pick = field('Piece and size', el('select')), qty = field('How many', el('input')); qty.type = 'number'; qty.min = 1; qty.value = 1;
    var msg = el('p', '', 'ok'), go = el('button', 'Record sale', 'p'); go.type = 'submit'; f.appendChild(go); f.appendChild(msg);
    api('stock').then(function (d) {
      (d.rows || []).forEach(function (r) { if (r.vid == null || !r.active) return; var av = r.stock - r.held; var o = el('option', r.name + ' - size ' + r.size + ' (' + av + ' available)'); o.value = r.vid; if (av < 1) o.disabled = true; pick.appendChild(o); });
    });
    f.onsubmit = function (e) {
      e.preventDefault(); msg.textContent = ''; go.disabled = true;
      api('sale', { variant_id: +pick.value, qty: +qty.value }).then(function (r) {
        go.disabled = false;
        if (r.ok) { msg.textContent = 'Recorded. Stock updated.'; setTimeout(function () { tab = 'orders'; filter = 'offline'; render(); }, 1000); return; }
        msg.textContent = r.error === 'not_enough' ? 'Not enough in stock for ' + (r.item || 'that piece') + '.' : 'Could not record: ' + r.error;
      });
    };
  }
  function stock(box) {
    box.textContent = 'Loading...';
    api('stock').then(function (d) {
      box.textContent = '';
      var seen = {};
      (d.rows || []).forEach(function (r) {
        if (!seen[r.pid]) {
          seen[r.pid] = el('div'); var h = el('h3', r.name + (r.active ? '' : ' (hidden)'));
          var tg = el('button', r.active ? 'Hide from shop' : 'Show in shop');
          tg.onclick = function () { api('stock', { product_id: r.pid, active: !r.active }).then(render); };
          seen[r.pid].appendChild(h); seen[r.pid].appendChild(tg);
          var tb = el('table'); var hd = el('tr'); ['Size', 'In stock', 'Reserved', 'Available', 'Adjust'].forEach(function (x) { hd.appendChild(el('th', x)); }); tb.appendChild(hd);
          seen[r.pid].appendChild(tb); seen[r.pid].tb = tb; box.appendChild(seen[r.pid]);
        }
        if (r.vid == null) return;
        var tr = el('tr'); [r.size, r.stock, r.held, r.stock - r.held].forEach(function (x) { tr.appendChild(el('td', x)); });
        var td = el('td');
        function bump(n) { var b = el('button', (n > 0 ? '+' : '') + n); b.onclick = function () { b.disabled = true; api('stock', { variant_id: r.vid, delta: n }).then(function (x) { if (x.error) alert(x.error === 'below_reserved' ? 'You cannot go below the number already reserved or below zero.' : 'Could not change: ' + x.error); render(); }); }; td.appendChild(b); td.appendChild(document.createTextNode(' ')); }
        bump(-1); bump(1);
        tr.appendChild(td); seen[r.pid].tb.appendChild(tr);
      });
      if (!d.rows || !d.rows.length) box.appendChild(el('p', 'No products yet.'));
    });
  }
  render();
  setInterval(function () { if (tab === 'orders' && document.visibilityState === 'visible') render(); }, 30000); // new paid orders appear without refreshing
})();
