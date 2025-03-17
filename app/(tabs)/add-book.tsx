import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, Search, Plus, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { searchBooks, GoogleBook, getBookCoverUrl, getBookAuthor } from '@/lib/googleBooks';
import { debounce } from '@/utils/debounce';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

type FilterType = 'All' | 'Bookstore' | 'Audiobook';

export default function AddBookScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<GoogleBook[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [existingBooks, setExistingBooks] = useState<Set<string>>(new Set());
  const [addingBook, setAddingBook] = useState<string | null>(null);

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await searchBooks(query);
        setSearchResults(results);
        
        // Check which books already exist in the database
        const normalizedTitles = results.map(book => ({
          title: book.volumeInfo.title.toLowerCase().trim(),
          author: getBookAuthor(book).toLowerCase().trim()
        }));

        const { data: existingBooksData } = await supabase
          .from('books')
          .select('normalized_title, normalized_author');

        const existingSet = new Set(
          existingBooksData?.map(book => 
            `${book.normalized_title}::${book.normalized_author}`
          ) || []
        );

        setExistingBooks(existingSet);
      } catch (err) {
        setError('Failed to search books');
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const isBookExists = (book: GoogleBook) => {
    const normalizedTitle = book.volumeInfo.title.toLowerCase().trim();
    const normalizedAuthor = getBookAuthor(book).toLowerCase().trim();
    return existingBooks.has(`${normalizedTitle}::${normalizedAuthor}`);
  };

  const addBook = async (book: GoogleBook) => {
    if (isBookExists(book)) return;
    
    try {
      setAddingBook(book.id);
      
      const { error: insertError } = await supabase
        .from('books')
        .insert({
          title: book.volumeInfo.title,
          author: getBookAuthor(book),
          cover_url: getBookCoverUrl(book),
          status: 'To Read',
          rating: book.volumeInfo.averageRating || 0,
          source: 'Physical Book'
        });

      if (insertError) throw insertError;

      // Update local state to show book as existing
      const normalizedTitle = book.volumeInfo.title.toLowerCase().trim();
      const normalizedAuthor = getBookAuthor(book).toLowerCase().trim();
      setExistingBooks(prev => new Set([...prev, `${normalizedTitle}::${normalizedAuthor}`]));
    } catch (err) {
      console.error('Error adding book:', err);
      setError('Failed to add book');
    } finally {
      setAddingBook(null);
    }
  };

  const handleBookPress = (book: GoogleBook) => {
    const bookData = {
      id: book.id,
      volumeInfo: {
        title: book.volumeInfo.title,
        authors: book.volumeInfo.authors,
        description: book.volumeInfo.description,
        imageLinks: book.volumeInfo.imageLinks,
        industryIdentifiers: book.volumeInfo.industryIdentifiers,
        averageRating: book.volumeInfo.averageRating,
        ratingsCount: book.volumeInfo.ratingsCount
      }
    };
    
    router.push({
      pathname: '/book-preview',
      params: {
        book: JSON.stringify(bookData),
        source: 'search'
      }
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Text key={i} style={styles.star}>★</Text>);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<Text key={i} style={styles.star}>⭐</Text>);
      } else {
        stars.push(<Text key={i} style={styles.starEmpty}>☆</Text>);
      }
    }

    return stars;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Browse</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title, author, or ISBN..."
          value={searchQuery}
          onChangeText={handleSearch}
          autoFocus
        />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'All' && styles.filterButtonActive]}
          onPress={() => setActiveFilter('All')}
        >
          <Text style={[styles.filterText, activeFilter === 'All' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'Bookstore' && styles.filterButtonActive]}
          onPress={() => setActiveFilter('Bookstore')}
        >
          <Text style={[styles.filterText, activeFilter === 'Bookstore' && styles.filterTextActive]}>
            Bookstore
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'Audiobook' && styles.filterButtonActive]}
          onPress={() => setActiveFilter('Audiobook')}
        >
          <Text style={[styles.filterText, activeFilter === 'Audiobook' && styles.filterTextActive]}>
            Audiobook
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Searching books...</Text>
          </View>
        ) : searchQuery.length > 0 && searchResults.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No books found</Text>
          </View>
        ) : (
          searchResults.map((book) => {
            const exists = isBookExists(book);
            const isAdding = addingBook === book.id;

            return (
              <Animated.View
                key={book.id}
                style={styles.bookCard}
                entering={FadeIn}
                layout={Layout}
              >
                <TouchableOpacity
                  style={styles.bookCardContent}
                  onPress={() => handleBookPress(book)}
                >
                  <Image
                    source={{ uri: getBookCoverUrl(book) }}
                    style={styles.coverImage}
                    resizeMode="cover"
                  />
                  <View style={styles.bookInfo}>
                    <View style={styles.bookHeader}>
                      <View style={styles.bookTitleContainer}>
                        <Text style={styles.bookTitle}>{book.volumeInfo.title}</Text>
                        <Text style={styles.bookAuthor}>{getBookAuthor(book)}</Text>
                      </View>
                      {exists ? (
                        <Check size={24} color="#10B981" />
                      ) : (
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            addBook(book);
                          }}
                          disabled={isAdding}
                        >
                          {isAdding ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Plus size={24} color="#000000" />
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.bookDescription} numberOfLines={2}>
                      {book.volumeInfo.description || 'No description available'}
                    </Text>
                    <View style={styles.ratingContainer}>
                      <View style={styles.stars}>
                        {renderStars(book.volumeInfo.averageRating || 0)}
                      </View>
                      {book.volumeInfo.ratingsCount && (
                        <Text style={styles.ratingCount}>
                          ({book.volumeInfo.ratingsCount})
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#86EFAC',
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#065F46',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#DC2626',
  },
  bookCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bookCardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  coverImage: {
    width: 80,
    height: 120,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  bookDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 4,
  },
  star: {
    fontSize: 16,
    color: '#FFC107',
  },
  starEmpty: {
    fontSize: 16,
    color: '#E5E7EB',
  },
  ratingCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});