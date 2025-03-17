/*
  # Add Comments Support

  1. New Tables
    - `comments` table for storing post comments
      - `id` (uuid, primary key)
      - `note_id` (uuid, foreign key to book_notes)
      - `content` (text)
      - `user_name` (text)
      - `created_at` (timestamp)
      
  2. Changes
    - Add comments_count to book_notes table
    - Add trigger to maintain comments count
    
  3. Security
    - No RLS needed as this is a demo app
    - Foreign key constraints for data integrity
*/

-- Add comments_count to book_notes
ALTER TABLE book_notes 
ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0;

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES book_notes(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  user_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_comments_note_id ON comments(note_id);

-- Function to update comments count
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

-- Create triggers for comments count updates
CREATE TRIGGER update_comments_count_on_insert
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comments_count();

CREATE TRIGGER update_comments_count_on_delete
AFTER DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comments_count();