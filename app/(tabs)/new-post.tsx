import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type BookNote = Database['public']['Tables']['book_notes']['Row'] & {
  books: {
    title: string;
    author: string;
  };
};

export default function NewPostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState(params.content as string);

  const handlePost = async () => {
    if (!content.trim()) return;

    try {
      setIsPosting(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('book_notes')
        .update({
          content: content.trim(),
          shared_at: new Date().toISOString()
        })
        .eq('id', params.noteId);

      if (updateError) throw updateError;

      router.back();
    } catch (err) {
      console.error('Error sharing note:', err);
      setError('Failed to share note. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.closeButton}
        >
          <X size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>New Post</Text>
        <TouchableOpacity
          style={[
            styles.postButton,
            (!content.trim() || isPosting) && styles.postButtonDisabled
          ]}
          onPress={handlePost}
          disabled={!content.trim() || isPosting}
        >
          {isPosting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle}>{params.bookTitle}</Text>
          <Text style={styles.bookAuthor}>by {params.bookAuthor}</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TextInput
          style={styles.noteInput}
          value={content}
          onChangeText={setContent}
          placeholder="Share your thoughts..."
          multiline
          autoFocus
          textAlignVertical="top"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  postButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  postButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  postButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  bookInfo: {
    marginBottom: 24,
  },
  bookTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    fontStyle: 'italic',
  },
  bookAuthor: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  noteInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 24,
  },
});