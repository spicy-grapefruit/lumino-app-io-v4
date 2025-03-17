/*
  # Add Comments Support - Safe Migration

  1. Changes
    - Add comments_count to book_notes if not exists
    - Create comments table if not exists
    - Safely create trigger function and triggers
    - Add proper checks to prevent duplicate objects
    
  2. Implementation Details
    - Use IF NOT EXISTS clauses
    - Drop existing triggers before recreating
    - Safe handling of existing objects
*/

-- Add comments_count to book_notes if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'book_notes' AND column_name = 'comments_count'
  ) THEN
    ALTER TABLE book_notes 
    ADD COLUMN comments_count integer DEFAULT 0;
  END IF;
END $$;

-- Create comments table if not exists
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES book_notes(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  user_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_comments_note_id ON comments(note_id);

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_comments_count_on_insert ON comments;
DROP TRIGGER IF EXISTS update_comments_count_on_delete ON comments;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE book_notes
    SET comments_count = comments_count + 1
    WHERE id = NEW.note_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE book_notes
    SET comments_count = comments_count - 1
    WHERE id = OLD.note_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_comments_count_on_insert
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comments_count();

CREATE TRIGGER update_comments_count_on_delete
AFTER DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comments_count();