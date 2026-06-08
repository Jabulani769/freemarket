-- 003_triggers.sql
-- Gigrise E-Commerce Platform — Database Triggers

-- ============================================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'buyer')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- UPDATE PRODUCT RATING ON REVIEW INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.products
  SET
    rating_avg = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.reviews
      WHERE product_id = NEW.product_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE product_id = NEW.product_id
    )
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_review_inserted
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_rating();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment(x numeric)
RETURNS numeric
LANGUAGE sql
AS $$ SELECT COALESCE($1, 0) + x; $$;

CREATE OR REPLACE FUNCTION public.decrement(x numeric)
RETURNS numeric
LANGUAGE sql
AS $$ SELECT GREATEST(COALESCE($1, 0) - x, 0); $$;
