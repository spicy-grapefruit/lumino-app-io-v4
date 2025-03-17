/*
  # Prevent duplicate books

  1. Changes
    - Add function to normalize text for comparison
    - Add unique constraint on normalized title and author
    - Add trigger to prevent duplicates
    - Clean up existing duplicates

  2. Implementation Details
    - Case-insensitive comparison
    - Whitespace normalization
    - Preserve most complete entries when removing duplicates
    - Trigger-based prevention of future duplicates

  3. Security
    - Function executes with invoker security
    - Safe handling of text normalization
*/

-- Create a function to normalize text for comparison
CREATE OR REPLACE FUNCTION normalize_text(input text)
RETURNS text AS $$
BEGIN
  -- Convert to lowercase and trim whitespace
  RETURN lower(trim(input));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add unique constraint using normalized values
ALTER TABLE books
ADD CONSTRAINT books_title_author_unique 
UNIQUE (normalize_text(title), normalize_text(author));

-- Create trigger function to handle duplicates
CREATE OR REPLACE FUNCTION check_book_duplicate()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if book already exists
  IF EXISTS (
    SELECT 1 FROM books
    WHERE normalize_text(title) = normalize_text(NEW.title)
    AND normalize_text(author) = normalize_text(NEW.author)
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Book already exists: % by %', NEW.title, NEW.author;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check for duplicates before insert or update
CREATE TRIGGER check_book_duplicate_trigger
BEFORE INSERT OR UPDATE ON books
FOR EACH ROW
EXECUTE FUNCTION check_book_duplicate();

-- Remove existing duplicates keeping the most complete entries
WITH ranked_books AS (
  SELECT 
    id,
    title,
    author,
    normalize_text(title) as norm_title,
    normalize_text(author) as norm_author,
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