# Shop backend: setup (TEST MODE ONLY)

Nothing here touches the live GitHub Pages site. You test on a free *.pages.dev address first.

1. Cloudflare dashboard > Storage & Databases > D1 > Create database `dojpan-shop`.
2. Open its Console tab. Paste all of `db/0001_init.sql` and run. Then `db/0002_product_images.sql` and `db/0003_product_images_table.sql` and `db/0004_orders_notified.sql`. Then `db/seed-test.sql` (a N100 test piece).
3. Workers & Pages > Create > Pages > Connect to Git > repo `dojpan` (main). No build command; output directory blank/`/`.
4. Pages project > Settings:
   - Bindings > D1 database: variable `DB` = `dojpan-shop`
   - Variables: `HOLD_MINUTES` = 15, `DELIVERY_FEE_KOBO` = 0 (kobo: N2,500 = 250000)
   - Optional `SITE_URL` = your real domain once it exists, e.g. https://dojpanache.com (adds canonical links and full URLs in the schema)
   - Secret: `PAYSTACK_SECRET_KEY` = your TEST secret key (starts `sk_test_`). Never put it in a file.
   Redeploy after saving.
5. Paystack dashboard (test mode) > Settings > API Keys & Webhooks > Test Webhook URL:
   `https://YOUR-PROJECT.pages.dev/api/paystack-webhook`
6. Try it (variant ids come from the `variants` table):
   curl -X POST https://YOUR-PROJECT.pages.dev/api/checkout -H "content-type: application/json" -d '{"items":[{"variant_id":1,"qty":1}],"delivery_method":"pickup","customer":{"name":"Test Buyer","phone":"08012345678","email":"you@example.com"}}'
   Open `authorization_url`, pay with a test card from Paystack's "Test Payments" docs page,
   then open /api/order-status?ref=THE_REFERENCE. Status should become `paid` and stock should drop by 1.
   Then try the real flow: open /shop/, choose the test piece, add to bag, and pay.

Also test: run checkout twice for size 12 (only 1 in stock): the second must answer `sold_out`.

Not built yet: confirmation emails and the admin page. Do not use live keys until those and a live test are done.

## Adding a product with several photos (run in the D1 console)
INSERT INTO products (slug, name, description, category, price_kobo)
VALUES ('your-slug', 'Piece name', 'First paragraph.\n\nSecond paragraph.', 'asoebi', 4500000);
INSERT INTO variants (product_id, size, stock) VALUES
 ((SELECT id FROM products WHERE slug='your-slug'), '10', 2), ((SELECT id FROM products WHERE slug='your-slug'), '12', 3);
INSERT INTO product_images (product_id, url, alt, position) VALUES
 ((SELECT id FROM products WHERE slug='your-slug'), '/images/shop/your-slug-1.webp', 'Piece name, front view', 1),
 ((SELECT id FROM products WHERE slug='your-slug'), '/images/shop/your-slug-2.webp', 'Piece name, back view', 2),
 ((SELECT id FROM products WHERE slug='your-slug'), '/images/shop/your-slug-3.webp', 'Piece name, fabric detail', 3);
The photo with the lowest position is the cover (shown in the catalogue and first on the page).
Alt text: say what the photo shows, in plain words (view, colour, fabric). Only facts Dorcas confirms.
Photos: WebP, about 800px wide, under 120 KB each, saved in images/shop/ in the repo.
Prices are in kobo (N45,000 = 4500000).
To hide a piece: UPDATE products SET active = 0 WHERE slug = 'your-slug';

## Admin page (/admin/)
Secrets (Cloudflare Pages > Settings > Variables, as SECRET): `ADMIN_PASSWORD` = a long passphrase (16+ characters, not used anywhere else).
Without it the admin stays switched off. Sign in at /admin/. Orders tab: pack, ship, mark delivered. Stock tab: adjust sizes, hide pieces.
Later, put Cloudflare Access in front of /admin/* for a second lock.
Optional emails (Resend): secrets `RESEND_API_KEY`; variables `MAIL_FROM` (an address on a domain verified in Resend), `NOTIFY_EMAIL` (manager).
Without them no email is sent; the admin page still shows every paid order.
