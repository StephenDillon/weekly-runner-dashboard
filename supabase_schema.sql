-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- Strava Athlete ID
  first_name TEXT,
  last_name TEXT,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create races table
CREATE TABLE IF NOT EXISTS races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;

-- Create policies (simplified for now, assuming client-side auth handles user context or we trust the client for this MVP)
-- In a production app with Supabase Auth, we would use auth.uid()
-- Since we are using Strava Auth and just syncing, we might need to be careful with RLS.
-- For now, we will allow public access but in a real app we'd secure this better.
-- Ideally, we should generate a JWT for Supabase signed with the same secret, but that's complex.
-- Let's stick to a simple policy for now: allow all for anon (since we control the client).

CREATE POLICY "Allow public access to users" ON users FOR ALL USING (true);
CREATE POLICY "Allow public access to races" ON races FOR ALL USING (true);
