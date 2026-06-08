-- 004_storage_buckets.sql
-- Gigrise E-Commerce Platform — Storage Buckets

-- Product images bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read on product images
CREATE POLICY "product_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow vendors to upload their own images
CREATE POLICY "product_images_vendor_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
);

-- ID documents bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-documents', 'id-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Only admin service role can read ID documents
CREATE POLICY "id_documents_admin_read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'id-documents'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Users can upload their own ID documents
CREATE POLICY "id_documents_self_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'id-documents'
  AND auth.role() = 'authenticated'
);
