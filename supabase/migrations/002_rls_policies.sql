-- 002_rls_policies.sql
-- Gigrise E-Commerce Platform — Row Level Security Policies

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_read_admin" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- VENDOR PROFILES
-- ============================================================
ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_profiles_read_own" ON vendor_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "vendor_profiles_read_buyer" ON vendor_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'buyer')
  );

CREATE POLICY "vendor_profiles_read_admin" ON vendor_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "vendor_profiles_update_own" ON vendor_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vendor_profiles_insert_own" ON vendor_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CATEGORIES
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_read_all" ON categories
  FOR SELECT USING (true);

-- ============================================================
-- PRODUCTS
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_read_active" ON products
  FOR SELECT USING (status = 'active');

CREATE POLICY "products_read_own" ON products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM vendor_profiles WHERE id = products.vendor_id AND user_id = auth.uid())
  );

CREATE POLICY "products_insert_own" ON products
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM vendor_profiles WHERE id = products.vendor_id AND user_id = auth.uid())
  );

CREATE POLICY "products_update_own" ON products
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM vendor_profiles WHERE id = products.vendor_id AND user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM vendor_profiles WHERE id = products.vendor_id AND user_id = auth.uid())
  );

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "variants_read_active" ON product_variants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM products WHERE id = product_variants.product_id AND status = 'active')
  );

CREATE POLICY "variants_read_own" ON product_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN vendor_profiles vp ON p.vendor_id = vp.id
      WHERE p.id = product_variants.product_id AND vp.user_id = auth.uid()
    )
  );

CREATE POLICY "variants_insert_own" ON product_variants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      JOIN vendor_profiles vp ON p.vendor_id = vp.id
      WHERE p.id = product_variants.product_id AND vp.user_id = auth.uid()
    )
  );

CREATE POLICY "variants_update_own" ON product_variants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN vendor_profiles vp ON p.vendor_id = vp.id
      WHERE p.id = product_variants.product_id AND vp.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      JOIN vendor_profiles vp ON p.vendor_id = vp.id
      WHERE p.id = product_variants.product_id AND vp.user_id = auth.uid()
    )
  );

-- ============================================================
-- ORDERS
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_read_own_buyer" ON orders
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "orders_read_own_vendor" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN vendor_profiles vp ON oi.vendor_id = vp.id
      WHERE oi.order_id = orders.id AND vp.user_id = auth.uid()
    )
  );

CREATE POLICY "orders_read_admin" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- ORDER ITEMS
-- ============================================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_read_own_buyer" ON order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_items.order_id AND buyer_id = auth.uid())
  );

CREATE POLICY "order_items_read_own_vendor" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vendor_profiles vp
      WHERE vp.id = order_items.vendor_id AND vp.user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_read_admin" ON order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- ORDER NOTES
-- ============================================================
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_notes_read_participant" ON order_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_notes.order_id AND buyer_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM order_items oi
      JOIN vendor_profiles vp ON oi.vendor_id = vp.id
      WHERE oi.order_id = order_notes.order_id AND vp.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "order_notes_insert_participant" ON order_notes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE id = order_notes.order_id AND buyer_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM order_items oi
      JOIN vendor_profiles vp ON oi.vendor_id = vp.id
      WHERE oi.order_id = order_notes.order_id AND vp.user_id = auth.uid()
    )
  );

-- ============================================================
-- DISPUTES
-- ============================================================
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disputes_read_participant" ON disputes
  FOR SELECT USING (
    auth.uid() = raised_by
    OR EXISTS (
      SELECT 1 FROM orders WHERE id = disputes.order_id AND buyer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM order_items oi
      JOIN vendor_profiles vp ON oi.vendor_id = vp.id
      WHERE oi.order_id = disputes.order_id AND vp.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "disputes_insert_buyer" ON disputes
  FOR INSERT WITH CHECK (
    auth.uid() = raised_by
    AND EXISTS (SELECT 1 FROM orders WHERE id = disputes.order_id AND buyer_id = auth.uid())
  );

CREATE POLICY "disputes_update_admin" ON disputes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- PAYOUTS
-- ============================================================
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payouts_read_own_vendor" ON payouts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM vendor_profiles WHERE id = payouts.vendor_id AND user_id = auth.uid())
  );

CREATE POLICY "payouts_read_admin" ON payouts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- REVIEWS
-- ============================================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_read_all" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert_buyer" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE id = reviews.order_id
      AND buyer_id = auth.uid()
      AND status = 'released'
    )
  );

-- ============================================================
-- PLATFORM LEDGER
-- ============================================================
ALTER TABLE platform_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ledger_read_admin" ON platform_ledger
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
