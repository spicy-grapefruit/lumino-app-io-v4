/*
  # Add trigger for automatic ideas count updates

  1. Changes
    - Add function to calculate and update ideas_count
    - Add triggers for book_notes table changes
    
  2. Details
    - Creates update_book_ideas_count() function that:
      - Counts notes for a specific book
      - Updates the book's ideas_count field
    - Adds triggers that run on:
      - INSERT into book_notes
      - DELETE from book_notes
    
  3. Security
    - Function executes with invoker security
    - Triggers have access to OLD and NEW record data
*/

-- Function to update the ideas count for a book
CREATE OR REPLACE FUNCTION update_book_ideas_count()
RETURNS TRIGGER AS $$
DECLARE
  book_id_to_update uuid;
BEGIN
  -- For INSERT, use NEW.book_id
  -- For DELETE, use OLD.book_id
  book_id_to_update := COALESCE(NEW.book_id, OLD.book_id);

  -- Update the ideas_count in the books table
  UPDATE books
  SET ideas_count = (
    SELECT COUNT(*)
    FROM book_notes
    WHERE book_id = book_id_to_update
  )
  WHERE id = book_id_to_update;

  -- Return NEW for INSERT/UPDATE, OLD for DELETE
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for INSERT operations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_ideas_count_on_insert'
  ) THEN
    CREATE TRIGGER update_ideas_count_on_insert
    AFTER INSERT ON book_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_book_ideas_count();
  END IF;
END $$;

-- Trigger for DELETE operations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_ideas_count_on_delete'
  ) THEN
    CREATE TRIGGER update_ideas_count_on_delete
    AFTER DELETE ON book_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_book_ideas_count();
  END IF;
END $$;