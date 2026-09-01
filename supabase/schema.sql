-- ==========================================================
-- Supabase Schema for Eno's Pastries
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/vfolwsqdizcnmpowptko/sql/new)
-- ==========================================================

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  imageUrl TEXT,
  category TEXT NOT NULL DEFAULT 'Pastry',
  ingredients JSONB DEFAULT '[]'::jsonb,
  available BOOLEAN DEFAULT true,
  createdAt TIMESTAMPTZ DEFAULT now(),
  updatedAt TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId TEXT,
  totalAmount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'PENDING',
  orderType TEXT NOT NULL DEFAULT 'RETAIL',
  deliveryType TEXT NOT NULL DEFAULT 'PICKUP',
  deliveryAddress TEXT,
  deliveryDate TIMESTAMPTZ,
  customerName TEXT NOT NULL,
  customerEmail TEXT NOT NULL,
  customerPhone TEXT NOT NULL,
  customerNote TEXT,
  paystackReference TEXT UNIQUE,
  createdAt TIMESTAMPTZ DEFAULT now(),
  updatedAt TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  orderId TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  productId TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  createdAt TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Products (Everyone can view, admins can manage)
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products"
  ON public.products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow all modifications on products" ON public.products;
CREATE POLICY "Allow all modifications on products"
  ON public.products FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Policies for Orders (Public can create and view)
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Public can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
CREATE POLICY "Public can view orders"
  ON public.orders FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can update orders" ON public.orders;
CREATE POLICY "Public can update orders"
  ON public.orders FOR UPDATE
  USING (true);

-- 7. Policies for Order Items
DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
CREATE POLICY "Public can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;
CREATE POLICY "Public can view order items"
  ON public.order_items FOR SELECT
  USING (true);

-- 8. Seed Initial Bakery Menu Products
INSERT INTO public.products (name, description, price, imageUrl, category, ingredients, available)
VALUES
  (
    'Meat Pie (Corned Beef Filling)',
    'Delicious freshly baked meat pie filled with seasoned minced corned beef and aromatic spices.',
    5.00,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=delicious%20corned%20beef%20meat%20pie%20on%20a%20white%20plate&image_size=square_hd',
    'Pastry',
    '["Flour", "Corned Beef", "Onions", "Spices"]'::jsonb,
    true
  ),
  (
    'Meat Pie (Egg Filling)',
    'Savory, flaky golden crust packed with hearty spiced egg filling.',
    4.50,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=savory%20egg%20meat%20pie%20on%20a%20white%20plate&image_size=square_hd',
    'Pastry',
    '["Flour", "Eggs", "Onions", "Spices"]'::jsonb,
    true
  ),
  (
    'Meat Pie (Vegetable Filling)',
    'Wholesome and delicious vegetarian meat pie loaded with fresh garden vegetables.',
    4.00,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=healthy%20vegetable%20meat%20pie%20on%20a%20white%20plate&image_size=square_hd',
    'Pastry',
    '["Flour", "Carrots", "Peas", "Onions", "Spices"]'::jsonb,
    true
  ),
  (
    'Meat Pie (Corned Beef & Sausage Filling)',
    'Hearty, rich double-filling pie with seasoned corned beef and savory sausages.',
    5.50,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=hearty%20corned%20beef%20and%20sausage%20meat%20pie&image_size=square_hd',
    'Pastry',
    '["Flour", "Corned Beef", "Sausage", "Onions", "Spices"]'::jsonb,
    true
  ),
  (
    'Rock Buns',
    'Crunchy on the outside, soft on the inside classic baked sweet rock buns.',
    3.00,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=crunchy%20rock%20buns%20on%20a%20white%20plate&image_size=square_hd',
    'Pastry',
    '["Flour", "Sugar", "Butter", "Milk"]'::jsonb,
    true
  ),
  (
    'Cocoa Drink',
    'Rich, smooth, and creamy chilled cocoa drink made from premium cocoa.',
    2.50,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=rich%20creamy%20cocoa%20drink%20in%20a%20glass&image_size=square_hd',
    'Drink',
    '["Cocoa Powder", "Milk", "Sugar"]'::jsonb,
    true
  ),
  (
    'Vanilla Yoghurt',
    'Smooth, creamy artisanal yoghurt infused with natural sweet vanilla.',
    3.00,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=smooth%20vanilla%20yoghurt%20in%20a%20bowl&image_size=square_hd',
    'Drink',
    '["Yoghurt", "Vanilla Extract", "Sugar"]'::jsonb,
    true
  ),
  (
    'Strawberry Yoghurt',
    'Refreshing, velvety yoghurt bursting with real strawberry flavor.',
    3.00,
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=delicious%20strawberry%20yoghurt%20in%20a%20bowl&image_size=square_hd',
    'Drink',
    '["Yoghurt", "Strawberries", "Sugar"]'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;
