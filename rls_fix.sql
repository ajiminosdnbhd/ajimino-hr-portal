-- ============================================================
-- AJIMINO HR — RLS Security Fix
-- Run this entire script in Supabase SQL Editor
-- Fixes: "Table publicly accessible" (rls_disabled_in_public)
-- All policies now require a valid authenticated session.
-- The service-role key used by /api/read and /api/upload
-- bypasses RLS automatically — no changes needed there.
-- ============================================================

-- ── Helper function ─────────────────────────────────────────
-- Returns the role of the currently authenticated user
-- without causing infinite recursion on the profiles table.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;


-- ════════════════════════════════════════════════════════════
-- 1. PROFILES
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old permissive (anon-accessible) policies
DROP POLICY IF EXISTS "Anyone can read profiles"         ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"     ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can delete profiles" ON public.profiles;

-- Authenticated users can read all profiles (needed for leave/calendar lookups)
CREATE POLICY "auth_read_profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile; HR/Management can update any
CREATE POLICY "auth_update_own_profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "hrm_update_any_profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('hr', 'management'));

-- Insert/Delete only via service-role API routes (api/users/create)
CREATE POLICY "service_insert_profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (false);   -- blocked for anon/authenticated; service-role bypasses this

CREATE POLICY "service_delete_profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (false);        -- blocked for anon/authenticated; service-role bypasses this


-- ════════════════════════════════════════════════════════════
-- 2. LEAVES
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read leaves"        ON public.leaves;
DROP POLICY IF EXISTS "Authenticated can insert leaves" ON public.leaves;
DROP POLICY IF EXISTS "Anyone can update leaves"      ON public.leaves;

-- All authenticated users can read leaves (HR/Mgmt see all; staff see own — filtered in app)
CREATE POLICY "auth_read_leaves"
  ON public.leaves FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert their own leaves
CREATE POLICY "auth_insert_own_leave"
  ON public.leaves FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update leaves
-- (HR approves any; staff updates own cancellation requests — enforced in app layer)
CREATE POLICY "auth_update_leaves"
  ON public.leaves FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete leaves (used for cancellations by service role)
CREATE POLICY "auth_delete_leaves"
  ON public.leaves FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_my_role() IN ('hr', 'management'));


-- ════════════════════════════════════════════════════════════
-- 3. BOOKINGS
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read bookings"          ON public.bookings;
DROP POLICY IF EXISTS "Authenticated can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete own bookings"     ON public.bookings;

CREATE POLICY "auth_read_bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "auth_insert_own_booking"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "auth_delete_own_booking"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_my_role() IN ('hr', 'management'));


-- ════════════════════════════════════════════════════════════
-- 4. EVENTS (calendar)
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_events"   ON public.events;
DROP POLICY IF EXISTS "auth_insert_events" ON public.events;
DROP POLICY IF EXISTS "auth_update_events" ON public.events;
DROP POLICY IF EXISTS "auth_delete_events" ON public.events;

CREATE POLICY "auth_read_events"
  ON public.events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "auth_insert_events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth_update_events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "auth_delete_events"
  ON public.events FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by_id OR public.get_my_role() IN ('hr', 'management'));


-- ════════════════════════════════════════════════════════════
-- 5. ANNOUNCEMENTS
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_announcements"   ON public.announcements;
DROP POLICY IF EXISTS "hrm_manage_announcements"  ON public.announcements;

CREATE POLICY "auth_read_announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "hrm_insert_announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('hr', 'management'));

CREATE POLICY "hrm_delete_announcements"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('hr', 'management'));


-- ════════════════════════════════════════════════════════════
-- 6. POLICIES (company policies)
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read policies"          ON public.policies;
DROP POLICY IF EXISTS "Authenticated can insert policies" ON public.policies;
DROP POLICY IF EXISTS "Authenticated can delete policies" ON public.policies;

CREATE POLICY "auth_read_policies"
  ON public.policies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "hrm_insert_policies"
  ON public.policies FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('hr', 'management'));

CREATE POLICY "hrm_delete_policies"
  ON public.policies FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('hr', 'management'));


-- ════════════════════════════════════════════════════════════
-- 7. PAYSLIPS
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read payslips"          ON public.payslips;
DROP POLICY IF EXISTS "Authenticated can insert payslips" ON public.payslips;
DROP POLICY IF EXISTS "Authenticated can delete payslips" ON public.payslips;

-- Users see own payslips only; HR/Mgmt see all
CREATE POLICY "auth_read_own_payslips"
  ON public.payslips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.get_my_role() IN ('hr', 'management'));

CREATE POLICY "hrm_insert_payslips"
  ON public.payslips FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('hr', 'management'));

CREATE POLICY "hrm_delete_payslips"
  ON public.payslips FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('hr', 'management'));


-- ════════════════════════════════════════════════════════════
-- 8. STORAGE BUCKETS — restrict to authenticated users
-- Run each line separately if needed
-- ════════════════════════════════════════════════════════════

-- receipts bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false)
  ON CONFLICT (id) DO UPDATE SET public = false;

-- policy-attachments bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('policy-attachments', 'policy-attachments', false)
  ON CONFLICT (id) DO UPDATE SET public = false;

-- payslips bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('payslips', 'payslips', false)
  ON CONFLICT (id) DO UPDATE SET public = false;

-- announcements bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('announcements', 'announcements', false)
  ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage policies: only authenticated users can read; service role handles uploads
CREATE POLICY "auth_read_receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts');

CREATE POLICY "auth_read_policy_attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'policy-attachments');

CREATE POLICY "auth_read_payslips"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payslips');

CREATE POLICY "auth_read_announcements"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'announcements');
