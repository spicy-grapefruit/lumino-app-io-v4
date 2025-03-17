import { Tabs } from 'expo-router';
import { Library, BookOpen, Lightbulb, Users } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: 'rgba(0, 0, 0, 0.1)',
        },
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#6B7280',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Your Library',
          tabBarIcon: ({ color, size }) => <Library size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => <Lightbulb size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add-book"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="book/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="book-preview"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="new-post"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="comments/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}