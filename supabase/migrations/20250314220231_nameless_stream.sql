/*
  # Add Likes Support

  1. Changes
    - Add likes table for tracking post likes
    - Add likes_count column to book_notes table
    - Add trigger to maintain likes count
    
  2. Implementation Details
    - likes table with note_id reference
    - Automatic likes_count updates via trigger
    - Index for efficient querying
*/

-- Add likes_count to book_notes
ALTER TABLE book_notes 
ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0;

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES book_notes(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_likes_note_id ON likes(note_id);

-- Function to update likes count
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE book_notes
    SET likes_count = likes_count + 1
    WHERE id = NEW.note_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE book_notes
    SET likes_count = likes_count - 1
    WHERE id = OLD.note_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for likes count updates
CREATE TRIGGER update_likes_count_on_insert
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION update_likes_count();

CREATE TRIGGER update_likes_count_on_delete
AFTER DELETE ON likes
FOR EACH ROW
EXECUTE FUNCTION update_likes_count();