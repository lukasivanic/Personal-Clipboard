-- Create clipboard_items table
CREATE TABLE IF NOT EXISTS clipboard_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  title TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  is_favorite BOOLEAN DEFAULT FALSE,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_clipboard_items_timestamp ON clipboard_items(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_clipboard_items_user_id ON clipboard_items(user_id);
CREATE INDEX IF NOT EXISTS idx_clipboard_items_is_favorite ON clipboard_items(is_favorite);

-- Enable Row Level Security (RLS)
ALTER TABLE clipboard_items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this later with auth)
CREATE POLICY "Allow all operations on clipboard_items" ON clipboard_items
  FOR ALL USING (true);

-- Insert a test record to verify the setup
INSERT INTO clipboard_items (content, title, user_id, is_favorite) 
VALUES ('Welcome to your personal clipboard!', 'Welcome Message', 'DEMO123', false)
ON CONFLICT DO NOTHING;
