CREATE TABLE product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  url TEXT NOT NULL,
  alt TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_images ON product_images (product_id, position);
-- keep any single image already set on a product
INSERT INTO product_images (product_id, url, position) SELECT id, image, 0 FROM products WHERE image <> '';
