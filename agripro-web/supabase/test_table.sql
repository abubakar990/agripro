-- Test table creation
CREATE TABLE IF NOT EXISTS test_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE test_table ENABLE ROW LEVEL SECURITY;

-- Optional: Allow public read access (change as needed)
CREATE POLICY "Public read access for test_table"
  ON test_table FOR SELECT
  USING (true);

-- Optional: Allow authenticated users to insert
CREATE POLICY "Authenticated insert for test_table"
  ON test_table FOR INSERT
  TO authenticated
  WITH CHECK (true);
