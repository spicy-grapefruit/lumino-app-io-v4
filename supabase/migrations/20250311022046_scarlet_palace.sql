/*
  # Fix ideas count synchronization

  1. Changes
    - Updates the ideas_count for all books to match the actual count of notes
    - Uses a DO block to safely update each book's count
    - Preserves existing data while fixing the count discrepancy

  2. Implementation Details
    - Counts all notes per book from book_notes table
    - Updates books table with correct counts
    - Safe operation that won't affect existing notes or trigger functions
*/

DO $$
BEGIN
  -- Update ideas_count for all books based on actual note count
  UPDATE books
  SET ideas_count = subquery.note_count
  FROM (
    SELECT book_id, COUNT(*) as note_count
    FROM book_notes
    GROUP BY book_id
  ) as subquery
  WHERE books.id = subquery.book_id;

  -- Set ideas_count to 0 for books with no notes
  UPDATE books
  SET ideas_count = 0
  WHERE id NOT IN (
    SELECT DISTINCT book_id
    FROM book_notes
  );
END $$;