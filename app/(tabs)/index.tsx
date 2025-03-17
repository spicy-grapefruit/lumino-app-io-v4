import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Search, Lightbulb, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import Animated, { 
  FadeIn, 
  Layout, 
  SlideOutRight,
  useAnimatedStyle,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { 
  Swipeable,
  GestureHandlerRootView 
} from 'react-native-gesture-handler';

type Book = Database['public']['Tables']['books']['Row'];
type Status = 'Reading' | 'To Read' | 'Completed';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function LibraryScreen() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<Status>('Reading');
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);
  const [activeSwipeable, setActiveSwipeable] = useState<Swipeable | null>(null);

  useEffect(() => {
    fetchBooks();
  }, [selectedStatus]);

  const fetchBooks = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const status = selectedStatus === 'Reading' ? 'In Progress' : selectedStatus;
      const { data, error: fetchError } = await supabase
        .from('books')
        .select('*')
        .eq('status', status)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      setBooks(data || []);
    } catch (err) {
      console.error('Error fetching books:', err);
      setError('Failed to load books');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    Alert.alert(
      'Delete Book',
      'Are you sure you want to remove this book from your library?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingBookId(bookId);
              setError(null);

              const { error: deleteError } = await supabase
                .from('books')
                .delete()
                .eq('id', bookId);

              if (deleteError) throw deleteError;

              setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
            } catch (err) {
              console.error('Error deleting book:', err);
              setError('Failed to delete book');
            } finally {
              setDeletingBookId(null);
            }
          }
        }
      ]
    );
  };

  const closeActiveSwipeable = useCallback(() => {
    if (activeSwipeable) {
      activeSwipeable.close();
      setActiveSwipeable(null);
    }
  }, [activeSwipeable]);

  const renderRightActions = (bookId: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDeleteBook(bookId)}
        disabled={deletingBookId === bookId}
      >
        <Trash2 
          size={24} 
          color="#FFFFFF" 
          style={[
            styles.deleteIcon,
            deletingBookId === bookId && styles.deleteIconDisabled
          ]} 
        />
      </TouchableOpacity>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Library</Text>
          
          <View style={styles.filterRow}>
            <TouchableOpacity 
              onPress={() => router.push('/add-book')}
              style={styles.searchButton}
            >
              <Search size={20} color="#4B5563" />
            </TouchableOpacity>

            <View style={styles.statusTags}>
              <TouchableOpacity
                style={[
                  styles.statusTag,
                  selectedStatus === 'Reading' && styles.statusTagActive
                ]}
                onPress={() => setSelectedStatus('Reading')}
              >
                <Text style={[
                  styles.statusTagText,
                  selectedStatus === 'Reading' && styles.statusTagTextActive
                ]}>
                  Reading
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusTag,
                  selectedStatus === 'To Read' && styles.statusTagActive
                ]}
                onPress={() => setSelectedStatus('To Read')}
              >
                <Text style={[
                  styles.statusTagText,
                  selectedStatus === 'To Read' && styles.statusTagTextActive
                ]}>
                  To Read
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusTag,
                  selectedStatus === 'Completed' && styles.statusTagActive
                ]}
                onPress={() => setSelectedStatus('Completed')}
              >
                <Text style={[
                  styles.statusTagText,
                  selectedStatus === 'Completed' && styles.statusTagTextActive
                ]}>
                  Completed
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          onScroll={closeActiveSwipeable}
          scrollEventThrottle={16}
        >
          {isLoading ? (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>Loading books...</Text>
            </View>
          ) : error ? (
            <View style={styles.messageContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : books.length === 0 ? (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>No books in this section</Text>
            </View>
          ) : (
            <Animated.View layout={Layout}>
              {books.map((book) => (
                <Swipeable
                  key={book.id}
                  enabled={selectedStatus === 'To Read'}
                  renderRightActions={
                    selectedStatus === 'To Read' 
                      ? () => renderRightActions(book.id)
                      : undefined
                  }
                  onSwipeableOpen={(direction) => {
                    if (activeSwipeable && activeSwipeable !== book.id) {
                      closeActiveSwipeable();
                    }
                    setActiveSwipeable(direction === 'right' ? null : activeSwipeable);
                  }}
                  overshootRight={false}
                >
                  <AnimatedTouchableOpacity
                    style={styles.bookCard}
                    onPress={() => router.push(`/book/${book.id}`)}
                    exiting={SlideOutRight}
                  >
                    <Image
                      source={{ uri: book.cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400' }}
                      style={styles.coverImage}
                      resizeMode="cover"
                    />
                    <View style={styles.bookInfo}>
                      <View>
                        <Text style={styles.bookTitle}>{book.title}</Text>
                        <Text style={styles.bookAuthor}>{book.author}</Text>
                        <Text style={styles.bookSource}>{book.source}</Text>
                      </View>
                      
                      <View style={styles.bookStats}>
                        <View style={styles.statItem}>
                          <Lightbulb size={16} color="#6B7280" />
                          <Text style={styles.statText}>{book.ideas_count} Ideas</Text>
                        </View>
                        <View style={styles.ratingContainer}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Text
                              key={star}
                              style={[
                                styles.star,
                                { color: star <= (book.rating || 0) ? '#FFC107' : '#E5E7EB' }
                              ]}
                            >
                              ★
                            </Text>
                          ))}
                        </View>
                      </View>
                    </View>
                  </AnimatedTouchableOpacity>
                </Swipeable>
              ))}
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
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
    marginBottom: 20,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTags: {
    flexDirection: 'row',
    gap: 8,
  },
  statusTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  statusTagActive: {
    backgroundColor: '#86EFAC',
  },
  statusTagText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  statusTagTextActive: {
    color: '#065F46',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    padding: 20,
    alignItems: 'center',
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
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  coverImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  bookSource: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  bookStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 16,
    marginRight: 2,
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteIcon: {
    opacity: 1,
  },
  deleteIconDisabled: {
    opacity: 0.5,
  },
});