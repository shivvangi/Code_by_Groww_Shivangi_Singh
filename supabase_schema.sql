-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create a table to track user sessions and their last viewed timestamp
create table if not exists public.user_sessions (
    id uuid default uuid_generate_v4() primary key,
    user_id text not null unique, -- We'll use a simple guest ID or auth.uid() later
    last_viewed_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a table for watchlists
create table if not exists public.watchlists (
    id uuid default uuid_generate_v4() primary key,
    user_id text not null references public.user_sessions(user_id) on delete cascade,
    ticker varchar(20) not null,
    added_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, ticker)
);

-- Enable RLS
alter table public.user_sessions enable row level security;
alter table public.watchlists enable row level security;

-- Create policies (For this prototype, we'll allow anon access if they provide their user_id)
-- Note: In a production app, you would use auth.uid() instead of trusting the user_id column directly.
create policy "Users can view their own session"
    on public.user_sessions for select
    using (true); -- Allow select to check if exists

create policy "Users can insert their own session"
    on public.user_sessions for insert
    with check (true);

create policy "Users can update their own session"
    on public.user_sessions for update
    using (true);

create policy "Users can view their own watchlist"
    on public.watchlists for select
    using (true);

create policy "Users can add to their watchlist"
    on public.watchlists for insert
    with check (true);

create policy "Users can delete from their watchlist"
    on public.watchlists for delete
    using (true);
