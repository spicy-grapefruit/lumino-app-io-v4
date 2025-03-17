import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { ChevronLeft, ExternalLink } from 'lucide-react-native';
import { GoogleBook, getBookCoverUrl, getBookAuthor, getBookPurchaseOptions, BookPurchaseOption } from '@/lib/googleBooks';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';

export default function BookPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'Overview' | 'Get Book'>('Overview');
  const [error, setError] = useState<string | null>(null);

  // Safely parse the book data and source
  const { selectedBook, source } = useMemo(() => {
    try {
      if (!params.book || typeof params.book !== 'string') {
        return { selectedBook: null, source: null };
      }
      return {
        selectedBook: JSON.parse(params.book) as GoogleBook,
        source: params.source as string
      };
    } catch (err) {
      console.error('Error parsing book data:', err);
      setError('Invalid book data');
      return { selectedBook: null, source: null };
    }
  }, [params.book, params.source]);

  // Use useMemo instead of useState + useEffect for purchase options
  const purchaseOptions = useMemo(() => {
    if (selectedBook && activeTab === 'Get Book') {
      return getBookPurchaseOptions(selectedBook);
    }
    return [];
  }, [selectedBook?.id, activeTab]);

  const handleBack = () => {
    if (source === 'search') {
      // Go back to search results with state restoration
      router.push({
        pathname: '/(tabs)/add-book',
        params: { restoreState: 'true' }
      });
    } else {
      // Regular back navigation
      router.back();
    }
  };

  const handlePurchase = async (option: BookPurchaseOption) => {
    try {
      await WebBrowser.openBrowserAsync(option.url);
    } catch (err) {
      console.error('Error opening browser:', err);
      setError('Failed to open purchase link');
    }
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

  if (!selectedBook) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Book details not found'}</Text>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleBack}
          style={styles.headerButton}
        >
          <ChevronLeft size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.bookDetailHeader}>
          <View style={styles.bookHeaderContent}>
            <Image
              source={{ uri: getBookCoverUrl(selectedBook) }}
              style={styles.coverImage}
              resizeMode="cover"
            />
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle}>
                {selectedBook.volumeInfo.title}
              </Text>
              <Text style={styles.bookAuthor}>
                by {getBookAuthor(selectedBook)}
              </Text>
              <View style={styles.rating}>
                {renderStars(selectedBook.volumeInfo.averageRating || 0)}
                {selectedBook.volumeInfo.ratingsCount && (
                  <Text style={styles.ratingCount}>
                    ({selectedBook.volumeInfo.ratingsCount})
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Overview' && styles.activeTab]}
            onPress={() => setActiveTab('Overview')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'Overview' && styles.activeTabText
            ]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Get Book' && styles.activeTab]}
            onPress={() => setActiveTab('Get Book')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'Get Book' && styles.activeTabText
            ]}>Get Book</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContent}>
          {activeTab === 'Overview' && (
            <Text style={styles.bookDescription}>
              {selectedBook.volumeInfo.description || 'No description available.'}
            </Text>
          )}
          {activeTab === 'Get Book' && (
            <View style={styles.purchaseOptionsContainer}>
              {purchaseOptions.map((option) => (
                <View key={option.retailer} style={styles.purchaseOption}>
                  <View style={styles.purchaseOptionInfo}>
                    <Text style={styles.retailerName}>{option.retailer}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.purchaseButton,
                      option.type === 'borrow' && styles.borrowButton
                    ]}
                    onPress={() => handlePurchase(option)}
                  >
                    <Text style={[
                      styles.purchaseButtonText,
                      option.type === 'borrow' && styles.borrowButtonText
                    ]}>
                      {option.type === 'buy' ? 'Buy' : 'Borrow'}
                    </Text>
                    <ExternalLink 
                      size={16} 
                      color={option.type === 'buy' ? '#ffffff' : '#065F46'} 
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  bookDetailHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  bookHeaderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  coverImage: {
    width: 120,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  bookAuthor: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 12,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#10B981',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#10B981',
  },
  tabContent: {
    padding: 20,
  },
  bookDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 24,
  },
  purchaseOptionsContainer: {
    gap: 16,
  },
  purchaseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  purchaseOptionInfo: {
    flex: 1,
  },
  retailerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  borrowButton: {
    backgroundColor: '#D1FAE5',
  },
  purchaseButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  borrowButtonText: {
    color: '#065F46',
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
});