/*
  # Prevent Duplicate Books

  1. Changes
    - Add normalized columns for title and author
    - Remove duplicates before adding constraints
    - Add unique constraint on normalized columns
    
  2. Implementation Details
    - Case-insensitive comparison using computed columns
    - Preserve original case in title and author columns
    - Remove duplicates keeping most complete entries
    - Safe handling of existing data
*/

-- Create a function to normalize text for comparison
CREATE OR REPLACE FUNCTION normalize_text(input text)
RETURNS text AS $$
BEGIN
  RETURN lower(trim(input));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- First, remove duplicates keeping the most complete entries
WITH ranked_books AS (
  SELECT 
    id,
    title,
    author,
    ideas_count,
    rating,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY normalize_text(title), normalize_text(author)
      ORDER BY 
        ideas_count DESC NULLS LAST,
        rating DESC NULLS LAST,
        created_at ASC
    ) as rn
  FROM books
)
DELETE FROM books
WHERE id IN (
  SELECT id 
  FROM ranked_books 
  WHERE rn > 1
);

-- Now that duplicates are removed, add the normalized columns
DO $$ 
BEGIN
  -- Add normalized_title if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' AND column_name = 'normalized_title'
  ) THEN
    ALTER TABLE books 
    ADD COLUMN normalized_title text GENERATED ALWAYS AS (normalize_text(title)) STORED;
  END IF;

  -- Add normalized_author if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' AND column_name = 'normalized_author'
  ) THEN
    ALTER TABLE books 
    ADD COLUMN normalized_author text GENERATED ALWAYS AS (normalize_text(author)) STORED;
  END IF;
END $$;

-- Finally, create the unique index
CREATE UNIQUE INDEX IF NOT EXISTS books_normalized_title_author_unique 
ON books (normalized_title, normalized_author);