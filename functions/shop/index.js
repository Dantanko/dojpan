import { html, layout, esc, naira, WA, crumbs } from '../_lib/page.js';

export async function onRequestGet({ env }) {
  const base = (env.SITE_URL || '').replace(/\/$/, '');
  const { results } = await env.DB.prepare(
    `SELECT p.slug, p.name, p.price_kobo,
            COALESCE((SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY i.position, i.id LIMIT 1), NULLIF(p.image, '')) AS image,
            COALESCE(SUM(v.stock - v.held), 0) AS avail
     FROM products p LEFT JOIN variants v ON v.product_id = p.id
     WHERE p.active = 1 GROUP BY p.id ORDER BY p.id DESC`).all();

  const cards = results.map((p) => `<a class="pcard" href="/shop/products/${esc(p.slug)}/">
<div class="pimg">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : ''}</div>
<h3>${esc(p.name)}</h3><p>${naira(p.price_kobo)}${p.avail > 0 ? '' : ' · Sold out'}</p></a>`).join('');

  const body = `<main class="pg"><div class="w">
<nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a> / Ready-to-wear</nav>
<h1>Ready-to-wear</h1>
<p class="lead">Pieces from our best-loved looks, sewn in our atelier in Apo, Abuja. Prices are in naira, and every size shown is in stock.</p>
${cards ? `<div class="pgrid">${cards}</div>` : `<p class="lead">The first pieces are being finished. <a href="${esc(WA)}">Ask us on WhatsApp</a> and we will tell you what is coming.</p>`}
<p class="more"><a class="btn" href="/#albums">See our bespoke albums</a></p>
</div></main>`;

  const jsonld = [crumbs([['Home', '/'], ['Ready-to-wear', '/shop/']], base)];
  if (base && results.length) jsonld.push({ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: results.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${base}/shop/products/${p.slug}/`, name: p.name })) });
  return html(layout({ title: 'Ready-to-wear | DOJ Panache', description: 'Ready-to-wear from DOJ Panache, sewn in our atelier in Apo, Abuja. Prices in naira.', body, jsonld, canonical: base ? base + '/shop/' : '' }));
}
