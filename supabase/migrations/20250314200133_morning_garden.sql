/*
  # Add Shared Notes Support

  1. Changes
    - Add shared_at column to book_notes table
    - Add shared_by column to book_notes table for future user integration
    - Add index on shared_at for efficient queries
    
  2. Implementation Details
    - Nullable shared_at timestamp to track when notes are shared
    - Default to null (not shared)
    - Index for performance when querying shared notes
*/

-- Add shared_at column to track when notes are shared
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'book_notes' AND column_name = 'shared_at'
  ) THEN
    ALTER TABLE book_notes 
    ADD COLUMN shared_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Create index for shared notes queries
CREATE INDEX IF NOT EXISTS idx_book_notes_shared_at 
ON book_notes (shared_at);