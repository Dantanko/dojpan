-- TEST DATA ONLY. N100 piece for payment testing. Delete before launch.
INSERT INTO products (slug, name, description, category, price_kobo)
VALUES ('test-piece', 'TEST PIECE (delete before launch)', 'Payment test item.', 'test', 10000);
INSERT INTO variants (product_id, size, stock) VALUES
  ((SELECT id FROM products WHERE slug='test-piece'), '10', 3),
  ((SELECT id FROM products WHERE slug='test-piece'), '12', 1);
