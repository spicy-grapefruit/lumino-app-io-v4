import axios from 'axios';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    imageLinks?: {
      thumbnail: string;
      smallThumbnail: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    averageRating?: number;
    ratingsCount?: number;
  };
}

export interface SearchBooksResponse {
  items: GoogleBook[];
  totalItems: number;
}

export interface BookPurchaseOption {
  retailer: string;
  url: string;
  type: 'buy' | 'borrow';
}

export async function searchBooks(query: string): Promise<GoogleBook[]> {
  try {
    const response = await axios.get<SearchBooksResponse>(BASE_URL, {
      params: {
        q: query,
        key: API_KEY,
        maxResults: 20,
        fields: 'items(id,volumeInfo(title,authors,publishedDate,description,imageLinks,industryIdentifiers,averageRating,ratingsCount))'
      }
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Error searching books:', error);
    throw new Error('Failed to search books');
  }
}

export function getBookPurchaseOptions(book: GoogleBook): BookPurchaseOption[] {
  const isbn = book.volumeInfo.industryIdentifiers?.find(
    id => id.type === 'ISBN_13' || id.type === 'ISBN_10'
  )?.identifier;

  const options: BookPurchaseOption[] = [];

  // Amazon
  if (isbn) {
    options.push({
      retailer: 'Amazon.com',
      url: `https://www.amazon.com/dp/${isbn}`,
      type: 'buy'
    });
  }

  // Barnes & Noble
  if (isbn) {
    options.push({
      retailer: 'Barnes & Noble',
      url: `https://www.barnesandnoble.com/${isbn}`,
      type: 'buy'
    });
  }

  // Libby
  options.push({
    retailer: 'Libby',
    url: 'https://libbyapp.com',
    type: 'borrow'
  });

  return options;
}

export function getBookCoverUrl(book: GoogleBook): string {
  const fallbackUrl = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400';
  return book.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || fallbackUrl;
}

export function getBookAuthor(book: GoogleBook): string {
  return book.volumeInfo.authors?.[0] || 'Unknown Author';
}