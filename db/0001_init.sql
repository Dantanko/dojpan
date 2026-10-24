CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  price_kobo INTEGER NOT NULL CHECK (price_kobo > 0),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- stock = unsold units (including held ones). held = reserved by pending orders.
-- available = stock - held. CHECK (held <= stock) is what makes overselling impossible.
CREATE TABLE variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  size TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  held INTEGER NOT NULL DEFAULT 0 CHECK (held >= 0),
  UNIQUE (product_id, size),
  CHECK (held <= stock)
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN
    ('pending','paid','packed','shipped','delivered','expired','cancelled','refunded','failed','needs_attention')),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('delivery','pickup')),
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  fitting_note TEXT NOT NULL DEFAULT '',
  total_kobo INTEGER NOT NULL,
  hold_expires_at TEXT NOT NULL,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  variant_id INTEGER NOT NULL REFERENCES variants(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price_kobo INTEGER NOT NULL
);
CREATE TABLE webhook_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  event TEXT,
  reference TEXT,
  body TEXT
);
CREATE INDEX idx_orders_pending ON orders (status, hold_expires_at);
CREATE INDEX idx_items_order ON order_items (order_id);
