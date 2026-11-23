-- ============================================================================
-- FindIt — Phase 2 Supabase Database Schema & Row Level Security (RLS)
-- Not required for Phase 1 Local Demo Edition.
-- Run this in Supabase SQL Editor when upgrading from LOCAL to SUPABASE mode.
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. User Profiles (linked to Supabase Auth users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  city text default '',
  created_at timestamptz not null default now()
);

-- 2. Lost & Found Reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('lost', 'found')),
  title text not null,
  category text not null,
  description text not null,
  location text not null,
  event_date date not null,
  contact_info text not null,
  verification_hint text default '',
  status text not null default 'open' check (status in ('open', 'claimed', 'recovered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Report Photographs (stored in Supabase Storage bucket: item-photos)
create table if not exists public.report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now()
);

-- 4. Ownership / Match Claims
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  claimant_id uuid not null references public.profiles(id) on delete cascade,
  claimant_contact text not null,
  message text not null,
  proof_details text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Saved / Bookmarked Listings
create table if not exists public.saved_listings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, report_id)
);

-- 6. Status History Timeline
create table if not exists public.status_updates (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  status text not null check (status in ('open', 'claimed', 'recovered')),
  note text not null,
  created_at timestamptz not null default now()
);

-- Helpful Indexes
create index if not exists idx_reports_type_status on public.reports (type, status);
create index if not exists idx_reports_created_at on public.reports (created_at desc);
create index if not exists idx_claims_report_id on public.claims (report_id);
create index if not exists idx_status_updates_report_id on public.status_updates (report_id);

-- ============================================================================
-- Enable Row Level Security (RLS)
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.report_photos enable row level security;
alter table public.claims enable row level security;
alter table public.saved_listings enable row level security;
alter table public.status_updates enable row level security;

-- Profiles: public read of basic name/city, users update only their own row
create policy "Profiles readable by all" on public.profiles
  for select using (true);
create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Reports: anyone can browse, authenticated users create, owners edit/delete
create policy "Reports are publicly readable" on public.reports
  for select using (true);
create policy "Authenticated users can create reports" on public.reports
  for insert with check (auth.uid() = user_id);
create policy "Owners can update their reports" on public.reports
  for update using (auth.uid() = user_id);
create policy "Owners can delete their reports" on public.reports
  for delete using (auth.uid() = user_id);

-- Photos: publicly readable, only report owner can insert/delete
create policy "Photos are publicly readable" on public.report_photos
  for select using (true);
create policy "Report owners manage photos" on public.report_photos
  for all using (
    exists (
      select 1 from public.reports r
      where r.id = report_id and r.user_id = auth.uid()
    )
  );

-- Claims: visible only to the claimant and the report owner
create policy "Claimant or owner can view claims" on public.claims
  for select using (
    auth.uid() = claimant_id or
    exists (
      select 1 from public.reports r
      where r.id = report_id and r.user_id = auth.uid()
    )
  );
create policy "Authenticated users can submit claims" on public.claims
  for insert with check (auth.uid() = claimant_id);
create policy "Report owner can approve or reject claims" on public.claims
  for update using (
    exists (
      select 1 from public.reports r
      where r.id = report_id and r.user_id = auth.uid()
    )
  );

-- Saved Listings: private to each user
create policy "Users manage own saved listings" on public.saved_listings
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Status Updates: publicly readable, authenticated users append
create policy "Status updates readable by all" on public.status_updates
  for select using (true);
create policy "Authenticated users can log status updates" on public.status_updates
  for insert with check (auth.uid() = actor_id);
