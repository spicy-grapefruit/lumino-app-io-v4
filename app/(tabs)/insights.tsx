import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, Blend, ChevronDown, ChevronUp, X } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInRight,
  SlideOutRight,
  Layout 
} from 'react-native-reanimated';

type BookNote = Database['public']['Tables']['book_notes']['Row'] & {
  books: {
    title: string;
    author: string;
  };
};

export default function InsightsScreen() {
  const [notes, setNotes] = useState<BookNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('book_notes')
        .select(`
          *,
          books (
            title,
            author
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setNotes(data as BookNote[]);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const filteredNotes = notes.filter(note => {
    const searchLower = searchQuery.toLowerCase();
    return (
      note.content.toLowerCase().includes(searchLower) ||
      note.books.title.toLowerCase().includes(searchLower) ||
      note.books.author.toLowerCase().includes(searchLower)
    );
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        {!showSearch && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowSearch(true)}
            >
              <Search size={20} color="#065F46" />
              <Text style={styles.actionButtonText}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Filter size={20} color="#065F46" />
              <Text style={styles.actionButtonText}>Filter</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Blend size={20} color="#065F46" />
              <Text style={styles.actionButtonText}>Blend</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {showSearch && (
        <Animated.View 
          entering={FadeIn}
          exiting={FadeOut}
          style={styles.searchBar}
        >
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search notes, books, or authors..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            onPress={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>Loading insights...</Text>
          </View>
        ) : error ? (
          <View style={styles.messageContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : !showSearch ? (
          <Animated.View layout={Layout}>
            {notes.map((note) => (
              <Animated.View
                key={note.id}
                style={styles.noteCard}
                entering={FadeIn}
                exiting={FadeOut}
                layout={Layout}
              >
                <View style={styles.noteHeader}>
                  <View>
                    <Text style={styles.bookTitle}>{note.books.title}</Text>
                    <Text style={styles.bookAuthor}>by {note.books.author}</Text>
                  </View>
                  <Text style={styles.noteDate}>{formatDate(note.created_at)}</Text>
                </View>

                <View style={styles.noteContent}>
                  <Text 
                    style={styles.noteText}
                    numberOfLines={expandedNotes.has(note.id) ? undefined : 3}
                  >
                    {note.content}
                  </Text>
                  {note.content.length > 150 && (
                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={() => toggleNoteExpansion(note.id)}
                    >
                      <Text style={styles.expandButtonText}>
                        {expandedNotes.has(note.id) ? 'See less' : 'See more'}
                      </Text>
                      {expandedNotes.has(note.id) ? (
                        <ChevronUp size={16} color="#10B981" />
                      ) : (
                        <ChevronDown size={16} color="#10B981" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {note.type && (
                  <View style={styles.tagContainer}>
                    <Text style={styles.tag}>{note.type}</Text>
                  </View>
                )}
              </Animated.View>
            ))}
          </Animated.View>
        ) : filteredNotes.length === 0 ? (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>
              No notes found matching your search
            </Text>
          </View>
        ) : (
          <Animated.View layout={Layout}>
            {filteredNotes.map((note) => (
              <Animated.View
                key={note.id}
                style={styles.noteCard}
                entering={FadeIn}
                exiting={FadeOut}
                layout={Layout}
              >
                <View style={styles.noteHeader}>
                  <View>
                    <Text style={styles.bookTitle}>{note.books.title}</Text>
                    <Text style={styles.bookAuthor}>by {note.books.author}</Text>
                  </View>
                  <Text style={styles.noteDate}>{formatDate(note.created_at)}</Text>
                </View>

                <View style={styles.noteContent}>
                  <Text 
                    style={styles.noteText}
                    numberOfLines={expandedNotes.has(note.id) ? undefined : 3}
                  >
                    {note.content}
                  </Text>
                  {note.content.length > 150 && (
                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={() => toggleNoteExpansion(note.id)}
                    >
                      <Text style={styles.expandButtonText}>
                        {expandedNotes.has(note.id) ? 'See less' : 'See more'}
                      </Text>
                      {expandedNotes.has(note.id) ? (
                        <ChevronUp size={16} color="#10B981" />
                      ) : (
                        <ChevronDown size={16} color="#10B981" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {note.type && (
                  <View style={styles.tagContainer}>
                    <Text style={styles.tag}>{note.type}</Text>
                  </View>
                )}
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#86EFAC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  actionButtonText: {
    color: '#065F46',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  clearButton: {
    padding: 4,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    fontStyle: 'italic',
  },
  bookAuthor: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  noteDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  noteContent: {
    marginBottom: 12,
  },
  noteText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 22,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  expandButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});