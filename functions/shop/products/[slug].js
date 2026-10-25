import { html, layout, esc, naira, WA, crumbs } from '../../_lib/page.js';

export async function onRequestGet({ env, params }) {
  const base = (env.SITE_URL || '').replace(/\/$/, '');
  const p = await env.DB.prepare('SELECT * FROM products WHERE slug = ? AND active = 1').bind(params.slug).first();
  if (!p) return html(layout({ title: 'Not found | DOJ Panache', noindex: true,
    body: '<main class="pg"><div class="w"><h1>Piece not found</h1><p class="lead"><a href="/shop/">See all ready-to-wear</a></p></div></main>' }), 404, 'no-store');
  const { results: vs } = await env.DB.prepare('SELECT id, size, stock, held FROM variants WHERE product_id = ? ORDER BY id').bind(p.id).all();
  let { results: imgs } = await env.DB.prepare('SELECT url, alt FROM product_images WHERE product_id = ? ORDER BY position, id').bind(p.id).all();
  if (!imgs.length && p.image) imgs = [{ url: p.image, alt: '' }];
  const alt = (im, i) => im.alt || (i === 0 ? p.name : `${p.name}, view ${i + 1}`);
  const gallery = imgs.length
    ? `<div class="gal"><div class="pimg"><img id="mainimg" src="${esc(imgs[0].url)}" alt="${esc(alt(imgs[0], 0))}">${imgs.length > 1 ? '<button type="button" class="gp" aria-label="Previous photo">\u2039</button><button type="button" class="gn" aria-label="Next photo">\u203a</button><span class="gc">1 / ' + imgs.length + '</span>' : ''}</div>${imgs.length > 1
      ? `<div class="thumbs">${imgs.map((im, i) => `<button type="button" class="th" data-src="${esc(im.url)}" data-alt="${esc(alt(im, i))}" aria-label="View ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}><img src="${esc(im.url)}" alt="${esc(alt(im, i))}" loading="lazy"></button>`).join('')}</div>` : ''}</div>`
    : '<div class="pimg"></div>';
  const avail = vs.some((v) => v.stock - v.held > 0);
  const url = `${base}/shop/products/${p.slug}/`;
  const ask = `https://wa.me/2348133464931?text=${encodeURIComponent(`Hello DOJ Panache, I'd like to ask about the ${p.name} on your website.`)}`;
  const desc = p.description.split(/\n{2,}/).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join('');

  const sizes = vs.map((v) => { const ok = v.stock - v.held > 0;
    return `<label class="sz"><input type="radio" name="size" value="${v.id}" data-name="${esc(p.name)}" data-size="${esc(v.size)}" data-price="${p.price_kobo}"${ok ? '' : ' disabled'}><span>${esc(v.size)}</span></label>`; }).join('');

  const buy = avail
    ? `<fieldset class="sizes"><legend>Size</legend>${sizes}</fieldset><button class="btn solid add-bag" type="button">Add to bag</button><p class="msg" role="status"></p>`
    : `<p class="price">Sold out</p><a class="btn" href="${esc(ask)}">Ask about the next batch</a>`;

  const body = `<main class="pg"><div class="w">
<nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/shop/">Ready-to-wear</a> / ${esc(p.name)}</nav>
<div class="pd">${gallery}
<div><h1>${esc(p.name)}</h1><p class="price">${naira(p.price_kobo)}</p>${desc}${buy}
<p class="msg2"><a href="${esc(ask)}">Ask about this piece on WhatsApp</a></p></div></div>
</div></main>`;

  const product = { '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.description || p.name,
    brand: { '@type': 'Brand', name: 'DOJ Panache' },
    offers: { '@type': 'Offer', priceCurrency: 'NGN', price: (p.price_kobo / 100).toFixed(2), itemCondition: 'https://schema.org/NewCondition',
      availability: avail ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', ...(base ? { url } : {}) } };
  if (base && imgs.length) product.image = imgs.map((im) => (im.url.startsWith('http') ? im.url : base + im.url));
  if (base) product.url = url;
  const metaDesc = (p.description || `${p.name}, ready-to-wear from DOJ Panache in Abuja.`).replace(/\s+/g, ' ').slice(0, 155);
  return html(layout({ title: `${p.name} | DOJ Panache ready-to-wear`, description: metaDesc, body,
    jsonld: [product, crumbs([['Home', '/'], ['Ready-to-wear', '/shop/'], [p.name, `/shop/products/${p.slug}/`]], base)], canonical: base ? url : '' }));
}
