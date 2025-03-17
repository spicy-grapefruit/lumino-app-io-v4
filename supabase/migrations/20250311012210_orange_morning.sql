/*
  # Remove user authentication and user_id columns

  1. Changes
    - Remove user_id column from all tables (books, book_notes, reading_sessions)
    - Remove RLS policies since we won't need user-based restrictions
    - Disable RLS on all tables
    - Update foreign key constraints

  2. Security
    - Disable RLS on all tables since we're removing user-based access control
*/

-- Disable RLS and drop policies for books table
ALTER TABLE books DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create their own books" ON books;
DROP POLICY IF EXISTS "Users can delete their own books" ON books;
DROP POLICY IF EXISTS "Users can update their own books" ON books;
DROP POLICY IF EXISTS "Users can view their own books" ON books;

-- Disable RLS and drop policies for book_notes table
ALTER TABLE book_notes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create their own notes" ON book_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON book_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON book_notes;
DROP POLICY IF EXISTS "Users can view their own notes" ON book_notes;

-- Disable RLS and drop policies for reading_sessions table
ALTER TABLE reading_sessions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create their own reading sessions" ON reading_sessions;
DROP POLICY IF EXISTS "Users can delete their own reading sessions" ON reading_sessions;
DROP POLICY IF EXISTS "Users can update their own reading sessions" ON reading_sessions;
DROP POLICY IF EXISTS "Users can view their own reading sessions" ON reading_sessions;

-- Remove user_id columns and update foreign key constraints
DO $$ 
BEGIN
  -- Remove user_id from books
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE books DROP COLUMN user_id;
  END IF;

  -- Remove user_id from book_notes
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'book_notes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE book_notes DROP COLUMN user_id;
  END IF;

  -- Remove user_id from reading_sessions
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reading_sessions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE reading_sessions DROP COLUMN user_id;
  END IF;
END $$;