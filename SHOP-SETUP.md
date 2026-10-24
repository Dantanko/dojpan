# Shop backend: setup (TEST MODE ONLY)

Nothing here touches the live GitHub Pages site. You test on a free *.pages.dev address first.

1. Cloudflare dashboard > Storage & Databases > D1 > Create database `dojpan-shop`.
2. Open its Console tab. Paste all of `db/0001_init.sql` and run. Then paste `db/seed-test.sql` and run (a N100 test piece).
3. Workers & Pages > Create > Pages > Connect to Git > repo `dojpan` (main). No build command; output directory blank/`/`.
4. Pages project > Settings:
   - Bindings > D1 database: variable `DB` = `dojpan-shop`
   - Variables: `HOLD_MINUTES` = 15, `DELIVERY_FEE_KOBO` = 0 (kobo: N2,500 = 250000)
   - Secret: `PAYSTACK_SECRET_KEY` = your TEST secret key (starts `sk_test_`). Never put it in a file.
   Redeploy after saving.
5. Paystack dashboard (test mode) > Settings > API Keys & Webhooks > Test Webhook URL:
   `https://YOUR-PROJECT.pages.dev/api/paystack-webhook`
6. Try it (variant ids come from the `variants` table):
   curl -X POST https://YOUR-PROJECT.pages.dev/api/checkout -H "content-type: application/json" -d '{"items":[{"variant_id":1,"qty":1}],"delivery_method":"pickup","customer":{"name":"Test Buyer","phone":"08012345678","email":"you@example.com"}}'
   Open `authorization_url`, pay with a test card from Paystack's "Test Payments" docs page,
   then open /api/order-status?ref=THE_REFERENCE. Status should become `paid` and stock should drop by 1.
   (The thank-you page does not exist yet, so after paying you will land on a 404. Ignore it for now.)

Also test: run checkout twice for size 12 (only 1 in stock): the second must answer `sold_out`.

Not built yet: confirmation emails, admin page, shop pages. Do not use live keys until those and a live test are done.
