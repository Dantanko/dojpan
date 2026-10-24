export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const naira = (kobo) => {
  const [i, d] = (kobo / 100).toFixed(2).split('.');
  return '₦' + i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d === '00' ? '' : '.' + d);
};
export const WA = 'https://api.whatsapp.com/message/JH64ATJN3WMPI1?autoload=1&app_absent=0';
export const html = (body, status = 200, cache = 'public, max-age=60') =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cache } });

export function layout({ title, description = '', body, jsonld = [], noindex = false, canonical = '' }) {
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="icon" href="/images/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/css/style.css">
${ld}</head><body>
<header class="solid"><a class="mark" href="/" aria-label="DOJ Panache"><img src="/images/logo.svg" alt="DOJ Panache" width="108" height="43"></a>
<button class="burger" aria-label="Menu" aria-expanded="false">Menu</button>
<ul id="menu"><li><a href="/">Home</a></li><li><a href="/#albums">Albums</a></li><li><a href="/shop/">Ready-to-wear</a></li><li><a href="/#process">The process</a></li><li><a href="/#about">About us</a></li><li><a href="/shop/checkout/">Bag <span class="bag-count"></span></a></li><li><a class="btn sm" href="${esc(WA)}">Make an enquiry</a></li></ul></header>
${body}
<footer id="contact"><div class="w foot">
<div><h4>Get in touch</h4><p><a href="${esc(WA)}">Make an enquiry on WhatsApp</a><br><a href="tel:+2348133464931">+234 813 346 4931</a><br><a href="tel:+2348160851427">+234 816 085 1427</a></p></div>
<div><h4>Visit</h4><p>Apo Resettlement, plot 995, zone D, Abuja<br>By appointment</p></div>
<div><h4>Quick links</h4><p><a href="/#albums">Albums</a><br><a href="/shop/">Ready-to-wear</a><br><a href="/#process">The process</a><br><a href="/#about">About us</a><br><a href="https://instagram.com/doj_panache">Instagram</a></p></div>
</div><p class="copy">© DOJ Panache</p></footer>
<script>var bg=document.querySelector(".burger"),mn=document.getElementById("menu");bg.addEventListener("click",function(){var o=mn.classList.toggle("open");bg.setAttribute("aria-expanded",o)});</script>
<script src="/shop/shop.js"></script>
</body></html>`;
}

export const crumbs = (items, base) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, ...(base ? { item: base + path } : {}) })),
});
