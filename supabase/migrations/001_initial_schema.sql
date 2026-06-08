-- 001_initial_schema.sql
-- Gigrise E-Commerce Platform — Full Schema

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  phone text,
  id_document_url text,
  id_document_type text,
  id_verified boolean DEFAULT false,
  role text DEFAULT 'buyer' CHECK (role IN ('buyer', 'vendor', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- VENDOR PROFILES
-- ============================================================
CREATE TABLE vendor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_name text NOT NULL,
  shop_description text,
  bank_account_number text,
  bank_name text,
  balance decimal(12,2) DEFAULT 0 CHECK (balance >= 0),
  pending_balance decimal(12,2) DEFAULT 0 CHECK (pending_balance >= 0),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES categories(id)
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id),
  title text NOT NULL,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  base_price decimal(10,2) NOT NULL CHECK (base_price >= 0),
  images text[] DEFAULT '{}',
  rating_avg decimal(3,2) DEFAULT 0,
  rating_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================
CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  options jsonb,
  price_override decimal(10,2) CHECK (price_override IS NULL OR price_override >= 0),
  stock_quantity int NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  sku text UNIQUE
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES profiles(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'in_hold', 'released', 'disputed', 'refunded', 'cancelled')),
  subtotal decimal(10,2) NOT NULL CHECK (subtotal >= 0),
  platform_commission decimal(10,2) NOT NULL CHECK (platform_commission >= 0),
  vendor_payout decimal(10,2) NOT NULL CHECK (vendor_payout >= 0),
  paychangu_reference text UNIQUE,
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  paid_at timestamptz,
  hold_release_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  variant_id uuid NOT NULL REFERENCES product_variants(id),
  vendor_id uuid NOT NULL REFERENCES vendor_profiles(id),
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal decimal(10,2) NOT NULL CHECK (subtotal >= 0)
);

-- ============================================================
-- ORDER NOTES
-- ============================================================
CREATE TABLE order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- DISPUTES
-- ============================================================
CREATE TABLE disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  raised_by uuid NOT NULL REFERENCES profiles(id),
  reason text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved_buyer', 'resolved_vendor', 'closed')),
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (order_id)
);

-- ============================================================
-- PAYOUTS
-- ============================================================
CREATE TABLE payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendor_profiles(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  amount decimal(10,2) NOT NULL CHECK (amount >= 0),
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'paid', 'failed')),
  paychangu_reference text,
  scheduled_at timestamptz NOT NULL,
  paid_at timestamptz
);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (product_id, reviewer_id)
);

-- ============================================================
-- PLATFORM LEDGER
-- ============================================================
CREATE TABLE platform_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  event_type text NOT NULL CHECK (event_type IN ('payment_received', 'commission_earned', 'payout_released', 'refund_issued')),
  amount decimal(10,2) NOT NULL CHECK (amount >= 0),
  description text,
  created_at timestamptz DEFAULT now()
);
