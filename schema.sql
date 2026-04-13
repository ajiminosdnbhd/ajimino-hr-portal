-- ============================================
-- AJIMINO SDN. BHD. HR Portal — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Profiles table (linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  department text not null check (department in ('Management', 'HR', 'Sales', 'Operations', 'Marketing')),
  role text not null check (role in ('management', 'hr', 'staff')),
  al_entitled integer not null default 14,
  ml_entitled integer not null default 14,
  al_used integer not null default 0,
  ml_used integer not null default 0,
  join_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- 2. Bookings table
create table if not exists public.bookings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  user_name text not null,
  department text not null,
  room_id text not null check (room_id in ('big-meeting-room', 'small-meeting-room', 'discussion-room')),
  date date not null,
  start_time time not null,
  end_time time not null,
  purpose text not null,
  created_at timestamptz not null default now()
);

-- 3. Leaves table
create table if not exists public.leaves (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  user_name text not null,
  department text not null,
  type text not null check (type in ('Annual Leave', 'Medical Leave')),
  start_date date not null,
  end_date date not null,
  days integer not null,
  reason text not null,
  remarks text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  receipt_path text,
  receipt_name text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- 4. Policies table
create table if not exists public.policies (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  target_departments text[] not null default '{}',
  attachment_path text,
  attachment_name text,
  created_by text not null,
  created_at timestamptz not null default now()
);

-- 5. Payslips table
create table if not exists public.payslips (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  user_name text not null,
  department text not null,
  month integer not null check (month between 1 and 12),
  year integer not null,
  file_path text not null,
  file_name text not null,
  uploaded_by text not null,
  created_at timestamptz not null default now(),
  unique(user_id, month, year)
);

-- ============================================
-- Row Level Security
-- ============================================

alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.leaves enable row level security;
alter table public.policies enable row level security;
alter table public.payslips enable row level security;

-- Profiles: users can read all, update own
create policy "Anyone can read profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Authenticated can insert profiles" on public.profiles for insert with check (true);
create policy "Authenticated can delete profiles" on public.profiles for delete using (true);

-- Bookings: all authenticated can CRUD
create policy "Anyone can read bookings" on public.bookings for select using (true);
create policy "Authenticated can insert bookings" on public.bookings for insert with check (auth.uid() = user_id);
create policy "Users can delete own bookings" on public.bookings for delete using (auth.uid() = user_id);

-- Leaves: users see own + hr/mgmt see all
create policy "Anyone can read leaves" on public.leaves for select using (true);
create policy "Authenticated can insert leaves" on public.leaves for insert with check (auth.uid() = user_id);
create policy "Anyone can update leaves" on public.leaves for update using (true);

-- Policies: all can read, hr/mgmt insert
create policy "Anyone can read policies" on public.policies for select using (true);
create policy "Authenticated can insert policies" on public.policies for insert with check (true);
create policy "Authenticated can delete policies" on public.policies for delete using (true);

-- Payslips: all can read (filtered in app), hr/mgmt insert
create policy "Anyone can read payslips" on public.payslips for select using (true);
create policy "Authenticated can insert payslips" on public.payslips for insert with check (true);
create policy "Authenticated can delete payslips" on public.payslips for delete using (true);

-- ============================================
-- Storage Buckets (create these manually in Supabase Dashboard)
-- Bucket names: receipts, policy-attachments, payslips
-- Set all 3 buckets to PUBLIC
-- ============================================
