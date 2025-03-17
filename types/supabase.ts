export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string
          title: string
          author: string
          cover_url: string | null
          type: string
          status: string
          source: string
          rating: number
          ideas_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          author: string
          cover_url?: string | null
          type?: string
          status?: string
          source?: string
          rating?: number
          ideas_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          author?: string
          cover_url?: string | null
          type?: string
          status?: string
          source?: string
          rating?: number
          ideas_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      book_notes: {
        Row: {
          id: string
          book_id: string
          content: string
          type: string
          created_at: string
          shared_at: string | null
          likes_count: number
          comments_count: number
        }
        Insert: {
          id?: string
          book_id: string
          content: string
          type?: string
          created_at?: string
          shared_at?: string | null
          likes_count?: number
          comments_count?: number
        }
        Update: {
          id?: string
          book_id?: string
          content?: string
          type?: string
          created_at?: string
          shared_at?: string | null
          likes_count?: number
          comments_count?: number
        }
      }
      comments: {
        Row: {
          id: string
          note_id: string
          content: string
          user_name: string
          created_at: string
        }
        Insert: {
          id?: string
          note_id: string
          content: string
          user_name: string
          created_at?: string
        }
        Update: {
          id?: string
          note_id?: string
          content?: string
          user_name?: string
          created_at?: string
        }
      }
      likes: {
        Row: {
          id: string
          note_id: string
          created_at: string
        }
        Insert: {
          id?: string
          note_id: string
          created_at?: string
        }
        Update: {
          id?: string
          note_id?: string
          created_at?: string
        }
      }
      reading_sessions: {
        Row: {
          id: string
          book_id: string
          duration: number
          pages_read: number
          created_at: string
        }
        Insert: {
          id?: string
          book_id: string
          duration?: number
          pages_read?: number
          created_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          duration?: number
          pages_read?: number
          created_at?: string
        }
      }
    }
  }
}