import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { ChevronLeft, Search, ChevronDown, Trash2, Share2 } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Animated, { 
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
  Layout
} from 'react-native-reanimated';

type Book = Database['public']['Tables']['books']['Row'];
type BookNote = Database['public']['Tables']['book_notes']['Row'];

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function BookDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [activeSwipeable, setActiveSwipeable] = useState<Swipeable | null>(null);
  const [sharingNote, setSharingNote] = useState<string | null>(null);

  const [book, setBook] = useState<Book | null>(null);
  const [notes, setNotes] = useState<BookNote[]>([]);
  const [newNote, setNewNote] = useState('');

  const statusOptions = ['To Read', 'In Progress', 'Completed', 'On Hold'];

  useEffect(() => {
    fetchBookData();
  }, [id]);

  const fetchBookData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();

      if (bookError) throw bookError;

      const { data: notesData, error: notesError } = await supabase
        .from('book_notes')
        .select('*')
        .eq('book_id', id)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      setBook(bookData);
      setNotes(notesData);
    } catch (err) {
      console.error('Error fetching book data:', err);
      setError('Failed to load book details');
    } finally {
      setIsLoading(false);
    }
  };

  const updateRating = async (newRating: number | null) => {
    if (!book) return;

    try {
      // If clicking the current rating, reset to 0
      const finalRating = book.rating === newRating ? 0 : newRating ?? 0;

      const { error } = await supabase
        .from('books')
        .update({ rating: finalRating })
        .eq('id', id);

      if (error) throw error;

      setBook(prev => prev ? { ...prev, rating: finalRating } : null);
    } catch (err) {
      console.error('Error updating rating:', err);
      setError('Failed to update rating');
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!book) return;

    try {
      const { error } = await supabase
        .from('books')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setBook(prev => prev ? { ...prev, status: newStatus } : null);
      setShowStatusDropdown(false);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !book) return;

    try {
      const { data: noteData, error } = await supabase
        .from('book_notes')
        .insert({
          book_id: book.id,
          content: newNote.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setNotes([noteData, ...notes]);
      setNewNote('');
      setShowAddNote(false);

      const { error: updateError } = await supabase
        .from('books')
        .update({ ideas_count: (book.ideas_count || 0) + 1 })
        .eq('id', book.id);

      if (updateError) throw updateError;

      setBook(prev => prev ? { ...prev, ideas_count: (prev.ideas_count || 0) + 1 } : null);
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Failed to add note');
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('book_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
      
      if (book) {
        setBook(prev => prev ? { 
          ...prev, 
          ideas_count: Math.max(0, (prev.ideas_count || 1) - 1)
        } : null);
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note');
    }
  };

  const shareNote = async (noteId: string, content: string) => {
    try {
      setSharingNote(noteId);
      
      if (!book) return;

      router.push({
        pathname: '/new-post',
        params: {
          noteId,
          content,
          bookTitle: book.title,
          bookAuthor: book.author
        }
      });
    } catch (err) {
      console.error('Error navigating to share screen:', err);
      setError('Failed to open share screen');
    } finally {
      setSharingNote(null);
    }
  };

  const closeActiveSwipeable = useCallback(() => {
    if (activeSwipeable) {
      activeSwipeable.close();
      setActiveSwipeable(null);
    }
  }, [activeSwipeable]);

  const renderRightActions = (noteId: string, content: string) => {
    return (
      <View style={styles.actionButtons}>
        <AnimatedTouchableOpacity
          entering={SlideInRight}
          exiting={SlideOutRight}
          onPress={() => shareNote(noteId, content)}
          style={[styles.actionButton, styles.shareButton]}
          disabled={sharingNote === noteId}
        >
          {sharingNote === noteId ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Share2 size={24} color="#ffffff" />
          )}
        </AnimatedTouchableOpacity>
        <AnimatedTouchableOpacity
          entering={SlideInRight}
          exiting={SlideOutRight}
          onPress={() => deleteNote(noteId)}
          style={[styles.actionButton, styles.deleteButton]}
        >
          <Trash2 size={24} color="#ffffff" />
        </AnimatedTouchableOpacity>
      </View>
    );
  };

  const groupNotesByDate = () => {
    const groups: { [key: string]: BookNote[] } = {};
    const now = new Date();

    const filteredNotes = notes.filter(note => 
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filteredNotes.forEach(note => {
      const noteDate = new Date(note.created_at);
      const diffTime = Math.abs(now.getTime() - noteDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (noteDate.toDateString() === now.toDateString()) {
        if (!groups['Today']) groups['Today'] = [];
        groups['Today'].push(note);
      } else if (diffDays === 1) {
        if (!groups['Yesterday']) groups['Yesterday'] = [];
        groups['Yesterday'].push(note);
      } else if (diffDays <= 7) {
        if (!groups['Previous 7 days']) groups['Previous 7 days'] = [];
        groups['Previous 7 days'].push(note);
      } else if (noteDate.getMonth() === now.getMonth() && noteDate.getFullYear() === now.getFullYear()) {
        if (!groups['This Month']) groups['This Month'] = [];
        groups['This Month'].push(note);
      } else {
        const monthYear = noteDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!groups[monthYear]) groups[monthYear] = [];
        groups[monthYear].push(note);
      }
    });

    return groups;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !book) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Book not found'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <ChevronLeft size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          onScroll={closeActiveSwipeable}
          scrollEventThrottle={16}
        >
          <View style={styles.bookInfo}>
            <Text style={styles.title}>{book.title}</Text>
            <Text style={styles.author}>by {book.author}</Text>

            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Rating:</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => updateRating(star)}
                  >
                    <Text style={[styles.star, { color: star <= (book.rating || 0) ? '#FFC107' : '#E5E7EB' }]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {book.rating > 0 && (
                <Text style={styles.resetText}>
                  {/* (tap current rating to reset) */}
                </Text>
              )}
            </View>

            <View style={styles.statusSection}>
              <Text style={styles.statusLabel}>Status:</Text>
              <TouchableOpacity
                style={styles.statusButton}
                onPress={() => setShowStatusDropdown(!showStatusDropdown)}
              >
                <Text style={styles.statusValue}>{book.status}</Text>
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>
              {showStatusDropdown && (
                <View style={styles.statusDropdown}>
                  {statusOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.statusOption}
                      onPress={() => updateStatus(option)}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        book.status === option && styles.statusOptionSelected
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.notesSection}>
            <View style={styles.notesHeader}>
              <TouchableOpacity 
                style={styles.addNoteButton}
                onPress={() => setShowAddNote(true)}
              >
                <Text style={styles.addNoteButtonText}>Add Note</Text>
              </TouchableOpacity>

              <View style={styles.searchContainer}>
                <Search size={20} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            {showAddNote && (
              <Animated.View 
                entering={FadeIn}
                exiting={FadeOut}
                style={styles.addNoteContainer}
              >
                <TextInput
                  style={styles.noteInput}
                  value={newNote}
                  onChangeText={setNewNote}
                  placeholder="Add a new note..."
                  multiline
                />
                <View style={styles.addNoteActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowAddNote(false);
                      setNewNote('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, !newNote.trim() && styles.saveButtonDisabled]}
                    onPress={addNote}
                    disabled={!newNote.trim()}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {Object.entries(groupNotesByDate()).map(([date, dateNotes]) => (
              dateNotes.length > 0 && (
                <Animated.View 
                  key={date} 
                  style={styles.dateGroup}
                  layout={Layout}
                >
                  <Text style={styles.dateHeader}>{date}</Text>
                  {dateNotes.map((note) => (
                    <Swipeable
                      key={note.id}
                      renderRightActions={() => renderRightActions(note.id, note.content)}
                      onSwipeableOpen={(direction) => {
                        if (activeSwipeable && activeSwipeable !== note.id) {
                          closeActiveSwipeable();
                        }
                        setActiveSwipeable(direction === 'right' ? null : activeSwipeable);
                      }}
                      overshootRight={false}
                    >
                      <Animated.View 
                        style={styles.noteCard}
                        layout={Layout}
                      >
                        <Text style={styles.noteText}>{note.content}</Text>
                        <View style={styles.noteFooter}>
                          <Text style={styles.noteDate}>
                            {new Date(note.created_at).toLocaleString('default', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      </Animated.View>
                    </Swipeable>
                  ))}
                </Animated.View>
              )
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  bookInfo: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  author: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 24,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginRight: 12,
  },
  stars: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 24,
    marginRight: 4,
  },
  resetText: {
    marginLeft: 8,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    fontStyle: 'italic',
  },
  statusSection: {
    position: 'relative',
  },
  statusLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusValue: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  statusDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statusOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  statusOptionSelected: {
    color: '#10B981',
    fontFamily: 'Inter-Medium',
  },
  notesSection: {
    padding: 20,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  addNoteButton: {
    backgroundColor: '#86EFAC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addNoteButtonText: {
    color: '#065F46',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  addNoteContainer: {
    marginBottom: 20,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  addNoteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  saveButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 12,
  },
  noteCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  noteText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 24,
    marginBottom: 8,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  shareButton: {
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
});